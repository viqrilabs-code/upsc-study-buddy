import { afterEach, describe, expect, it, vi } from "vitest";
import { POST } from "@/app/api/contact/route";

describe("contact route", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("rejects incomplete payloads", async () => {
    const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => undefined);
    const request = new Request("http://localhost/api/contact", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-request-id": "contact-test-1",
      },
      body: JSON.stringify({
        name: "Amit",
        email: "",
        topic: "support",
        message: "",
      }),
    });

    const response = await POST(request);
    const body = (await response.json()) as { message: string };

    expect(response.status).toBe(400);
    expect(body.message).toContain("complete every field");
    expect(warnSpy).toHaveBeenCalledTimes(1);
    expect(warnSpy.mock.calls[0][0]).toContain("contact.submit.rejected");
  });

  it("accepts a valid message and logs it", async () => {
    const infoSpy = vi.spyOn(console, "info").mockImplementation(() => undefined);
    const request = new Request("http://localhost/api/contact", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-request-id": "contact-test-2",
      },
      body: JSON.stringify({
        name: "Amit Gupta",
        email: "amit@example.com",
        topic: "support",
        message: "I need help with payment reconciliation on my TamGam account.",
      }),
    });

    const response = await POST(request);
    const body = (await response.json()) as { message: string };

    expect(response.status).toBe(200);
    expect(body.message).toContain("Thanks for reaching out");
    expect(infoSpy).toHaveBeenCalled();
    expect(infoSpy.mock.calls.at(-1)?.[0]).toContain("contact.submit.accepted");
  });
});
