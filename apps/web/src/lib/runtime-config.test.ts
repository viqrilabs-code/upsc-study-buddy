import { afterEach, describe, expect, it, vi } from "vitest";

async function loadRuntimeModules() {
  vi.resetModules();
  const runtime = await import("@/lib/runtime-config");
  const firestore = await import("@/lib/firestore-admin");
  return { runtime, firestore };
}

describe("runtime-config", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("allows local json fallback in development by default", async () => {
    vi.stubEnv("NODE_ENV", "development");
    vi.stubEnv("APP_ENV", "");

    const { runtime } = await loadRuntimeModules();

    expect(runtime.isProductionRuntime()).toBe(false);
    expect(runtime.isLocalJsonStoreAllowed()).toBe(true);
    expect(runtime.getLocalJsonStorePolicyLabel()).toBe("allowed");
  });

  it("blocks local json fallback in production unless explicitly enabled", async () => {
    vi.stubEnv("NODE_ENV", "production");
    vi.stubEnv("APP_ENV", "production");
    vi.stubEnv("ALLOW_LOCAL_JSON_STORE", "");

    const { runtime } = await loadRuntimeModules();

    expect(runtime.isProductionRuntime()).toBe(true);
    expect(runtime.isLocalJsonStoreAllowed()).toBe(false);
  });

  it("detects firestore init mode from service account envs", async () => {
    vi.stubEnv("FIREBASE_PROJECT_ID", "tamgam-prod");
    vi.stubEnv("FIREBASE_CLIENT_EMAIL", "firebase-adminsdk@test.iam.gserviceaccount.com");
    vi.stubEnv("FIREBASE_PRIVATE_KEY", "-----BEGIN PRIVATE KEY-----\\nabc\\n-----END PRIVATE KEY-----\\n");
    vi.stubEnv("GOOGLE_CLOUD_PROJECT", "");

    const { firestore } = await loadRuntimeModules();

    expect(firestore.hasFirestoreServiceAccountEnv()).toBe(true);
    expect(firestore.getFirestoreInitMode()).toBe("service-account");
    expect(firestore.isFirestoreConfigured()).toBe(true);
  });

  it("detects firestore init mode from application default credentials env", async () => {
    vi.stubEnv("FIREBASE_PROJECT_ID", "");
    vi.stubEnv("FIREBASE_CLIENT_EMAIL", "");
    vi.stubEnv("FIREBASE_PRIVATE_KEY", "");
    vi.stubEnv("GOOGLE_CLOUD_PROJECT", "tamgam-prod");

    const { firestore } = await loadRuntimeModules();

    expect(firestore.hasFirestoreServiceAccountEnv()).toBe(false);
    expect(firestore.getFirestoreInitMode()).toBe("application-default");
    expect(firestore.isFirestoreConfigured()).toBe(true);
  });
});
