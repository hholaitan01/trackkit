import { describe, it, expect } from "vitest";
import { estimateETA } from "../services/routing";

describe("estimateETA", () => {
  it("returns zero distance and 0 minutes for same coordinates", () => {
    const result = estimateETA(
      { lat: 6.5244, lng: 3.3792 },
      { lat: 6.5244, lng: 3.3792 }
    );
    expect(result.distanceKm).toBe(0);
    expect(result.etaMinutes).toBe(0);
  });

  it("calculates correct distance for Yaba to Victoria Island (~8km)", () => {
    const result = estimateETA(
      { lat: 6.5158, lng: 3.3750 }, // Yaba
      { lat: 6.4281, lng: 3.4219 }  // Victoria Island
    );
    // Haversine distance should be roughly 10-11km
    expect(result.distanceKm).toBeGreaterThan(8);
    expect(result.distanceKm).toBeLessThan(15);
    expect(result.etaMinutes).toBeGreaterThan(0);
  });

  it("uses custom average speed", () => {
    const slow = estimateETA(
      { lat: 6.5158, lng: 3.3750 },
      { lat: 6.4281, lng: 3.4219 },
      15 // 15 km/h (traffic jam)
    );
    const fast = estimateETA(
      { lat: 6.5158, lng: 3.3750 },
      { lat: 6.4281, lng: 3.4219 },
      60 // 60 km/h (highway)
    );
    // Slower speed = higher ETA
    expect(slow.etaMinutes).toBeGreaterThan(fast.etaMinutes);
    // Distance should be the same regardless of speed
    expect(slow.distanceKm).toBe(fast.distanceKm);
  });

  it("returns rounded distance to 1 decimal place", () => {
    const result = estimateETA(
      { lat: 6.5158, lng: 3.3750 },
      { lat: 6.4281, lng: 3.4219 }
    );
    const decimalPart = result.distanceKm.toString().split(".")[1] || "";
    expect(decimalPart.length).toBeLessThanOrEqual(1);
  });

  it("returns ceiled ETA in minutes", () => {
    const result = estimateETA(
      { lat: 6.5158, lng: 3.3750 },
      { lat: 6.4281, lng: 3.4219 }
    );
    expect(Number.isInteger(result.etaMinutes)).toBe(true);
  });

  it("handles large distances (Lagos to Abuja ~530km)", () => {
    const result = estimateETA(
      { lat: 6.5244, lng: 3.3792 },  // Lagos
      { lat: 9.0579, lng: 7.4951 }   // Abuja
    );
    expect(result.distanceKm).toBeGreaterThan(400);
    expect(result.distanceKm).toBeLessThan(700);
  });

  it("handles negative coordinates", () => {
    const result = estimateETA(
      { lat: -1.2921, lng: 36.8219 }, // Nairobi
      { lat: -6.7924, lng: 39.2083 }  // Dar es Salaam
    );
    expect(result.distanceKm).toBeGreaterThan(0);
    expect(result.etaMinutes).toBeGreaterThan(0);
  });
});
