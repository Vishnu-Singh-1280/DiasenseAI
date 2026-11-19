import fs from "fs";
import path from "path";
import crypto from "crypto";

const STORE_PATH = path.resolve(process.cwd(), "storage", "db_store.json");

type DbStore = {
  users: any[];
  profiles: any[];
  assessments: any[];
  predictions: any[];
  recommendations: any[];
  reports: any[];
  dailyHealthLogs: any[];
  dailyReminderSettings: any[];
  dailyReminderNotices: any[];
};

function getEmptyStore(): DbStore {
  return {
    users: [],
    profiles: [],
    assessments: [],
    predictions: [],
    recommendations: [],
    reports: [],
    dailyHealthLogs: [],
    dailyReminderSettings: [],
    dailyReminderNotices: [],
  };
}

let memoryStore: DbStore | null = null;

function loadStore(): DbStore {
  if (memoryStore) return memoryStore;
  try {
    if (fs.existsSync(STORE_PATH)) {
      const data = fs.readFileSync(STORE_PATH, "utf-8");
      memoryStore = JSON.parse(data);
      return memoryStore!;
    }
  } catch (e) {
    console.warn("[LocalDB] Error reading store, using empty store:", e);
  }
  memoryStore = getEmptyStore();
  saveStore(memoryStore);
  return memoryStore;
}

function saveStore(store: DbStore) {
  try {
    const dir = path.dirname(STORE_PATH);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(STORE_PATH, JSON.stringify(store, null, 2), "utf-8");
  } catch (e) {
    console.warn("[LocalDB] Error persisting store to disk:", e);
  }
}

export const localDb = {
  async upsertUser(user: any): Promise<void> {
    const store = loadStore();
    const existingIndex = store.users.findIndex(u => u.openId === user.openId);
    if (existingIndex >= 0) {
      const existing = store.users[existingIndex];
      const updated = { ...existing };
      for (const [k, v] of Object.entries(user)) {
        if (v !== undefined) {
          updated[k] = v;
        }
      }
      updated.lastSignedIn = new Date();
      store.users[existingIndex] = updated;
    } else {
      const id = store.users.length + 1;
      store.users.push({ id, ...user, role: user.role ?? "user", createdAt: new Date(), updatedAt: new Date(), lastSignedIn: new Date() });
    }
    saveStore(store);
  },

  async getUserByOpenId(openId: string) {
    const store = loadStore();
    return store.users.find(u => u.openId === openId);
  },

  async getUserByEmail(email: string) {
    const store = loadStore();
    return store.users.find(u => u.email?.toLowerCase() === email.toLowerCase());
  },

  async createLocalUser(input: { name: string; email: string; passwordHash: string }) {
    const store = loadStore();
    const id = store.users.length + 1;
    store.users.push({
      id,
      openId: `local:${input.email.toLowerCase()}`,
      name: input.name,
      email: input.email.toLowerCase(),
      passwordHash: input.passwordHash,
      loginMethod: "password",
      role: store.users.length === 0 ? "admin" : "user",
      createdAt: new Date(),
      updatedAt: new Date(),
      lastSignedIn: new Date(),
    });
    saveStore(store);
    return id;
  },

  async updatePassword(userId: number, passwordHash: string) {
    const store = loadStore();
    const user = store.users.find(u => u.id === userId);
    if (user) {
      user.passwordHash = passwordHash;
      user.updatedAt = new Date();
      saveStore(store);
    }
  },

  async updateUserProfile(userId: number, input: { name?: string; email?: string }) {
    const store = loadStore();
    const user = store.users.find(u => u.id === userId);
    if (user) {
      if (input.name !== undefined) user.name = input.name;
      if (input.email !== undefined) user.email = input.email.toLowerCase();
      user.updatedAt = new Date();
      saveStore(store);
    }
  },

  async createAssessment(input: any) {
    const store = loadStore();
    const assessmentId = store.assessments.length + 1;
    store.assessments.unshift({
      id: assessmentId,
      userId: input.userId,
      age: input.age,
      heightCm: input.heightCm.toFixed(1),
      weightKg: input.weightKg.toFixed(1),
      bmi: input.bmi.toFixed(1),
      bloodPressure: input.bloodPressure ? input.bloodPressure.toFixed(1) : null,
      glucose: input.glucose ? input.glucose.toFixed(1) : null,
      pregnancies: input.pregnancies ?? null,
      skinThickness: input.skinThickness ? input.skinThickness.toFixed(1) : null,
      insulin: input.insulin ? input.insulin.toFixed(1) : null,
      diabetesPedigree: input.diabetesPedigree ? input.diabetesPedigree.toFixed(4) : null,
      familyHistory: input.familyHistory,
      activity: input.activity,
      pregnancyStatus: input.pregnancyStatus ?? null,
      createdAt: new Date(),
    });

    const predictionId = store.predictions.length + 1;
    store.predictions.unshift({
      id: predictionId,
      assessmentId,
      riskPercentage: input.riskPercentage,
      confidence: input.confidence,
      healthScore: input.healthScore,
      category: input.category,
      modelVersion: input.modelVersion,
      createdAt: new Date(),
    });

    const recommendationId = store.recommendations.length + 1;
    store.recommendations.push({
      id: recommendationId,
      predictionId,
      diet: input.diet,
      exercise: input.exercise,
      lifestyle: input.lifestyle,
      createdAt: new Date(),
    });

    saveStore(store);
    return { assessmentId, predictionId };
  },

  async getAssessmentsByUser(userId: number) {
    const store = loadStore();
    return store.assessments.filter(a => a.userId === userId);
  },

  async upsertProfile(input: any) {
    const store = loadStore();
    const index = store.profiles.findIndex(p => p.userId === input.userId);
    const profile = {
      userId: input.userId,
      gender: input.gender,
      heightCm: input.heightCm ? input.heightCm.toFixed(1) : null,
      weightKg: input.weightKg ? input.weightKg.toFixed(1) : null,
      updatedAt: new Date(),
    };
    if (index >= 0) {
      store.profiles[index] = { ...store.profiles[index], ...profile };
    } else {
      store.profiles.push({ id: store.profiles.length + 1, ...profile, createdAt: new Date() });
    }
    saveStore(store);
  },

  async getRecommendationsByPrediction(predictionId: number) {
    const store = loadStore();
    return store.recommendations.find(r => r.predictionId === predictionId);
  },

  async getReportsByUser(userId: number) {
    const store = loadStore();
    return store.reports.filter(r => r.userId === userId);
  },

  async createDailyHealthLog(input: any) {
    const store = loadStore();
    const id = store.dailyHealthLogs.length + 1;
    store.dailyHealthLogs.unshift({
      id,
      userId: input.userId,
      glucose: input.glucose ? input.glucose.toFixed(1) : null,
      systolicPressure: input.systolicPressure ?? null,
      diastolicPressure: input.diastolicPressure ?? null,
      steps: input.steps ?? null,
      sleepHours: input.sleepHours ? input.sleepHours.toFixed(1) : null,
      waterMl: input.waterMl ?? null,
      movementMinutes: input.movementMinutes ?? null,
      createdAt: new Date(),
    });
    saveStore(store);
    return { id };
  },

  async getDailyHealthLogsByUser(userId: number, limit = 14) {
    const store = loadStore();
    return store.dailyHealthLogs.filter(d => d.userId === userId).slice(0, limit);
  },

  async getDailyReminderSetting(userId: number) {
    const store = loadStore();
    return store.dailyReminderSettings.find(s => s.userId === userId);
  },

  async saveDailyReminderSetting(input: any) {
    const store = loadStore();
    const index = store.dailyReminderSettings.findIndex(s => s.userId === input.userId);
    const setting = {
      userId: input.userId,
      enabled: input.enabled,
      reminderTime: input.reminderTime,
      timezoneOffsetMinutes: input.timezoneOffsetMinutes,
      scheduleCronTaskUid: input.scheduleCronTaskUid ?? null,
      updatedAt: new Date(),
    };
    if (index >= 0) {
      store.dailyReminderSettings[index] = { ...store.dailyReminderSettings[index], ...setting };
    } else {
      store.dailyReminderSettings.push({ id: store.dailyReminderSettings.length + 1, ...setting, createdAt: new Date() });
    }
    saveStore(store);
    return this.getDailyReminderSetting(input.userId);
  },

  async getLatestUnreadDailyReminder(userId: number) {
    const store = loadStore();
    return store.dailyReminderNotices.find(n => n.userId === userId && !n.seenAt);
  },

  async createScheduledDailyReminder(input: any) {
    const store = loadStore();
    const reminderKey = `${input.settingId}:${input.reminderDate}`;
    const index = store.dailyReminderNotices.findIndex(n => n.reminderKey === reminderKey);
    if (index >= 0) {
      store.dailyReminderNotices[index].message = input.message;
    } else {
      store.dailyReminderNotices.unshift({
        id: store.dailyReminderNotices.length + 1,
        settingId: input.settingId,
        userId: input.userId,
        reminderDate: input.reminderDate,
        reminderKey,
        message: input.message,
        createdAt: new Date(),
        seenAt: null,
      });
    }
    saveStore(store);
  },

  async getDailyReminderSettingByTaskUid(taskUid: string) {
    const store = loadStore();
    return store.dailyReminderSettings.find(s => s.scheduleCronTaskUid === taskUid);
  },

  async markDailyReminderSeen(userId: number, noticeId: number) {
    const store = loadStore();
    const notice = store.dailyReminderNotices.find(n => n.id === noticeId && n.userId === userId);
    if (notice) {
      notice.seenAt = new Date();
      saveStore(store);
    }
  },

  async getLatestAssessmentBundle(userId: number) {
    const store = loadStore();
    const assessment = store.assessments.find(a => a.userId === userId);
    if (!assessment) return undefined;
    const prediction = store.predictions.find(p => p.assessmentId === assessment.id);
    const recommendation = prediction ? store.recommendations.find(r => r.predictionId === prediction.id) : undefined;
    return { assessment, prediction, recommendation };
  },

  async getDashboardSummary(userId: number) {
    const store = loadStore();
    const userAssessments = store.assessments.filter(a => a.userId === userId).slice(0, 12);
    const history = userAssessments.map(a => {
      const pred = store.predictions.find(p => p.assessmentId === a.id);
      return {
        id: a.id,
        riskPercentage: pred ? Number(pred.riskPercentage) : 0,
        confidence: pred ? Number(pred.confidence) : 0,
        healthScore: pred ? Number(pred.healthScore) : 0,
        category: pred?.category ?? "Low risk",
        bmi: Number(a.bmi),
        activity: a.activity,
        createdAt: a.createdAt,
      };
    });
    return { latest: history[0] ?? null, history };
  },

  async createReportMetadata(input: any) {
    const store = loadStore();
    const reportId = `DS-${new Date().getFullYear()}-${crypto.randomUUID().slice(0, 8).toUpperCase()}`;
    store.reports.unshift({
      id: store.reports.length + 1,
      userId: input.userId,
      assessmentId: input.assessmentId,
      reportId,
      storageUrl: input.storageUrl ?? null,
      createdAt: new Date(),
    });
    saveStore(store);
    return { reportId, storageUrl: input.storageUrl };
  },

  async getAdminStats() {
    const store = loadStore();
    return {
      users: store.users.length,
      assessments: store.assessments.length,
      reports: store.reports.length,
      predictions: store.predictions.length,
    };
  },
};
