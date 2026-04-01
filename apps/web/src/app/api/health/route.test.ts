import { afterEach, describe, expect, it, vi } from "vitest";

async function loadHealthRoute() {
  vi.resetModules();
  return import("@/app/api/health/route");
}

describe("health route", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
    vi.restoreAllMocks();
  });

  it("returns 200 in development with local json fallback", async () => {
    vi.stubEnv("NODE_ENV", "development");
    vi.stubEnv("APP_ENV", "development");
    vi.stubEnv("ALLOW_LOCAL_JSON_STORE", "true");
    vi.stubEnv("GOOGLE_CLOUD_PROJECT", "");
    vi.stubEnv("FIREBASE_PROJECT_ID", "");
    vi.stubEnv("FIREBASE_CLIENT_EMAIL", "");
    vi.stubEnv("FIREBASE_PRIVATE_KEY", "");

    const { GET } = await loadHealthRoute();
    const response = await GET(new Request("http://localhost/api/health"));
    const body = (await response.json()) as Record<string, unknown>;

    expect(response.status).toBe(200);
    expect(body.storageMode).toBe("local-json");
    expect(body.productionReady).toBe(true);
  });

  it("returns 503 in production when firestore is missing", async () => {
    const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => undefined);
    vi.stubEnv("NODE_ENV", "production");
    vi.stubEnv("APP_ENV", "production");
    vi.stubEnv("ALLOW_LOCAL_JSON_STORE", "");
    vi.stubEnv("GOOGLE_CLOUD_PROJECT", "");
    vi.stubEnv("FIREBASE_PROJECT_ID", "");
    vi.stubEnv("FIREBASE_CLIENT_EMAIL", "");
    vi.stubEnv("FIREBASE_PRIVATE_KEY", "");

    const { GET } = await loadHealthRoute();
    const response = await GET(new Request("http://localhost/api/health"));
    const body = (await response.json()) as Record<string, unknown>;

    expect(response.status).toBe(503);
    expect(body.storageMode).toBe("missing");
    expect(body.productionReady).toBe(false);
    expect(warnSpy).toHaveBeenCalledTimes(1);
  });

  it("returns 200 in production when application default firestore config is present", async () => {
    vi.stubEnv("NODE_ENV", "production");
    vi.stubEnv("APP_ENV", "production");
    vi.stubEnv("ALLOW_LOCAL_JSON_STORE", "");
    vi.stubEnv("GOOGLE_CLOUD_PROJECT", "tamgam-prod");
    vi.stubEnv("FIREBASE_PROJECT_ID", "");
    vi.stubEnv("FIREBASE_CLIENT_EMAIL", "");
    vi.stubEnv("FIREBASE_PRIVATE_KEY", "");

    const { GET } = await loadHealthRoute();
    const response = await GET(new Request("http://localhost/api/health"));
    const body = (await response.json()) as Record<string, unknown>;

    expect(response.status).toBe(200);
    expect(body.storageMode).toBe("firestore");
    expect(body.firestoreInitMode).toBe("application-default");
    expect(body.productionReady).toBe(true);
  });
});
