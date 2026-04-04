import { randomUUID } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { getAdminFirestore, isFirestoreConfigured } from "@/lib/firestore-admin";
import type { PlanId } from "@/lib/plans";
import { FREE_TURN_LIMIT, addDays } from "@/lib/plans";
import { isLocalJsonStoreAllowed } from "@/lib/runtime-config";

export type AppUserInput = {
  id: string;
  email: string;
  name?: string | null;
  image?: string | null;
};

export type DayPassUsage = {
  revisionNotesUsed: number;
  prelimsTestsUsed: number;
  mainsQuestionsUsed: number;
  studyDocumentSignature: string;
};

export type FeatureTrialUsage = {
  currentAffairsTurnsUsed: number;
  mainsQuestionsUsed: number;
  mainsEvaluationsUsed: number;
  revisionNotesUsed: number;
};

export type UserProfile = {
  id: string;
  email: string;
  name: string;
  image: string;
  plan: PlanId;
  subscriptionStatus: "inactive" | "active" | "pending";
  subscriptionExpiresAt: string;
  subscriptionOrderId: string;
  subscriptionPaymentId: string;
  freeTurnsUsed: number;
  strengths: string[];
  weaknesses: string[];
  strengthSignals: Record<string, number>;
  weaknessSignals: Record<string, number>;
  dayPassUsage: DayPassUsage;
  featureTrialUsage: FeatureTrialUsage;
  averageRating: number;
  feedbackCount: number;
  createdAt: string;
  updatedAt: string;
};

export type PracticeReport = {
  id: string;
  userId: string;
  mode: "mains" | "prelims";
  subject: string;
  topic: string;
  chapter: string;
  score: string;
  verdict: string;
  strengths: string[];
  weaknesses: string[];
  createdAt: string;
};

export type SessionFeedback = {
  id: string;
  userId: string;
  sessionKey: string;
  sessionType: string;
  subject: string;
  rating: number;
  feedback: string;
  createdAt: string;
};

export type BillingStatus =
  | "pending"
  | "authorized"
  | "paid"
  | "failed"
  | "partially_refunded"
  | "refunded";

export type BillingRecord = {
  id: string;
  userId: string;
  planId: PlanId;
  orderId: string;
  paymentId: string;
  status: BillingStatus;
  amountPaise: number;
  refundedAmountPaise: number;
  refundStatus: "none" | "partial" | "full";
  currency: string;
  createdAt: string;
  expiresAt: string;
  lastRefundAt: string;
};

export type RefundRecord = {
  id: string;
  refundId: string;
  userId: string;
  planId: PlanId;
  orderId: string;
  paymentId: string;
  amountPaise: number;
  currency: string;
  status: "pending" | "processed" | "failed";
  speedRequested: string;
  speedProcessed: string;
  receipt: string;
  reason: string;
  notes: Record<string, string>;
  initiatedByUserId: string;
  initiatedByEmail: string;
  createdAt: string;
  updatedAt: string;
};

type LocalStore = {
  users: Record<string, UserProfile>;
  reports: Record<string, PracticeReport>;
  feedback: Record<string, SessionFeedback>;
  billing: Record<string, BillingRecord>;
  refunds: Record<string, RefundRecord>;
};

const LOCAL_STORE_PATH = path.join(process.cwd(), "data", "private", "local-store.json");

const defaultDayPassUsage = (): DayPassUsage => ({
  revisionNotesUsed: 0,
  prelimsTestsUsed: 0,
  mainsQuestionsUsed: 0,
  studyDocumentSignature: "",
});

const defaultFeatureTrialUsage = (): FeatureTrialUsage => ({
  currentAffairsTurnsUsed: 0,
  mainsQuestionsUsed: 0,
  mainsEvaluationsUsed: 0,
  revisionNotesUsed: 0,
});

function nowIso() {
  return new Date().toISOString();
}

function getDefaultExpiry() {
  return new Date(0).toISOString();
}

function normalizeDayPassUsage(value: unknown): DayPassUsage {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return defaultDayPassUsage();
  }

  const source = value as Partial<DayPassUsage>;

  return {
    revisionNotesUsed:
      typeof source.revisionNotesUsed === "number" ? source.revisionNotesUsed : 0,
    prelimsTestsUsed:
      typeof source.prelimsTestsUsed === "number" ? source.prelimsTestsUsed : 0,
    mainsQuestionsUsed:
      typeof source.mainsQuestionsUsed === "number" ? source.mainsQuestionsUsed : 0,
    studyDocumentSignature:
      typeof source.studyDocumentSignature === "string" ? source.studyDocumentSignature : "",
  };
}

function normalizeFeatureTrialUsage(value: unknown): FeatureTrialUsage {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return defaultFeatureTrialUsage();
  }

  const source = value as Partial<FeatureTrialUsage>;

  return {
    currentAffairsTurnsUsed:
      typeof source.currentAffairsTurnsUsed === "number" ? source.currentAffairsTurnsUsed : 0,
    mainsQuestionsUsed:
      typeof source.mainsQuestionsUsed === "number" ? source.mainsQuestionsUsed : 0,
    mainsEvaluationsUsed:
      typeof source.mainsEvaluationsUsed === "number" ? source.mainsEvaluationsUsed : 0,
    revisionNotesUsed:
      typeof source.revisionNotesUsed === "number" ? source.revisionNotesUsed : 0,
  };
}

function createDefaultUserProfile(input: AppUserInput): UserProfile {
  const now = nowIso();

  return {
    id: input.id,
    email: input.email,
    name: input.name?.trim() || "TamGam user",
    image: input.image?.trim() || "",
    plan: "free",
    subscriptionStatus: "inactive",
    subscriptionExpiresAt: getDefaultExpiry(),
    subscriptionOrderId: "",
    subscriptionPaymentId: "",
    freeTurnsUsed: 0,
    strengths: [],
    weaknesses: [],
    strengthSignals: {},
    weaknessSignals: {},
    dayPassUsage: defaultDayPassUsage(),
    featureTrialUsage: defaultFeatureTrialUsage(),
    averageRating: 0,
    feedbackCount: 0,
    createdAt: now,
    updatedAt: now,
  };
}

function assertLocalStoreAllowed() {
  if (isLocalJsonStoreAllowed()) {
    return;
  }

  throw new Error(
    "Firestore must be configured in production. Local JSON storage is disabled outside development unless ALLOW_LOCAL_JSON_STORE=true is set intentionally.",
  );
}

export function getPersistentStoreMode() {
  if (isFirestoreConfigured()) {
    return "firestore" as const;
  }

  return isLocalJsonStoreAllowed() ? ("local-json" as const) : ("missing" as const);
}

export { getAdminFirestore, isFirestoreConfigured };

async function readLocalStore(): Promise<LocalStore> {
  assertLocalStoreAllowed();

  try {
    const raw = await readFile(LOCAL_STORE_PATH, "utf8");
    const parsed = JSON.parse(raw) as LocalStore;

    return {
      users: parsed.users || {},
      reports: parsed.reports || {},
      feedback: parsed.feedback || {},
      billing: parsed.billing || {},
      refunds: parsed.refunds || {},
    };
  } catch {
    return {
      users: {},
      reports: {},
      feedback: {},
      billing: {},
      refunds: {},
    };
  }
}

async function writeLocalStore(store: LocalStore) {
  assertLocalStoreAllowed();
  await mkdir(path.dirname(LOCAL_STORE_PATH), { recursive: true });
  await writeFile(LOCAL_STORE_PATH, JSON.stringify(store, null, 2), "utf8");
}

function normalizeUserProfile(profile: UserProfile, fallback: AppUserInput) {
  return {
    ...profile,
    name: profile.name || fallback.name?.trim() || "TamGam user",
    image: profile.image || fallback.image?.trim() || "",
    subscriptionOrderId: profile.subscriptionOrderId || "",
    subscriptionPaymentId: profile.subscriptionPaymentId || "",
    dayPassUsage: normalizeDayPassUsage(profile.dayPassUsage),
    featureTrialUsage: normalizeFeatureTrialUsage(profile.featureTrialUsage),
  };
}

function getBillingRefundState(amountPaise: number, refundedAmountPaise: number) {
  if (refundedAmountPaise <= 0) {
    return {
      status: "paid" as BillingStatus,
      refundStatus: "none" as const,
    };
  }

  if (amountPaise > 0 && refundedAmountPaise >= amountPaise) {
    return {
      status: "refunded" as BillingStatus,
      refundStatus: "full" as const,
    };
  }

  return {
    status: "partially_refunded" as BillingStatus,
    refundStatus: "partial" as const,
  };
}

function getTopSignals(signalMap: Record<string, number>, subject?: string) {
  const prefix = subject ? `${subject}::` : "";
  const entries = Object.entries(signalMap)
    .filter(([key]) => (!prefix ? true : key.startsWith(prefix)))
    .sort((left, right) => right[1] - left[1])
    .slice(0, 8);

  if (entries.length || !subject) {
    return entries.map(([key]) => key.split("::").slice(1).join("::") || key);
  }

  return Object.entries(signalMap)
    .sort((left, right) => right[1] - left[1])
    .slice(0, 8)
    .map(([key]) => key.split("::").slice(1).join("::") || key);
}

function incrementSignalMap(
  signalMap: Record<string, number>,
  subject: string,
  items: string[],
) {
  const next = { ...signalMap };

  for (const rawItem of items) {
    const item = rawItem.trim();

    if (!item) {
      continue;
    }

    const key = `${subject}::${item}`;
    next[key] = (next[key] || 0) + 1;
  }

  return next;
}

export function hasActiveSubscription(profile: UserProfile) {
  return (
    profile.subscriptionStatus === "active" &&
    Boolean(profile.subscriptionExpiresAt) &&
    new Date(profile.subscriptionExpiresAt).getTime() > Date.now()
  );
}

export function getRemainingFreeTurns(profile: UserProfile) {
  if (hasActiveSubscription(profile)) {
    return Number.POSITIVE_INFINITY;
  }

  return Math.max(0, FREE_TURN_LIMIT - profile.freeTurnsUsed);
}

export function getCurrentAffairsRemainingTrialTurns(profile: UserProfile) {
  if (hasActiveSubscription(profile)) {
    return Number.POSITIVE_INFINITY;
  }

  return Math.max(0, 3 - normalizeFeatureTrialUsage(profile.featureTrialUsage).currentAffairsTurnsUsed);
}

export function hasActiveDayPass(profile: UserProfile) {
  return hasActiveSubscription(profile) && profile.plan === "day";
}

export function getDayPassLimitSnapshot(profile: UserProfile) {
  const usage = normalizeDayPassUsage(profile.dayPassUsage);

  return {
    revisionNotesRemaining: Math.max(0, 1 - usage.revisionNotesUsed),
    prelimsTestsRemaining: Math.max(0, 1 - usage.prelimsTestsUsed),
    mainsQuestionsRemaining: Math.max(0, 1 - usage.mainsQuestionsUsed),
    studyDocumentAttached: Boolean(usage.studyDocumentSignature),
  };
}

export function getFeatureTrialSnapshot(profile: UserProfile) {
  const usage = normalizeFeatureTrialUsage(profile.featureTrialUsage);

  return {
    currentAffairsTurnsRemaining: Math.max(0, 3 - usage.currentAffairsTurnsUsed),
    mainsQuestionsRemaining: Math.max(0, 1 - usage.mainsQuestionsUsed),
    mainsEvaluationsRemaining: Math.max(0, 1 - usage.mainsEvaluationsUsed),
    revisionNotesRemaining: Math.max(0, 1 - usage.revisionNotesUsed),
    prelimsTrialsRemaining: 0,
  };
}

async function persistUserProfile(nextProfile: UserProfile) {
  const firestore = getAdminFirestore();

  if (firestore) {
    await firestore.collection("users").doc(nextProfile.id).set(nextProfile, { merge: true });
    return nextProfile;
  }

  const store = await readLocalStore();
  store.users[nextProfile.id] = nextProfile;
  await writeLocalStore(store);
  return nextProfile;
}

export async function consumeDayPassFeature(
  userId: string,
  feature: "revision-notes" | "prelims-test" | "mains-question",
) {
  const profile = await getUserProfile(userId);

  if (!profile) {
    throw new Error("User profile not found.");
  }

  if (!hasActiveDayPass(profile)) {
    return {
      ok: true as const,
      profile,
    };
  }

  const currentUsage = normalizeDayPassUsage(profile.dayPassUsage);
  const field =
    feature === "revision-notes"
      ? "revisionNotesUsed"
      : feature === "prelims-test"
        ? "prelimsTestsUsed"
        : "mainsQuestionsUsed";

  if (currentUsage[field] >= 1) {
    const message =
      feature === "revision-notes"
        ? "Daily Pass includes only 1 1-pager revision note. Upgrade for more note generations."
        : feature === "prelims-test"
          ? "Daily Pass includes only 1 Prelims test. Upgrade for more tests."
          : "Daily Pass includes only 1 Mains question and evaluation slot. Upgrade for more practice.";

    return {
      ok: false as const,
      profile,
      message,
    };
  }

  const nextProfile: UserProfile = {
    ...profile,
    dayPassUsage: {
      ...currentUsage,
      [field]: currentUsage[field] + 1,
    },
    updatedAt: nowIso(),
  };

  return {
    ok: true as const,
    profile: await persistUserProfile(nextProfile),
  };
}

export async function consumeFeatureTrial(
  userId: string,
  feature:
    | "current-affairs-turn"
    | "mains-question"
    | "mains-evaluation"
    | "revision-notes",
) {
  const profile = await getUserProfile(userId);

  if (!profile) {
    throw new Error("User profile not found.");
  }

  if (hasActiveSubscription(profile)) {
    return {
      ok: true as const,
      profile,
    };
  }

  const currentUsage = normalizeFeatureTrialUsage(profile.featureTrialUsage);
  const field =
    feature === "current-affairs-turn"
      ? "currentAffairsTurnsUsed"
      : feature === "mains-question"
        ? "mainsQuestionsUsed"
        : feature === "mains-evaluation"
          ? "mainsEvaluationsUsed"
          : "revisionNotesUsed";
  const limit = feature === "current-affairs-turn" ? 3 : 1;

  if (currentUsage[field] >= limit) {
    const message =
      feature === "current-affairs-turn"
        ? "Current affairs gives 3 free turns. Choose a TamGam plan to continue."
        : feature === "mains-question"
          ? "Your free mains trial question is over. Choose a TamGam plan to continue."
          : feature === "mains-evaluation"
            ? "Your free mains evaluation is over. Choose a TamGam plan to continue."
            : "Your free 1-pager note is over. Choose a TamGam plan to continue.";

    return {
      ok: false as const,
      profile,
      message,
    };
  }

  const nextProfile: UserProfile = {
    ...profile,
    featureTrialUsage: {
      ...currentUsage,
      [field]: currentUsage[field] + 1,
    },
    updatedAt: nowIso(),
  };

  return {
    ok: true as const,
    profile: await persistUserProfile(nextProfile),
  };
}

export async function reserveDayPassStudyDocument(userId: string, documentSignature: string) {
  const profile = await getUserProfile(userId);

  if (!profile) {
    throw new Error("User profile not found.");
  }

  if (!hasActiveDayPass(profile) || !documentSignature) {
    return {
      ok: true as const,
      profile,
    };
  }

  const currentUsage = normalizeDayPassUsage(profile.dayPassUsage);

  if (!currentUsage.studyDocumentSignature) {
    const nextProfile: UserProfile = {
      ...profile,
      dayPassUsage: {
        ...currentUsage,
        studyDocumentSignature: documentSignature,
      },
      updatedAt: nowIso(),
    };

    return {
      ok: true as const,
      profile: await persistUserProfile(nextProfile),
    };
  }

  if (currentUsage.studyDocumentSignature === documentSignature) {
    return {
      ok: true as const,
      profile,
    };
  }

  return {
    ok: false as const,
    profile,
    message:
      "Daily Pass allows only 1 uploaded study document across the workspace. Reuse the same document or upgrade for multiple uploads.",
  };
}

export async function getOrCreateUserProfile(input: AppUserInput) {
  const firestore = getAdminFirestore();

  if (firestore) {
    const ref = firestore.collection("users").doc(input.id);
    const snapshot = await ref.get();

    if (!snapshot.exists) {
      const profile = createDefaultUserProfile(input);
      await ref.set(profile);
      return profile;
    }

    const profile = normalizeUserProfile(snapshot.data() as UserProfile, input);
    await ref.set(
      {
        name: profile.name,
        image: profile.image,
        updatedAt: nowIso(),
      },
      { merge: true },
    );
    return profile;
  }

  const store = await readLocalStore();
  const existing = store.users[input.id];

  if (!existing) {
    const profile = createDefaultUserProfile(input);
    store.users[input.id] = profile;
    await writeLocalStore(store);
    return profile;
  }

  const normalized = normalizeUserProfile(existing, input);
  store.users[input.id] = {
    ...normalized,
    updatedAt: nowIso(),
  };
  await writeLocalStore(store);
  return store.users[input.id];
}

export async function getUserProfile(userId: string) {
  const firestore = getAdminFirestore();

  if (firestore) {
    const snapshot = await firestore.collection("users").doc(userId).get();
    if (!snapshot.exists) {
      return null;
    }

    const profile = snapshot.data() as UserProfile;
    return normalizeUserProfile(profile, {
      id: profile.id,
      email: profile.email,
      name: profile.name,
      image: profile.image,
    });
  }

  const store = await readLocalStore();
  const profile = store.users[userId];

  if (!profile) {
    return null;
  }

  return normalizeUserProfile(profile, {
    id: profile.id,
    email: profile.email,
    name: profile.name,
    image: profile.image,
  });
}

export async function findUserProfileByEmail(email: string) {
  const normalizedEmail = email.trim().toLowerCase();

  if (!normalizedEmail) {
    return null;
  }

  const firestore = getAdminFirestore();

  if (firestore) {
    const snapshot = await firestore
      .collection("users")
      .where("email", "==", normalizedEmail)
      .limit(1)
      .get();

    if (snapshot.empty) {
      return null;
    }

    const profile = snapshot.docs[0].data() as UserProfile;
    return normalizeUserProfile(profile, {
      id: profile.id,
      email: profile.email,
      name: profile.name,
      image: profile.image,
    });
  }

  const store = await readLocalStore();
  const profile =
    Object.values(store.users).find((entry) => entry.email.trim().toLowerCase() === normalizedEmail) ||
    null;

  if (!profile) {
    return null;
  }

  return normalizeUserProfile(profile, {
    id: profile.id,
    email: profile.email,
    name: profile.name,
    image: profile.image,
  });
}

export async function consumeAgentTurn(userId: string) {
  const profile = await getUserProfile(userId);

  if (!profile) {
    throw new Error("User profile not found.");
  }

  if (hasActiveSubscription(profile)) {
    return profile;
  }

  if (profile.freeTurnsUsed >= FREE_TURN_LIMIT) {
    return profile;
  }

  const nextProfile = {
    ...profile,
    freeTurnsUsed: profile.freeTurnsUsed + 1,
    updatedAt: nowIso(),
  };

  const firestore = getAdminFirestore();

  if (firestore) {
    await firestore.collection("users").doc(userId).set(nextProfile, { merge: true });
    return nextProfile;
  }

  const store = await readLocalStore();
  store.users[userId] = nextProfile;
  await writeLocalStore(store);
  return nextProfile;
}

export async function savePracticeReport(input: Omit<PracticeReport, "id" | "createdAt">) {
  const report: PracticeReport = {
    ...input,
    id: randomUUID(),
    createdAt: nowIso(),
  };

  const profile = await getUserProfile(input.userId);

  if (!profile) {
    throw new Error("User profile not found.");
  }

  const nextStrengthSignals = incrementSignalMap(profile.strengthSignals, input.subject, input.strengths);
  const nextWeaknessSignals = incrementSignalMap(profile.weaknessSignals, input.subject, input.weaknesses);
  const nextProfile: UserProfile = {
    ...profile,
    strengthSignals: nextStrengthSignals,
    weaknessSignals: nextWeaknessSignals,
    strengths: getTopSignals(nextStrengthSignals),
    weaknesses: getTopSignals(nextWeaknessSignals),
    updatedAt: nowIso(),
  };

  const firestore = getAdminFirestore();

  if (firestore) {
    const batch = firestore.batch();
    batch.set(firestore.collection("reports").doc(report.id), report);
    batch.set(firestore.collection("users").doc(input.userId), nextProfile, { merge: true });
    await batch.commit();
    return report;
  }

  const store = await readLocalStore();
  store.reports[report.id] = report;
  store.users[input.userId] = nextProfile;
  await writeLocalStore(store);
  return report;
}

export async function listRecentReports(userId: string, limit = 8) {
  const firestore = getAdminFirestore();

  if (firestore) {
    const snapshot = await firestore
      .collection("reports")
      .where("userId", "==", userId)
      .orderBy("createdAt", "desc")
      .limit(limit)
      .get();

    return snapshot.docs.map((document) => document.data() as PracticeReport);
  }

  const store = await readLocalStore();
  return Object.values(store.reports)
    .filter((report) => report.userId === userId)
    .sort((left, right) => right.createdAt.localeCompare(left.createdAt))
    .slice(0, limit);
}

export async function getPersonalizationSnapshot(userId: string, subject: string) {
  const profile = await getUserProfile(userId);

  if (!profile) {
    return {
      strengths: [] as string[],
      weaknesses: [] as string[],
      reportSummaries: [] as string[],
    };
  }

  const reports = await listRecentReports(userId, 5);

  return {
    strengths: getTopSignals(profile.strengthSignals, subject),
    weaknesses: getTopSignals(profile.weaknessSignals, subject),
    reportSummaries: reports
      .filter((report) => !subject || report.subject === subject)
      .slice(0, 3)
      .map(
        (report) =>
          `${report.mode.toUpperCase()} | ${report.subject} | ${report.topic || "General focus"} | ${report.score} | ${report.verdict}`,
      ),
  };
}

export async function saveSessionFeedback(input: Omit<SessionFeedback, "id" | "createdAt">) {
  const entry: SessionFeedback = {
    ...input,
    id: randomUUID(),
    createdAt: nowIso(),
  };

  const profile = await getUserProfile(input.userId);

  if (!profile) {
    throw new Error("User profile not found.");
  }

  const feedbackCount = profile.feedbackCount + 1;
  const averageRating =
    (profile.averageRating * profile.feedbackCount + input.rating) / feedbackCount;
  const nextProfile: UserProfile = {
    ...profile,
    feedbackCount,
    averageRating: Number(averageRating.toFixed(2)),
    updatedAt: nowIso(),
  };

  const firestore = getAdminFirestore();

  if (firestore) {
    const batch = firestore.batch();
    batch.set(firestore.collection("feedback").doc(entry.id), entry);
    batch.set(firestore.collection("users").doc(input.userId), nextProfile, { merge: true });
    await batch.commit();
    return entry;
  }

  const store = await readLocalStore();
  store.feedback[entry.id] = entry;
  store.users[input.userId] = nextProfile;
  await writeLocalStore(store);
  return entry;
}

export async function listRecentFeedbackForUser(userId: string, limit = 8) {
  const firestore = getAdminFirestore();

  if (firestore) {
    const snapshot = await firestore
      .collection("feedback")
      .where("userId", "==", userId)
      .orderBy("createdAt", "desc")
      .limit(limit)
      .get();

    return snapshot.docs.map((document) => document.data() as SessionFeedback);
  }

  const store = await readLocalStore();
  return Object.values(store.feedback)
    .filter((entry) => entry.userId === userId)
    .sort((left, right) => right.createdAt.localeCompare(left.createdAt))
    .slice(0, limit);
}

export async function createPendingBillingRecord(
  input: Omit<
    BillingRecord,
    | "id"
    | "createdAt"
    | "paymentId"
    | "status"
    | "refundedAmountPaise"
    | "refundStatus"
    | "lastRefundAt"
  >,
) {
  const record: BillingRecord = {
    ...input,
    id: randomUUID(),
    paymentId: "",
    status: "pending",
    refundedAmountPaise: 0,
    refundStatus: "none",
    createdAt: nowIso(),
    lastRefundAt: "",
  };

  const firestore = getAdminFirestore();

  if (firestore) {
    await firestore.collection("billing").doc(record.id).set(record);
    return record;
  }

  const store = await readLocalStore();
  store.billing[record.id] = record;
  await writeLocalStore(store);
  return record;
}

export async function getBillingRecordByOrderId(orderId: string) {
  const firestore = getAdminFirestore();

  if (firestore) {
    const snapshot = await firestore
      .collection("billing")
      .where("orderId", "==", orderId)
      .limit(1)
      .get();

    if (snapshot.empty) {
      return null;
    }

    return snapshot.docs[0].data() as BillingRecord;
  }

  const store = await readLocalStore();
  return Object.values(store.billing).find((entry) => entry.orderId === orderId) || null;
}

export async function getBillingRecordByPaymentId(paymentId: string) {
  const firestore = getAdminFirestore();

  if (firestore) {
    const snapshot = await firestore
      .collection("billing")
      .where("paymentId", "==", paymentId)
      .limit(1)
      .get();

    if (snapshot.empty) {
      return null;
    }

    return snapshot.docs[0].data() as BillingRecord;
  }

  const store = await readLocalStore();
  return Object.values(store.billing).find((entry) => entry.paymentId === paymentId) || null;
}

export async function listBillingRecordsForUser(userId: string, limit = 10) {
  const firestore = getAdminFirestore();

  if (firestore) {
    const snapshot = await firestore
      .collection("billing")
      .where("userId", "==", userId)
      .orderBy("createdAt", "desc")
      .limit(limit)
      .get();

    return snapshot.docs.map((document) => document.data() as BillingRecord);
  }

  const store = await readLocalStore();
  return Object.values(store.billing)
    .filter((entry) => entry.userId === userId)
    .sort((left, right) => right.createdAt.localeCompare(left.createdAt))
    .slice(0, limit);
}

export async function updateBillingRecordByOrderId(input: {
  orderId: string;
  paymentId?: string;
  status: BillingRecord["status"];
  amountPaise?: number;
  expiresAt?: string;
  refundedAmountPaise?: number;
  refundStatus?: BillingRecord["refundStatus"];
  lastRefundAt?: string;
}) {
  const firestore = getAdminFirestore();

  if (firestore) {
    const snapshot = await firestore
      .collection("billing")
      .where("orderId", "==", input.orderId)
      .limit(1)
      .get();

    if (snapshot.empty) {
      return null;
    }

    const ref = snapshot.docs[0].ref;
    await ref.set(
      {
        paymentId: input.paymentId ?? snapshot.docs[0].data().paymentId ?? "",
        status: input.status,
        ...(typeof input.amountPaise === "number" ? { amountPaise: input.amountPaise } : {}),
        ...(input.expiresAt ? { expiresAt: input.expiresAt } : {}),
        ...(typeof input.refundedAmountPaise === "number"
          ? { refundedAmountPaise: input.refundedAmountPaise }
          : {}),
        ...(input.refundStatus ? { refundStatus: input.refundStatus } : {}),
        ...(input.lastRefundAt ? { lastRefundAt: input.lastRefundAt } : {}),
      },
      { merge: true },
    );

    const updated = await ref.get();
    return updated.data() as BillingRecord;
  }

  const store = await readLocalStore();
  const record = Object.values(store.billing).find((entry) => entry.orderId === input.orderId);

  if (!record) {
    return null;
  }

  store.billing[record.id] = {
    ...record,
    paymentId: input.paymentId ?? record.paymentId,
    status: input.status,
    amountPaise: typeof input.amountPaise === "number" ? input.amountPaise : record.amountPaise,
    expiresAt: input.expiresAt || record.expiresAt,
    refundedAmountPaise:
      typeof input.refundedAmountPaise === "number"
        ? input.refundedAmountPaise
        : record.refundedAmountPaise,
    refundStatus: input.refundStatus || record.refundStatus,
    lastRefundAt: input.lastRefundAt || record.lastRefundAt,
  };
  await writeLocalStore(store);
  return store.billing[record.id];
}

export async function findRecentPendingBillingForUserByAmount(input: {
  userId: string;
  amountPaise: number;
  withinMinutes?: number;
}) {
  const withinMinutes = input.withinMinutes ?? 60;
  const cutoff = Date.now() - withinMinutes * 60 * 1000;
  const records = await listBillingRecordsForUser(input.userId, 20);

  return (
    records.find(
      (record) =>
        record.status === "pending" &&
        record.amountPaise === input.amountPaise &&
        new Date(record.createdAt).getTime() >= cutoff,
    ) || null
  );
}

export async function getRefundRecordByRefundId(refundId: string) {
  const firestore = getAdminFirestore();

  if (firestore) {
    const snapshot = await firestore.collection("refunds").doc(refundId).get();
    return snapshot.exists ? (snapshot.data() as RefundRecord) : null;
  }

  const store = await readLocalStore();
  return store.refunds[refundId] || null;
}

export async function listRefundRecordsForUser(userId: string, limit = 10) {
  const firestore = getAdminFirestore();

  if (firestore) {
    const snapshot = await firestore
      .collection("refunds")
      .where("userId", "==", userId)
      .orderBy("updatedAt", "desc")
      .limit(limit)
      .get();

    return snapshot.docs.map((document) => document.data() as RefundRecord);
  }

  const store = await readLocalStore();
  return Object.values(store.refunds)
    .filter((entry) => entry.userId === userId)
    .sort((left, right) => right.updatedAt.localeCompare(left.updatedAt))
    .slice(0, limit);
}

export async function upsertRefundRecord(input: {
  refundId: string;
  userId: string;
  planId: PlanId;
  orderId: string;
  paymentId: string;
  amountPaise: number;
  currency: string;
  status: RefundRecord["status"];
  speedRequested?: string;
  speedProcessed?: string;
  receipt?: string;
  reason?: string;
  notes?: Record<string, string>;
  initiatedByUserId?: string;
  initiatedByEmail?: string;
  createdAt?: string;
}) {
  const existing = await getRefundRecordByRefundId(input.refundId);
  const refund: RefundRecord = {
    id: input.refundId,
    refundId: input.refundId,
    userId: input.userId,
    planId: input.planId,
    orderId: input.orderId,
    paymentId: input.paymentId,
    amountPaise: input.amountPaise,
    currency: input.currency || "INR",
    status: input.status,
    speedRequested: input.speedRequested || existing?.speedRequested || "",
    speedProcessed: input.speedProcessed || existing?.speedProcessed || "",
    receipt: input.receipt || existing?.receipt || "",
    reason: input.reason || existing?.reason || "",
    notes: input.notes || existing?.notes || {},
    initiatedByUserId: input.initiatedByUserId || existing?.initiatedByUserId || "",
    initiatedByEmail: input.initiatedByEmail || existing?.initiatedByEmail || "",
    createdAt: input.createdAt || existing?.createdAt || nowIso(),
    updatedAt: nowIso(),
  };

  const firestore = getAdminFirestore();

  if (firestore) {
    await firestore.collection("refunds").doc(refund.refundId).set(refund, { merge: true });
    return refund;
  }

  const store = await readLocalStore();
  store.refunds[refund.refundId] = refund;
  await writeLocalStore(store);
  return refund;
}

export async function syncRefundStateForOrder(input: {
  orderId: string;
  userId?: string;
  paymentId?: string;
  amountPaise: number;
  refundedAmountPaise: number;
  refundRecordedAt?: string;
}) {
  const billing = await getBillingRecordByOrderId(input.orderId);
  const userId = billing?.userId || input.userId || "";
  const amountPaise = billing?.amountPaise || input.amountPaise;
  const refundState = getBillingRefundState(amountPaise, input.refundedAmountPaise);
  const refundRecordedAt = input.refundRecordedAt || nowIso();
  let updatedBilling = billing;

  if (billing) {
    updatedBilling = await updateBillingRecordByOrderId({
      orderId: input.orderId,
      paymentId: input.paymentId || billing.paymentId,
      status: refundState.status,
      amountPaise,
      refundedAmountPaise: input.refundedAmountPaise,
      refundStatus: refundState.refundStatus,
      lastRefundAt: refundRecordedAt,
    });
  }

  if (!userId) {
    return {
      billing: updatedBilling,
      profile: null,
      deactivated: false,
    };
  }

  const profile = await getUserProfile(userId);

  if (!profile) {
    return {
      billing: updatedBilling,
      profile: null,
      deactivated: false,
    };
  }

  const shouldDeactivate =
    refundState.refundStatus === "full" && profile.subscriptionOrderId === input.orderId;

  if (!shouldDeactivate) {
    return {
      billing: updatedBilling,
      profile,
      deactivated: false,
    };
  }

  const nextProfile: UserProfile = {
    ...profile,
    plan: "free",
    subscriptionStatus: "inactive",
    subscriptionExpiresAt: getDefaultExpiry(),
    subscriptionOrderId: "",
    subscriptionPaymentId: "",
    dayPassUsage: defaultDayPassUsage(),
    updatedAt: nowIso(),
  };
  const firestore = getAdminFirestore();

  if (firestore) {
    await firestore.collection("users").doc(userId).set(nextProfile, { merge: true });
    return {
      billing: updatedBilling,
      profile: nextProfile,
      deactivated: true,
    };
  }

  const store = await readLocalStore();
  store.users[userId] = nextProfile;
  await writeLocalStore(store);
  return {
    billing: updatedBilling,
    profile: nextProfile,
    deactivated: true,
  };
}

export async function activatePlanForUser(input: {
  userId: string;
  planId: PlanId;
  orderId: string;
  paymentId: string;
  amountPaise: number;
}) {
  const profile = await getUserProfile(input.userId);

  if (!profile) {
    throw new Error("User profile not found.");
  }

  const durationDays =
    input.planId === "day" ? 1 : input.planId === "month" ? 30 : input.planId === "year" ? 365 : 0;
  const now = new Date();
  const expiresAt = durationDays ? addDays(now, durationDays).toISOString() : getDefaultExpiry();
  const nextProfile: UserProfile = {
    ...profile,
    plan: input.planId,
    subscriptionStatus: input.planId === "free" ? "inactive" : "active",
    subscriptionExpiresAt: expiresAt,
    subscriptionOrderId: input.planId === "free" ? "" : input.orderId,
    subscriptionPaymentId: input.planId === "free" ? "" : input.paymentId,
    dayPassUsage: defaultDayPassUsage(),
    updatedAt: nowIso(),
  };

  const firestore = getAdminFirestore();

  if (firestore) {
    const billingSnapshot = await firestore
      .collection("billing")
      .where("orderId", "==", input.orderId)
      .limit(1)
      .get();

    const batch = firestore.batch();
    batch.set(firestore.collection("users").doc(input.userId), nextProfile, { merge: true });

    if (!billingSnapshot.empty) {
      batch.set(
        billingSnapshot.docs[0].ref,
        {
          paymentId: input.paymentId,
          status: "paid",
          expiresAt,
          amountPaise: input.amountPaise,
          refundedAmountPaise: 0,
          refundStatus: "none",
          lastRefundAt: "",
        },
        { merge: true },
      );
    } else {
      const billingId = randomUUID();
      batch.set(firestore.collection("billing").doc(billingId), {
        id: billingId,
        userId: input.userId,
        planId: input.planId,
        orderId: input.orderId,
        paymentId: input.paymentId,
        status: "paid",
        amountPaise: input.amountPaise,
        refundedAmountPaise: 0,
        refundStatus: "none",
        currency: "INR",
        createdAt: nowIso(),
        expiresAt,
        lastRefundAt: "",
      });
    }

    await batch.commit();
    return nextProfile;
  }

  const store = await readLocalStore();
  const billing = Object.values(store.billing).find((entry) => entry.orderId === input.orderId);

  if (billing) {
    store.billing[billing.id] = {
      ...billing,
      paymentId: input.paymentId,
      status: "paid",
      amountPaise: input.amountPaise,
      refundedAmountPaise: 0,
      refundStatus: "none",
      expiresAt,
      lastRefundAt: "",
    };
  } else {
    const billingId = randomUUID();
    store.billing[billingId] = {
      id: billingId,
      userId: input.userId,
      planId: input.planId,
      orderId: input.orderId,
      paymentId: input.paymentId,
      status: "paid",
      amountPaise: input.amountPaise,
      refundedAmountPaise: 0,
      refundStatus: "none",
      currency: "INR",
      createdAt: nowIso(),
      expiresAt,
      lastRefundAt: "",
    };
  }

  store.users[input.userId] = nextProfile;
  await writeLocalStore(store);
  return nextProfile;
}
