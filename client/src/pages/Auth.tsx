import { FormEvent, useState } from "react";
import { ArrowLeft, ArrowRight, Activity, LockKeyhole, Eye, EyeOff } from "lucide-react";
import { Link, useLocation } from "wouter";
import { trpc } from "@/lib/trpc";
import { getPostLoginPath } from "@/lib/authRedirect";

const input = "mt-2 w-full rounded-lg border border-slate-700 bg-slate-950/70 px-3 py-3 text-sm text-white outline-none focus:border-cyan-300";

export default function Auth() {
  const [, navigate] = useLocation();
  const [mode, setMode] = useState<"login" | "register">("login");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");

  const completeAuth = () => navigate(getPostLoginPath(window.location.search));
  const login = trpc.auth.login.useMutation({ onSuccess: completeAuth, onError: e => setError(e.message) });
  const register = trpc.auth.register.useMutation({ onSuccess: completeAuth, onError: e => setError(e.message) });

  const submit = (e: FormEvent) => {
    e.preventDefault();
    setError("");
    const cleanEmail = email.trim().toLowerCase();
    const cleanName = name.trim();
    if (mode === "login") {
      login.mutate({ email: cleanEmail, password });
    } else {
      register.mutate({ name: cleanName, email: cleanEmail, password });
    }
  };

  const fillDemo = () => {
    setMode("login");
    setEmail("admin@diasense.ai");
    setPassword("Password123!");
    setError("");
  };

  const pending = login.isPending || register.isPending;

  return (
    <div className="app-shell">
      <div className="container-wide py-8">
        <Link href="/" className="flex items-center gap-3 text-white no-underline">
          <span className="grid h-9 w-9 place-items-center border border-cyan-300/50 bg-cyan-300/10 text-cyan-200">
            <Activity size={17} />
          </span>
          <b>DiaSense <span className="text-cyan-300">AI</span></b>
        </Link>

        <div className="mx-auto mt-16 grid max-w-4xl items-center gap-14 lg:grid-cols-2">
          <div className="hidden lg:block">
            <div className="eyebrow">Secure workspace</div>
            <h1 className="mt-4 text-5xl font-bold tracking-tight text-white">
              Your health signal, in one private place.
            </h1>
            <p className="mt-5 leading-7 text-slate-400">
              Sign in to see your assessments, recommendations, and reports.
            </p>
          </div>

          <div className="panel bracket p-7 sm:p-9">
            <div className="flex items-center gap-2 text-cyan-300">
              <LockKeyhole size={17} />
              <span className="mono text-[10px]">LOCAL SESSION</span>
            </div>

            <h2 className="mt-8 text-2xl font-bold text-white">
              {mode === "login" ? "Welcome back." : "Create your account."}
            </h2>
            <p className="mt-2 text-sm text-slate-400">
              {mode === "login"
                ? "Enter your email and password to sign in."
                : "Create an account with name, email, and password (10+ characters)."}
            </p>

            {/* Quick 1-click Demo Account */}
            <div className="mt-4 flex items-center justify-between rounded-lg border border-cyan-300/20 bg-cyan-300/5 p-3 text-xs text-slate-300">
              <span><b>Demo:</b> admin@diasense.ai</span>
              <button
                type="button"
                onClick={fillDemo}
                className="rounded bg-cyan-300/20 px-2.5 py-1 text-xs font-semibold text-cyan-200 transition hover:bg-cyan-300/30"
              >
                1-Click Demo Fill
              </button>
            </div>

            <form className="mt-6 space-y-4" onSubmit={submit}>
              {mode === "register" && (
                <label className="block text-sm text-slate-300">
                  Full name
                  <input
                    required
                    minLength={2}
                    value={name}
                    onChange={e => setName(e.target.value)}
                    className={input}
                    placeholder="Enter your full name"
                  />
                </label>
              )}

              <label className="block text-sm text-slate-300">
                Email
                <input
                  required
                  className={input}
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  type="email"
                  placeholder="you@example.com"
                />
              </label>

              <label className="block text-sm text-slate-300">
                Password
                <div className="relative">
                  <input
                    required
                    minLength={mode === "register" ? 10 : 1}
                    className={`${input} pr-10`}
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                    type={showPassword ? "text" : "password"}
                    placeholder={mode === "register" ? "10+ characters (e.g. Password123!)" : "••••••••"}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-5 text-slate-400 hover:text-white"
                  >
                    {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
              </label>

              {error && (
                <p className="rounded-lg border border-rose-300/20 bg-rose-300/5 p-3 text-sm text-rose-200">
                  {error}
                </p>
              )}

              <button
                disabled={pending}
                className="btn-primary mt-2 flex w-full items-center justify-center px-4 py-3 text-sm disabled:opacity-50"
              >
                {pending ? "Securing…" : mode === "login" ? "Sign in" : "Create account"}
                <ArrowRight size={15} className="ml-2" />
              </button>
            </form>

            <div className="mt-6 flex flex-col gap-3 text-center text-xs text-slate-500">
              <button
                onClick={() => {
                  setMode(mode === "register" ? "login" : "register");
                  setError("");
                }}
                className="text-slate-300 hover:text-cyan-300 transition"
              >
                {mode === "register"
                  ? "Already have an account? Sign in"
                  : "New to DiaSense? Create an account"}
              </button>
              <Link href="/" className="mt-2 inline-flex items-center justify-center gap-2 text-slate-500 no-underline hover:text-slate-300">
                <ArrowLeft size={13} /> Back to home
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
