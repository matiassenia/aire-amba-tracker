import { describe, expect, it } from "vitest";
import type { Station } from "@/types/airQuality";
import {
  availablePollutants,
  heatPointsForPollutant,
  normalizePollutantIntensity,
  pollutantValue,
  shouldShowHeatmap,
} from "./pollutantHeat";

const stations: Station[] = [
  {
    uid: 1,
    name: "A",
    lat: -34.6,
    lon: -58.4,
    aqi: null,
    iaqi: { pm10: 22, no2: null },
  },
  {
    uid: 2,
    name: "B",
    lat: -34.7,
    lon: -58.5,
    aqi: null,
    iaqi: { pm10: null, co: 1.2 },
  },
  {
    uid: 3,
    name: "C",
    lat: -34.8,
    lon: -58.6,
    aqi: null,
  },
];

describe("pollutant heat helpers", () => {
  it("filters null and missing pollutant values without converting them to zero", () => {
    const points = heatPointsForPollutant(stations, "pm10");

    expect(points).toHaveLength(1);
    expect(points[0].value).toBe(22);
    expect(points[0].station.uid).toBe(1);
  });

  it("preserves real station coordinates in heat points", () => {
    const [point] = heatPointsForPollutant(stations, "co");

    expect(point.lat).toBe(-34.7);
    expect(point.lon).toBe(-58.5);
  });

  it("normalizes intensity by selected pollutant and clamps high values", () => {
    expect(normalizePollutantIntensity(20, "pm10")).toBeGreaterThan(0);
    expect(normalizePollutantIntensity(20, "pm10")).toBeLessThan(1);
    expect(normalizePollutantIntensity(999, "pm10")).toBe(1);
  });

  it("returns no points for a pollutant without data", () => {
    expect(heatPointsForPollutant(stations, "o3")).toEqual([]);
    expect(pollutantValue(stations[2], "o3")).toBeNull();
  });

  it("detects available pollutants from partial station data", () => {
    expect(availablePollutants(stations)).toEqual(["pm10", "co"]);
  });

  it("hides national heatmap until zoom and density are sufficient", () => {
    expect(shouldShowHeatmap("argentina", 4, 12)).toBe(false);
    expect(shouldShowHeatmap("argentina", 7, 3)).toBe(false);
    expect(shouldShowHeatmap("argentina", 7, 4)).toBe(true);
    expect(shouldShowHeatmap("amba", 9, 2)).toBe(true);
  });
});
