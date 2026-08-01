import { describe, expect, it } from "vitest";
import { RECENT_AFTER_HOURS, STALE_AFTER_HOURS, stationFreshness } from "./stationFreshness";

describe("stationFreshness", () => {
  const now = new Date("2026-07-30T12:00:00Z");

  it("marks recent data under the recent threshold", () => {
    expect(stationFreshness("2026-07-30T09:00:00Z", now).status).toBe("recent");
  });

  it("marks data between recent and stale thresholds as aging", () => {
    const freshness = stationFreshness("2026-07-29T20:00:00Z", now);

    expect(freshness.status).toBe("aging");
    expect(freshness.ageHours).toBeGreaterThan(RECENT_AFTER_HOURS);
    expect(freshness.ageHours).toBeLessThan(STALE_AFTER_HOURS);
    expect(freshness.label).toContain("16 h");
  });

  it("marks stale data at the stale threshold or older", () => {
    const freshness = stationFreshness("2026-07-28T12:00:00Z", now);

    expect(freshness.status).toBe("stale");
    expect(freshness.label).toContain("2 dias");
  });

  it("marks unknown or invalid dates", () => {
    expect(stationFreshness(null, now).status).toBe("unknown");
    expect(stationFreshness("invalid", now).status).toBe("unknown");
  });
});
