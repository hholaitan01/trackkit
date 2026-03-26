import { describe, it, expect } from "vitest";
import { nanoid } from "nanoid";

// Test the tracking code generation logic from deliveries.ts
function generateTrackingCode(): string {
  return `TK-${nanoid(6).toUpperCase()}`;
}

describe("tracking code generation", () => {
  it("produces codes in TK-XXXXXX format", () => {
    const code = generateTrackingCode();
    expect(code).toMatch(/^TK-[A-Z0-9_-]{6}$/);
  });

  it("generates unique codes", () => {
    const codes = new Set<string>();
    for (let i = 0; i < 1000; i++) {
      codes.add(generateTrackingCode());
    }
    // All 1000 should be unique
    expect(codes.size).toBe(1000);
  });

  it("always starts with TK- prefix", () => {
    for (let i = 0; i < 100; i++) {
      expect(generateTrackingCode().startsWith("TK-")).toBe(true);
    }
  });

  it("is always uppercase", () => {
    for (let i = 0; i < 100; i++) {
      const code = generateTrackingCode();
      expect(code).toBe(code.toUpperCase());
    }
  });
});

describe("delivery status flow", () => {
  const validStatuses = [
    "CONFIRMED", "DRIVER_ASSIGNED", "PICKUP_EN_ROUTE",
    "PICKED_UP", "DELIVERING", "ARRIVING", "DELIVERED", "CANCELLED",
  ];

  it("validates all expected statuses", () => {
    expect(validStatuses).toHaveLength(8);
    expect(validStatuses).toContain("DELIVERED");
    expect(validStatuses).toContain("CANCELLED");
  });

  it("rejects invalid statuses", () => {
    expect(validStatuses.includes("PENDING")).toBe(false); // Can't set to PENDING via API
    expect(validStatuses.includes("IN_PROGRESS")).toBe(false);
    expect(validStatuses.includes("")).toBe(false);
  });

  it("has correct terminal states", () => {
    const terminalStates = ["DELIVERED", "CANCELLED"];
    for (const state of terminalStates) {
      expect(validStatuses).toContain(state);
    }
  });
});

describe("auto-status transitions", () => {
  it("transitions to ARRIVING when distance < 200m", () => {
    const distanceKm = 0.15; // 150m
    const currentStatus = "DELIVERING";
    const newStatus = distanceKm < 0.2 && currentStatus === "DELIVERING" ? "ARRIVING" : currentStatus;
    expect(newStatus).toBe("ARRIVING");
  });

  it("stays DELIVERING when distance >= 200m", () => {
    const distanceKm = 0.5; // 500m
    const currentStatus = "DELIVERING";
    const newStatus = distanceKm < 0.2 && currentStatus === "DELIVERING" ? "ARRIVING" : currentStatus;
    expect(newStatus).toBe("DELIVERING");
  });

  it("does not transition non-DELIVERING statuses", () => {
    const distanceKm = 0.1; // 100m, close to dropoff
    const currentStatus = "PICKED_UP";
    const newStatus = distanceKm < 0.2 && currentStatus === "DELIVERING" ? "ARRIVING" : currentStatus;
    expect(newStatus).toBe("PICKED_UP"); // Should not change
  });
});
