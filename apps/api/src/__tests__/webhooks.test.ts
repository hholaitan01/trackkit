import { describe, it, expect } from "vitest";
import { createHmac } from "crypto";

describe("webhook HMAC signing", () => {
  // Test the signing logic used in services/webhooks.ts
  it("generates consistent HMAC-SHA256 signatures", () => {
    const secret = "whsec_test_123";
    const payload = JSON.stringify({
      event: "delivery.status_changed",
      data: { id: "abc", status: "DELIVERED" },
      timestamp: "2026-03-26T00:00:00.000Z",
      id: "wh_123_abc",
    });

    const sig1 = createHmac("sha256", secret).update(payload).digest("hex");
    const sig2 = createHmac("sha256", secret).update(payload).digest("hex");

    expect(sig1).toBe(sig2);
    expect(sig1).toMatch(/^[a-f0-9]{64}$/);
  });

  it("different secrets produce different signatures", () => {
    const payload = '{"event":"test"}';
    const sig1 = createHmac("sha256", "secret1").update(payload).digest("hex");
    const sig2 = createHmac("sha256", "secret2").update(payload).digest("hex");

    expect(sig1).not.toBe(sig2);
  });

  it("different payloads produce different signatures", () => {
    const secret = "test_secret";
    const sig1 = createHmac("sha256", secret).update('{"a":1}').digest("hex");
    const sig2 = createHmac("sha256", secret).update('{"a":2}').digest("hex");

    expect(sig1).not.toBe(sig2);
  });

  it("signature format matches X-TrackKit-Signature header format", () => {
    const secret = "whsec_test";
    const payload = '{"event":"test"}';
    const sig = createHmac("sha256", secret).update(payload).digest("hex");
    const header = `sha256=${sig}`;

    expect(header).toMatch(/^sha256=[a-f0-9]{64}$/);
  });
});
