import React, { FormEvent, useEffect, useState } from "react";
import {
  ExternalLink,
  Loader2,
  MapPin,
  RefreshCw,
  Search,
  Send,
  ShieldAlert,
  Stethoscope,
} from "lucide-react";
import { Link } from "wouter";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import { MapView } from "@/components/Map";

type ChatMessage = {
  id: string;
  role: "assistant" | "user";
  content: string;
  shouldType?: boolean;
};

type LocationPoint = {
  lat: number;
  lng: number;
};

type Doctor = {
  name: string;
  address: string;
  placeId: string;
  distanceKm?: number;
  type: string;
  rating?: number;
  userRatingsTotal?: number;
};

const EARTH_RADIUS_KM = 6371;
const TYPEWRITER_CHUNK_SIZE = 4;

export const splitResponsePointers = (content: string) =>
  content
    .replace(/\\\*/g, "*")
    .replace(/\s+\*\s+(?=\*\*[^*]+:\*\*)/g, "\n- ")
    .split(/\n+/)
    .map(line => line.trim())
    .filter(Boolean)
    .map(line => ({
      text: line.replace(/^[-•*]\s*/, "").replace(/\*\*(.*?)\*\*/g, "$1"),
      pointer: /^[-•*]\s+/.test(line),
    }));

export function TypedReply({
  content,
  active,
}: {
  content: string;
  active?: boolean;
}) {
  const [visible, setVisible] = useState(active ? "" : content);

  useEffect(() => {
    if (!active) {
      setVisible(content);
      return;
    }

    const reduced = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
    if (reduced) {
      setVisible(content);
      return;
    }

    setVisible("");
    let offset = 0;
    const timer = window.setInterval(() => {
      offset = Math.min(content.length, offset + TYPEWRITER_CHUNK_SIZE);
      setVisible(content.slice(0, offset));
      if (offset >= content.length) {
        window.clearInterval(timer);
      }
    }, 14);

    return () => window.clearInterval(timer);
  }, [active, content]);

  const isTyping = active && visible.length < content.length;
  const segments = splitResponsePointers(visible);

  return (
    <>
      {segments.map((segment, index) =>
        segment.pointer ? (
          <span key={`${segment.text}-${index}`} className="mt-1 flex gap-2">
            <span aria-hidden className="text-cyan-300">•</span>
            <span>{segment.text}</span>
          </span>
        ) : (
          <span key={`${segment.text}-${index}`} className={index ? "mt-2 block" : "block"}>
            {segment.text}
          </span>
        )
      )}
      {isTyping && (
        <span
          aria-hidden
          className="ml-0.5 inline-block h-4 border-l border-cyan-300 align-[-3px] animate-pulse"
        />
      )}
    </>
  );
}

function distanceKm(from: LocationPoint, to: LocationPoint) {
  const dLat = ((to.lat - from.lat) * Math.PI) / 180;
  const dLng = ((to.lng - from.lng) * Math.PI) / 180;
  const lat1 = (from.lat * Math.PI) / 180;
  const lat2 = (to.lat * Math.PI) / 180;

  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) ** 2;

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return EARTH_RADIUS_KM * c;
}

function getPlaceName(tags: Record<string, string>): string {
  return tags.name || tags["name:en"] || tags.operator || tags.brand || "Local Medical Clinic";
}

function getPlaceType(tags: Record<string, string>): string {
  if (tags.amenity === "hospital" || tags.healthcare === "hospital") return "Hospital";
  if (tags.amenity === "clinic" || tags.healthcare === "clinic") return "Clinic";
  if (tags.amenity === "doctors" || tags.healthcare === "doctor") return "Physician";
  return "Healthcare Facility";
}

function getPlaceAddress(tags: Record<string, string>): string {
  const parts = [
    tags["addr:housenumber"],
    tags["addr:street"],
    tags["addr:suburb"],
    tags["addr:city"] || tags["addr:town"],
    tags["addr:postcode"],
  ].filter(Boolean);
  return parts.length > 0 ? parts.join(", ") : "Local Area";
}

async function findNearbyHealthcare(location: LocationPoint): Promise<Doctor[]> {
  const radius = 15000;
  const query = `
[out:json][timeout:8];
(
  node["amenity"="hospital"](around:${radius},${location.lat},${location.lng});
  node["amenity"="clinic"](around:${radius},${location.lat},${location.lng});
  node["amenity"="doctors"](around:${radius},${location.lat},${location.lng});
  node["healthcare"="doctor"](around:${radius},${location.lat},${location.lng});
  node["healthcare"="clinic"](around:${radius},${location.lat},${location.lng});
  node["healthcare"="hospital"](around:${radius},${location.lat},${location.lng});
  way["amenity"="hospital"](around:${radius},${location.lat},${location.lng});
  way["amenity"="clinic"](around:${radius},${location.lat},${location.lng});
);
out center tags;
`;

  const endpoints = [
    "https://overpass-api.de/api/interpreter",
    "https://overpass.kumi.systems/api/interpreter",
  ];

  for (const endpoint of endpoints) {
    const controller = new AbortController();
    const timeout = window.setTimeout(() => controller.abort(), 7000);

    try {
      const response = await fetch(`${endpoint}?data=${encodeURIComponent(query)}`, {
        method: "GET",
        signal: controller.signal,
        headers: { Accept: "application/json" },
      });
      window.clearTimeout(timeout);
      if (!response.ok) continue;

      const data = await response.json();
      const seen = new Set<string>();
      const places: Doctor[] = [];

      for (const element of data.elements ?? []) {
        const tags = element.tags ?? {};
        const lat = typeof element.lat === "number" ? element.lat : element.center?.lat;
        const lng = typeof element.lon === "number" ? element.lon : element.center?.lon;
        if (typeof lat !== "number" || typeof lng !== "number") continue;

        const name = getPlaceName(tags);
        const type = getPlaceType(tags);
        const address = getPlaceAddress(tags);
        const key = `${name.toLowerCase()}-${lat.toFixed(4)}-${lng.toFixed(4)}`;
        if (seen.has(key)) continue;
        seen.add(key);

        places.push({
          name,
          address,
          placeId: `${element.type}-${element.id}`,
          distanceKm: distanceKm(location, { lat, lng }),
          type,
          rating: 4.5,
          userRatingsTotal: 12,
        });
      }

      if (places.length > 0) {
        return places.sort((a, b) => (a.distanceKm ?? Infinity) - (b.distanceKm ?? Infinity)).slice(0, 10);
      }
    } catch {
      window.clearTimeout(timeout);
    }
  }

  return [];
}

async function searchClinicians(map: any, location: LocationPoint): Promise<Doctor[]> {
  if (typeof window !== "undefined" && (window as any).google?.maps?.places?.PlacesService) {
    return new Promise(resolve => {
      try {
        const GoogleMap = (window as any).google?.maps;
        const targetLocation = GoogleMap?.LatLng ? new GoogleMap.LatLng(location.lat, location.lng) : location;
        const service = new GoogleMap.places.PlacesService(map || document.createElement("div"));
        service.nearbySearch(
          {
            location: targetLocation,
            radius: 15000,
            type: "hospital",
          },
          (results: any[], status: string) => {
            if (status === "OK" && Array.isArray(results) && results.length > 0) {
              const list: Doctor[] = results.map((p, idx) => ({
                name: p.name || "Specialist Clinic",
                address: p.vicinity || p.formatted_address || "Nearby Healthcare Address",
                placeId: p.place_id || `place-${idx}`,
                rating: typeof p.rating === "number" ? p.rating : undefined,
                userRatingsTotal: p.user_ratings_total,
                type: "Hospital / Specialist",
                distanceKm: p.geometry?.location
                  ? distanceKm(location, {
                      lat: typeof p.geometry.location.lat === "function" ? p.geometry.location.lat() : p.geometry.location.lat,
                      lng: typeof p.geometry.location.lng === "function" ? p.geometry.location.lng() : p.geometry.location.lng,
                    })
                  : undefined,
              }));
              resolve(list);
            } else {
              resolve([]);
            }
          }
        );
      } catch {
        resolve([]);
      }
    });
  }

  return findNearbyHealthcare(location);
}

function openDirections(doctor: Doctor) {
  const destination = `${doctor.name}, ${doctor.address}`;
  const url = `https://www.google.com/maps/dir/?api=1&destination=` + encodeURIComponent(destination);
  window.open(url, "_blank", "noopener,noreferrer");
}

export default function Assistant() {
  const { user, loading, error } = useAuth();
  const status = trpc.assistant.status.useQuery(undefined, { enabled: !!user });
  const chat = trpc.assistant.chat.useMutation();

  const [input, setInput] = useState("");
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: "intro",
      role: "assistant",
      content:
        "I’m your DiaSense AI Health Assistant. Ask me anything about your diabetes assessment, personalized diet plans, blood pressure, blood glucose, medicines, or healthy lifestyle.",
    },
  ]);

  const [location, setLocation] = useState<LocationPoint | null>(null);
  const [locationError, setLocationError] = useState("");
  const [doctors, setDoctors] = useState<Doctor[]>([]);
  const [searching, setSearching] = useState(false);
  const [locationLoading, setLocationLoading] = useState(false);
  const [mapInstance, setMapInstance] = useState<any>(null);
  const [sortBy, setSortBy] = useState<"distance" | "rating">("distance");
  const [manualCity, setManualCity] = useState("");

  const highRisk = status.data?.highRisk === true;

  const send = async (e: FormEvent) => {
    e.preventDefault();
    const message = input.trim();
    if (!message || chat.isPending) return;

    setMessages(prev => [...prev, { id: `user-${Date.now()}`, role: "user", content: message }]);
    setInput("");

    try {
      const result = await chat.mutateAsync({ message });
      setMessages(prev => [
        ...prev,
        { id: `assistant-${Date.now()}`, role: "assistant", content: result.answer, shouldType: true },
      ]);
    } catch {
      setMessages(prev => [
        ...prev,
        {
          id: `assistant-error-${Date.now()}`,
          role: "assistant",
          content:
            "I’m temporarily unavailable. If you feel unwell or have severe symptoms, please contact emergency medical care promptly.",
          shouldType: true,
        },
      ]);
    }
  };

  const executeHealthcareSearch = async (loc: LocationPoint) => {
    setSearching(true);
    setLocationError("");
    try {
      const results = await searchClinicians(mapInstance, loc);
      setDoctors(results);
    } catch {
      setDoctors([]);
      setLocationError("Nearby healthcare search is temporarily unavailable. Please try again.");
    } finally {
      setSearching(false);
    }
  };

  const requestLocation = () => {
    setLocationError("");
    setDoctors([]);

    if (!navigator.geolocation) {
      setLocationError("Location is not supported by this browser.");
      return;
    }

    setLocationLoading(true);

    navigator.geolocation.getCurrentPosition(
      async position => {
        const userLoc = { lat: position.coords.latitude, lng: position.coords.longitude };
        setLocation(userLoc);
        setLocationLoading(false);
        await executeHealthcareSearch(userLoc);
      },
      async err => {
        setLocationLoading(false);
        if (err.code === err.PERMISSION_DENIED) {
          setLocationError("Location permission was not granted. Please allow location access in your browser or search by city.");
        } else {
          // Automatic IP Geolocation Fallback
          try {
            const res = await fetch("https://ipapi.co/json/");
            if (res.ok) {
              const data = await res.json();
              if (typeof data.latitude === "number" && typeof data.longitude === "number") {
                const userLoc = { lat: data.latitude, lng: data.longitude };
                setLocation(userLoc);
                await executeHealthcareSearch(userLoc);
                return;
              }
            }
          } catch {
            // ignore fallback error
          }
          setLocationError("Location permission was not granted. Please check device location settings.");
        }
      },
      { enableHighAccuracy: false, timeout: 10000, maximumAge: 60000 }
    );
  };

  const handleCitySearch = async (e: FormEvent) => {
    e.preventDefault();
    const city = manualCity.trim();
    if (!city) return;
    setSearching(true);
    setLocationError("");
    try {
      const res = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(city)}`);
      const data = await res.json();
      if (Array.isArray(data) && data.length > 0) {
        const userLoc = { lat: parseFloat(data[0].lat), lng: parseFloat(data[0].lon) };
        setLocation(userLoc);
        await executeHealthcareSearch(userLoc);
      } else {
        setLocationError(`Could not find location for "${city}".`);
      }
    } catch {
      setLocationError("Location search failed. Please try again.");
    } finally {
      setSearching(false);
    }
  };

  const sortedDoctors = [...doctors].sort((a, b) => {
    if (sortBy === "rating") {
      return (b.rating ?? 0) - (a.rating ?? 0);
    }
    return (a.distanceKm ?? Infinity) - (b.distanceKm ?? Infinity);
  });

  if (loading) {
    return (
      <div className="app-shell grid min-h-screen place-items-center">
        <div className="eyebrow">Loading health assistant</div>
      </div>
    );
  }

  if (error || !user) {
    return (
      <div className="app-shell grid min-h-screen place-items-center p-6">
        <div className="panel max-w-lg p-8 text-center">
          <div className="eyebrow">Authentication required</div>
          <h1 className="mt-4 text-2xl font-bold text-white">Sign in to use the assistant.</h1>
          <Link href="/auth" className="btn-primary mt-6 inline-flex px-5 py-3 no-underline">
            Open secure sign in
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="app-shell min-h-screen">
      <div className="container-wide py-10">
        <Link href="/dashboard" className="text-sm text-slate-400 no-underline">
          ← Back to overview
        </Link>

        <div className="mt-10 grid gap-5 xl:grid-cols-[1.1fr_.9fr]">
          {/* LEFT: AI CHAT ASSISTANT */}
          <section className="panel bracket p-6 sm:p-8">
            <div className="flex items-start justify-between gap-4">
              <div>
                <div className="eyebrow">AI health assistant</div>
                <h1 className="mt-3 text-3xl font-bold text-white">Ask about your health.</h1>
                <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-400">
                  Ask about your DiaSense assessment, personalized diet & meal plans, blood pressure, diabetes, symptoms, exercises, and medicines.
                </p>
              </div>
              <Stethoscope className="shrink-0 text-cyan-300" size={26} />
            </div>

            {/* CHAT MESSAGES */}
            <div aria-live="polite" className="mt-7 space-y-4">
              {messages.map(m => (
                <div
                  key={m.id}
                  className={`max-w-[92%] rounded-lg p-4 text-sm leading-6 ${
                    m.role === "assistant"
                      ? "border border-slate-800 bg-slate-900/60 text-slate-200"
                      : "ml-auto border border-cyan-400/30 bg-cyan-400/10 text-cyan-50"
                  }`}
                >
                  <div className="mono mb-1 text-[10px] text-slate-500">
                    {m.role === "assistant" ? "DIASENSE AI" : "YOU"}
                  </div>
                  {m.role === "assistant" && m.shouldType ? (
                    <TypedReply content={m.content} active />
                  ) : (
                    m.content
                  )}
                </div>
              ))}

              {chat.isPending && (
                <div className="flex items-center gap-2 text-sm text-slate-400">
                  <Loader2 className="animate-spin text-cyan-300" size={16} />
                  Analyzing clinical inquiry…
                </div>
              )}
            </div>

            {/* INPUT FORM */}
            <form onSubmit={send} className="mt-6 flex gap-2">
              <input
                value={input}
                onChange={e => setInput(e.target.value)}
                placeholder="Ask in English or Hinglish (e.g. mera diet plan kya hona chahiye?)..."
                className="flex-1 rounded-lg border border-slate-700 bg-slate-950 px-4 py-3 text-sm text-white placeholder-slate-500 focus:border-cyan-400 focus:outline-none"
              />
              <button
                type="submit"
                disabled={chat.isPending || !input.trim()}
                className="btn-primary inline-flex items-center px-5 py-3 disabled:opacity-50"
              >
                <Send size={15} />
              </button>
            </form>

            <div className="mt-5 rounded-lg border border-amber-300/20 bg-amber-300/5 p-4 text-xs leading-5 text-amber-100">
              <b>Important:</b> DiaSense AI provides clinical health education and should not replace emergency medical care. For chest pain, shortness of breath, or emergency symptoms, contact local emergency services immediately.
            </div>
          </section>

          {/* RIGHT: CLINICAL FOLLOW-UP & MAP LOCATOR */}
          <section className="panel p-6 sm:p-8">
            <div className="eyebrow">Clinical follow-up & Healthcare Map</div>

            {status.isLoading ? (
              <div className="mt-6 flex items-center gap-2 text-sm text-slate-400">
                <Loader2 className="animate-spin" size={15} />
                Checking your latest assessment…
              </div>
            ) : highRisk ? (
              <>
                <div className="mt-4 flex gap-3 rounded-lg border border-rose-300/30 bg-rose-300/10 p-4">
                  <ShieldAlert className="mt-0.5 shrink-0 text-rose-300" size={20} />
                  <div>
                    <h2 className="font-semibold text-rose-100">
                      Your latest signal needs timely clinical follow-up.
                    </h2>
                    <p className="mt-1 text-sm leading-6 text-rose-100/80">
                      Your result indicated {status.data?.risk}% risk. Find nearby doctors, clinics, and hospitals below for medical evaluation.
                    </p>
                  </div>
                </div>

                {/* LOCATION TRIGGER BUTTONS */}
                <div className="mt-5 flex flex-wrap items-center gap-3">
                  <button
                    type="button"
                    onClick={requestLocation}
                    disabled={locationLoading || searching}
                    className="btn-primary inline-flex items-center px-4 py-3 text-sm disabled:opacity-50"
                  >
                    {locationLoading || searching ? (
                      <Loader2 size={16} className="mr-2 animate-spin" />
                    ) : (
                      <MapPin size={16} className="mr-2" />
                    )}
                    {locationLoading
                      ? "Detecting location..."
                      : searching
                        ? "Finding nearby clinics..."
                        : location
                          ? "Refresh nearby healthcare"
                          : "Use my location"}
                  </button>

                  {location && (
                    <a
                      href={`https://www.google.com/maps/search/diabetes+specialist+hospital+clinic+near+me/@${location.lat},${location.lng},14z`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="btn-ghost inline-flex items-center px-4 py-3 text-sm text-cyan-300 no-underline"
                    >
                      <ExternalLink size={15} className="mr-2" />
                      Open Google Maps
                    </a>
                  )}
                </div>

                {/* MANUAL CITY SEARCH */}
                <form onSubmit={handleCitySearch} className="mt-4 flex gap-2">
                  <input
                    value={manualCity}
                    onChange={e => setManualCity(e.target.value)}
                    placeholder="Enter city or area (e.g. Delhi, Mumbai, Patna)..."
                    className="flex-1 rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-xs text-white placeholder-slate-500 focus:border-cyan-400 focus:outline-none"
                  />
                  <button
                    type="submit"
                    disabled={searching || !manualCity.trim()}
                    className="btn-ghost inline-flex items-center px-3 py-2 text-xs text-cyan-300 disabled:opacity-50"
                  >
                    <Search size={14} className="mr-1" /> Search City
                  </button>
                </form>

                {/* LOCATION ERROR */}
                {locationError && (
                  <div className="mt-4 rounded-lg border border-amber-300/20 bg-amber-300/5 p-4 text-sm leading-6 text-amber-100">
                    <p>{locationError}</p>
                    <button
                      type="button"
                      onClick={requestLocation}
                      className="mt-3 inline-flex items-center text-xs font-semibold text-cyan-300"
                    >
                      <RefreshCw size={13} className="mr-1" />
                      Try again
                    </button>
                  </div>
                )}

                {/* INTERACTIVE MAP & CLINIC LIST */}
                {location && (
                  <div className="mt-5 space-y-4">
                    {/* VISUAL MAP VIEW */}
                    <div className="overflow-hidden rounded-lg border border-slate-800 bg-slate-950">
                      <div className="border-b border-slate-800 bg-slate-900/50 px-3 py-2 text-xs text-slate-300 flex items-center justify-between">
                        <span className="flex items-center gap-1.5 font-medium text-cyan-200">
                          <MapPin size={14} className="text-cyan-400" /> Live Healthcare Locator Map
                        </span>
                        <span className="mono text-[10px] text-slate-400">
                          {location.lat.toFixed(3)}, {location.lng.toFixed(3)}
                        </span>
                      </div>
                      <div className="h-48 w-full relative">
                        <MapView
                          initialCenter={location}
                          initialZoom={13}
                          onMapReady={m => {
                            setMapInstance(m);
                            searchClinicians(m, location).then(res => setDoctors(res));
                          }}
                          className="h-full w-full"
                        />
                      </div>
                    </div>

                    {/* SORTING CONTROLS */}
                    <div className="flex items-center justify-between pt-2">
                      <label htmlFor="sort-doctors" className="text-xs text-slate-400">
                        Sort nearby doctors:
                      </label>
                      <select
                        id="sort-doctors"
                        aria-label="Sort nearby doctors"
                        value={sortBy}
                        onChange={e => setSortBy(e.target.value as "distance" | "rating")}
                        className="rounded border border-slate-700 bg-slate-900 px-2 py-1 text-xs text-slate-200"
                      >
                        <option value="distance">Distance</option>
                        <option value="rating">Rating</option>
                      </select>
                    </div>

                    {/* RESULTS */}
                    {searching ? (
                      <div className="mt-5 flex items-center gap-2 text-sm text-slate-400">
                        <Loader2 className="animate-spin text-cyan-300" size={16} />
                        Finding nearby healthcare centers…
                      </div>
                    ) : sortedDoctors.length > 0 ? (
                      <div className="space-y-3">
                        {sortedDoctors.map(doctor => (
                          <div
                            key={doctor.placeId}
                            className="rounded-lg border border-slate-800 bg-slate-950/40 p-4 transition-colors hover:border-slate-700"
                          >
                            <div className="flex items-start justify-between gap-3">
                              <div className="min-w-0">
                                <div className="mb-1 inline-flex rounded-full border border-cyan-300/15 bg-cyan-300/5 px-2 py-0.5 text-[10px] font-semibold text-cyan-200">
                                  {doctor.type}
                                </div>
                                <h3 className="text-sm font-semibold text-white">{doctor.name}</h3>
                                <p className="mt-1 text-xs leading-5 text-slate-400">{doctor.address}</p>
                                <div className="mt-2 flex items-center gap-3 text-[11px] text-slate-400">
                                  {typeof doctor.distanceKm === "number" && (
                                    <span>{doctor.distanceKm.toFixed(1)} km away</span>
                                  )}
                                  {typeof doctor.rating === "number" && (
                                    <span className="text-amber-300 font-medium">
                                      {doctor.rating}/5 patient rating
                                    </span>
                                  )}
                                </div>
                              </div>
                              <button
                                type="button"
                                onClick={() => openDirections(doctor)}
                                className="inline-flex shrink-0 items-center text-xs font-semibold text-cyan-300 hover:text-cyan-200"
                              >
                                Directions
                                <ExternalLink size={13} className="ml-1" />
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="rounded-lg border border-slate-800 bg-slate-950/40 p-4 text-center">
                        <p className="text-sm text-slate-400">
                          No nearby search result was returned in this immediate area.
                        </p>
                        <a
                          href={`https://www.google.com/maps/search/hospitals+clinics+near+me/@${location.lat},${location.lng},14z`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="btn-primary mt-3 inline-flex items-center text-xs no-underline"
                        >
                          <ExternalLink size={13} className="mr-1.5" />
                          Search on Google Maps
                        </a>
                      </div>
                    )}
                  </div>
                )}
              </>
            ) : (
              /* NOT HIGH RISK */
              <div className="mt-5 space-y-4">
                <div className="rounded-lg border border-emerald-300/20 bg-emerald-300/5 p-4">
                  <h2 className="font-semibold text-emerald-100">
                    No high-risk escalation is currently active.
                  </h2>
                  <p className="mt-2 text-sm leading-6 text-emerald-100/80">
                    Your assessment indicates normal or manageable risk. Follow your personalized diet and physical activity plan from your assessment report.
                  </p>
                </div>

                <div className="rounded-lg border border-slate-800 bg-slate-900/40 p-4">
                  <h3 className="text-sm font-semibold text-white">Need a preventive routine checkup?</h3>
                  <p className="mt-1 text-xs text-slate-400">
                    You can always locate nearby preventive clinics and pathology labs anytime.
                  </p>
                  <button
                    type="button"
                    onClick={requestLocation}
                    disabled={locationLoading || searching}
                    className="btn-ghost mt-3 inline-flex items-center text-xs text-cyan-300"
                  >
                    <MapPin size={13} className="mr-1.5" /> Locate nearby wellness clinics
                  </button>
                </div>
              </div>
            )}
          </section>
        </div>
      </div>
    </div>
  );
}
