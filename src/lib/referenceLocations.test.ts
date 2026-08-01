import { describe, expect, it } from "vitest";
import { coverageBandForDistance } from "./coverage";
import { REFERENCE_LOCATIONS } from "./referenceLocations";

describe("referenceLocations", () => {
  it("documents one reference per key AMBA and province point", () => {
    expect(REFERENCE_LOCATIONS.length).toBeGreaterThanOrEqual(8);
  });

  it("keeps the expected coverage band consistent with the distance policy", () => {
    for (const location of REFERENCE_LOCATIONS) {
      const band = coverageBandForDistance(location.expectedNearestDistanceKm);
      expect(band).toBe(location.expectedBand);
    }
  });

  it("exposes reference locations by id", () => {
    const caba = REFERENCE_LOCATIONS.find((location) => location.id === "caba-centro");
    expect(caba).toBeDefined();
    expect(caba!.lat).toBeCloseTo(-34.6037, 3);
  });
});
