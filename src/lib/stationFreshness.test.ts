import { describe, expect, it } from "vitest";
import { stationFreshness } from "./stationFreshness";

describe("stationFreshness", () => {
  const now = new Date("2026-07-30T12:00:00Z");

  it("marks recent data under 24 hours", () => {
    expect(stationFreshness("2026-07-30T03:00:00Z", now).status).toBe("recent");
  });

  it("marks stale data at 24 hours or older", () => {
    const freshness = stationFreshness("2026-07-28T12:00:00Z", now);

    expect(freshness.status).toBe("stale");
    expect(freshness.label).toContain("2 dias");
  });

  it("marks unknown or invalid dates", () => {
    expect(stationFreshness(null, now).status).toBe("unknown");
    expect(stationFreshness("invalid", now).status).toBe("unknown");
  });
});
