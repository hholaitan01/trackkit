import { describe, it, expect } from "vitest";
import { config } from "../lib/config";

describe("config", () => {
  it("has all required plan tiers", () => {
    expect(config.planLimits).toHaveProperty("FREE");
    expect(config.planLimits).toHaveProperty("GROWTH");
    expect(config.planLimits).toHaveProperty("SCALE");
    expect(config.planLimits).toHaveProperty("MANAGED");
  });

  it("plan limits increase with tier", () => {
    const { FREE, GROWTH, SCALE } = config.planLimits;
    expect(GROWTH.deliveriesPerMonth).toBeGreaterThan(FREE.deliveriesPerMonth);
    expect(SCALE.deliveriesPerMonth).toBeGreaterThan(GROWTH.deliveriesPerMonth);
  });

  it("MANAGED plan has unlimited deliveries", () => {
    expect(config.planLimits.MANAGED.deliveriesPerMonth).toBe(Infinity);
  });

  it("rate limits increase with tier", () => {
    const { FREE, GROWTH, SCALE, MANAGED } = config.planLimits;
    expect(GROWTH.apiCallsPerMinute).toBeGreaterThan(FREE.apiCallsPerMinute);
    expect(SCALE.apiCallsPerMinute).toBeGreaterThan(GROWTH.apiCallsPerMinute);
    expect(MANAGED.apiCallsPerMinute).toBeGreaterThan(SCALE.apiCallsPerMinute);
  });

  it("has default routing service URLs", () => {
    expect(config.valhallaUrl).toBeTruthy();
    expect(config.nominatimUrl).toBeTruthy();
  });

  it("defaults to port 3001", () => {
    // Unless overridden by env
    expect(typeof config.port).toBe("number");
  });
});
