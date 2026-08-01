import { describe, expect, it } from "vitest";
import type { Station } from "@/types/airQuality";
import {
  CONFIDENCE_HIGH_MAX_KM,
  CONFIDENCE_LOW_MAX_KM,
  CONFIDENCE_MEDIUM_MAX_KM,
  coverageConfidence,
  coverageConfidenceLabel,
  coverageConfidenceMessage,
  distanceKm,
  formatDistanceKm,
  isFresh,
  nearestStation,
  pointCoverage,
  stationCoverageInfo,
  stationsWithinRadius,
} from "./coverage";

function makeStation(
  uid: number,
  lat: number,
  lon: number,
  overrides: Partial<Station> = {},
): Station {
  return {
    uid,
    name: `Station ${uid}`,
    lat,
    lon,
    aqi: null,
    ...overrides,
  };
}

const NOW = new Date("2026-07-31T12:00:00Z");
const FRESH_ISO = "2026-07-31T10:00:00Z";
const STALE_ISO = "2026-07-25T10:00:00Z";

describe("distanceKm", () => {
  it("is zero for the same point", () => {
    expect(distanceKm(-34.6, -58.4, -34.6, -58.4)).toBe(0);
  });

  it("matches the known Buenos Aires-Cordoba distance", () => {
    const d = distanceKm(-34.6037, -58.3816, -31.4201, -64.1888);
    expect(d).toBeGreaterThan(630);
    expect(d).toBeLessThan(660);
  });
});

describe("nearestStation and stationsWithinRadius", () => {
  const stations = [
    makeStation(1, -34.6, -58.4, { name: "Centro" }),
    makeStation(2, -34.7, -58.5, { name: "Oeste" }),
    makeStation(3, -35.0, -58.6, { name: "Lejos" }),
  ];

  it("returns null with no stations", () => {
    expect(nearestStation(-34.6, -58.4, [])).toBeNull();
  });

  it("returns the closest station", () => {
    const nearest = nearestStation(-34.6, -58.4, stations);
    expect(nearest?.station.name).toBe("Centro");
    expect(nearest?.distanceKm).toBeLessThan(5);
  });

  it("filters stations within a radius", () => {
    const inside = stationsWithinRadius(-34.6, -58.4, stations, 20);
    expect(inside.map((s) => s.name).sort()).toEqual(["Centro", "Oeste"]);
  });
});

describe("San Miguel coverage scenario", () => {
  it("has no close station and reports low coverage with only CABA stations", () => {
    const cabaStations = [
      makeStation(1, -34.6345, -58.3631, { name: "La Boca", measured_at: FRESH_ISO, aqi: 68, data_available: true }),
      makeStation(2, -34.5996, -58.3905, { name: "Recoleta", measured_at: FRESH_ISO, aqi: 45, data_available: true }),
    ];

    const nearest = nearestStation(-34.537, -58.715, cabaStations);

    expect(nearest).not.toBeNull();
    expect(nearest!.distanceKm).toBeGreaterThan(CONFIDENCE_MEDIUM_MAX_KM);
    expect(nearest!.distanceKm).toBeLessThan(CONFIDENCE_LOW_MAX_KM);
    const confidence = coverageConfidence(nearest!.distanceKm, nearest!.station, NOW);
    expect(confidence).toBe("low");
  });
});

describe("coverageConfidence", () => {
  const fresh = makeStation(1, -34.6, -58.4, { measured_at: FRESH_ISO, aqi: 30, data_available: true });

  it("is high within 5 km with fresh data", () => {
    expect(coverageConfidence(3, fresh, NOW)).toBe("high");
    expect(coverageConfidence(CONFIDENCE_HIGH_MAX_KM, fresh, NOW)).toBe("medium");
  });

  it("is medium between 5 and 20 km", () => {
    expect(coverageConfidence(10, fresh, NOW)).toBe("medium");
    expect(coverageConfidence(CONFIDENCE_MEDIUM_MAX_KM, fresh, NOW)).toBe("low");
  });

  it("is low between 20 and 50 km", () => {
    expect(coverageConfidence(30, fresh, NOW)).toBe("low");
    expect(coverageConfidence(CONFIDENCE_LOW_MAX_KM, fresh, NOW)).toBe("none");
  });

  it("is none beyond 50 km", () => {
    expect(coverageConfidence(100, fresh, NOW)).toBe("none");
  });

  it("is none when data is stale, missing or without timestamp", () => {
    const stale = makeStation(1, -34.6, -58.4, { measured_at: STALE_ISO, aqi: 30, data_available: true });
    const noData = makeStation(2, -34.6, -58.4, { aqi: null, data_available: false });
    const noTimestamp = makeStation(3, -34.6, -58.4, { aqi: 30 });

    expect(coverageConfidence(1, stale, NOW)).toBe("none");
    expect(coverageConfidence(1, noData, NOW)).toBe("none");
    expect(coverageConfidence(1, noTimestamp, NOW)).toBe("none");
  });

  it("keeps stations with iaqi data even without a numeric aqi", () => {
    const iaqiOnly = makeStation(4, -34.6, -58.4, { measured_at: FRESH_ISO, iaqi: { pm10: 22 } });
    expect(coverageConfidence(3, iaqiOnly, NOW)).toBe("high");
  });
});

describe("stationCoverageInfo", () => {
  it("reports the nearest other station and counts within radii", () => {
    const stations = [
      makeStation(1, -34.6, -58.4, { name: "A", measured_at: FRESH_ISO, aqi: 30 }),
      makeStation(2, -34.605, -58.405, { name: "B", measured_at: FRESH_ISO, aqi: 25 }),
      makeStation(3, -34.7, -58.5, { name: "C", measured_at: FRESH_ISO, aqi: 40 }),
    ];

    const info = stationCoverageInfo(stations[0], stations, NOW);

    expect(info.nearestOther?.station.name).toBe("B");
    expect(info.withinRadii[5]).toBe(1);
    expect(info.withinRadii[20]).toBe(2);
    expect(info.directConfidence).toBe("high");
    expect(info.totalStations).toBe(3);
  });
});

describe("pointCoverage messages", () => {
  it("reports no stations when the set is empty", () => {
    const coverage = pointCoverage(-34.537, -58.715, [], NOW);
    expect(coverage.hasStations).toBe(false);
    expect(coverage.confidence).toBe("none");
    expect(coverage.message).toContain("No hay estaciones");
  });

  it("names the nearest station and distance in the message", () => {
    const stations = [
      makeStation(1, -34.6345, -58.3631, { name: "La Boca", measured_at: FRESH_ISO, aqi: 68, data_available: true }),
    ];

    const coverage = pointCoverage(-34.6345, -58.3631, stations, NOW);

    expect(coverage.hasStations).toBe(true);
    expect(coverage.message).toContain("La Boca");
    expect(coverage.message).toContain("km");
    expect(coverage.confidence).toBe("high");
  });

  it("provides readable labels and messages for every level", () => {
    for (const level of ["high", "medium", "low", "none"] as const) {
      expect(coverageConfidenceLabel(level).length).toBeGreaterThan(0);
      expect(coverageConfidenceMessage(level).length).toBeGreaterThan(0);
    }
  });
});

describe("formatDistanceKm", () => {
  it("formats one decimal below 10 km and rounds above", () => {
    expect(formatDistanceKm(3.72)).toBe("3.7 km");
    expect(formatDistanceKm(18.7)).toBe("19 km");
  });
});
