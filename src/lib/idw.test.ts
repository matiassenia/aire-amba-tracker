import { describe, expect, it } from "vitest";
import { aqiToIntensity, buildDenseGrid, idwEstimate, type Sample } from "./idw";

describe("idwEstimate", () => {
  const samples: Sample[] = [
    { lat: -34.6, lon: -58.4, value: 40 },
    { lat: -34.61, lon: -58.41, value: 60 },
    { lat: -34.62, lon: -58.42, value: 80 },
  ];

  it("returns the exact nearby sample when the target is almost identical", () => {
    expect(idwEstimate({ lat: -34.6, lon: -58.4 }, samples)).toBe(40);
  });

  it("returns a weighted value for enough nearby samples", () => {
    const value = idwEstimate({ lat: -34.605, lon: -58.405 }, samples, {
      minPoints: 2,
      maxDistKm: 5,
    });

    expect(value).not.toBeNull();
    expect(value).toBeGreaterThan(40);
    expect(value).toBeLessThan(80);
  });

  it("returns null when there are not enough samples inside max distance", () => {
    const value = idwEstimate({ lat: -35.2, lon: -59.2 }, samples, {
      minPoints: 2,
      maxDistKm: 5,
    });

    expect(value).toBeNull();
  });
});

describe("buildDenseGrid", () => {
  it("builds an inclusive lat/lon grid", () => {
    expect(
      buildDenseGrid(
        { south: 0, west: 0, north: 0.1, east: 0.1 },
        { stepLat: 0.1, stepLon: 0.1 }
      )
    ).toEqual([
      { lat: 0, lon: 0 },
      { lat: 0, lon: 0.1 },
      { lat: 0.1, lon: 0 },
      { lat: 0.1, lon: 0.1 },
    ]);
  });
});

describe("aqiToIntensity", () => {
  it("clamps AQI values into a normalized intensity range", () => {
    expect(aqiToIntensity(-10)).toBe(0);
    expect(aqiToIntensity(999)).toBe(1);
    expect(aqiToIntensity(100)).toBeGreaterThan(0);
    expect(aqiToIntensity(100)).toBeLessThan(1);
  });
});
