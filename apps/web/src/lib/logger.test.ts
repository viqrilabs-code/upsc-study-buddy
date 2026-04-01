import { afterEach, describe, expect, it, vi } from "vitest";
import { createRequestLogger, logError, logInfo, logWarn } from "@/lib/logger";

describe("logger", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("writes structured info logs", () => {
    const spy = vi.spyOn(console, "info").mockImplementation(() => undefined);

    logInfo("test.info", {
      route: "api/test",
      requestId: "req-1",
      count: 3,
    });

    expect(spy).toHaveBeenCalledTimes(1);
    const payload = JSON.parse(spy.mock.calls[0][0] as string) as Record<string, unknown>;
    expect(payload.event).toBe("test.info");
    expect(payload.route).toBe("api/test");
    expect(payload.requestId).toBe("req-1");
    expect(payload.count).toBe(3);
    expect(payload.severity).toBe("INFO");
  });

  it("writes structured warn and error logs", () => {
    const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => undefined);
    const errorSpy = vi.spyOn(console, "error").mockImplementation(() => undefined);

    logWarn("test.warn", { requestId: "req-2" });
    logError("test.error", new Error("boom"), { requestId: "req-3" });

    const warnPayload = JSON.parse(warnSpy.mock.calls[0][0] as string) as Record<string, unknown>;
    const errorPayload = JSON.parse(errorSpy.mock.calls[0][0] as string) as Record<string, unknown>;

    expect(warnPayload.severity).toBe("WARN");
    expect(errorPayload.severity).toBe("ERROR");
    expect((errorPayload.error as Record<string, unknown>).message).toBe("boom");
  });

  it("creates request-scoped logs with route metadata", () => {
    const spy = vi.spyOn(console, "info").mockImplementation(() => undefined);
    const request = new Request("https://tamgam.test/api/contact", {
      method: "POST",
      headers: {
        "x-request-id": "trace-123",
      },
    });

    const logger = createRequestLogger("api/contact", request);
    logger.info("contact.received", { topic: "support" });

    const payload = JSON.parse(spy.mock.calls[0][0] as string) as Record<string, unknown>;
    expect(payload.route).toBe("api/contact");
    expect(payload.path).toBe("/api/contact");
    expect(payload.method).toBe("POST");
    expect(payload.requestId).toBe("trace-123");
    expect(payload.topic).toBe("support");
  });
});
