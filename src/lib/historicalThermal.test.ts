import { describe, expect, it } from "vitest";
import type { Station } from "@/types/airQuality";
import { stationsToHeatGeoJSON } from "./maplibreHeat";
import {
  historicalAgeFactorForStation,
  historicalGroupFeatureCollection,
  historicalHeatPointsForPollutant,
  stationsToHistoricalHeatGeoJSON,
} from "./historicalThermal";

const now = new Date("2026-08-03T23:15:00Z");
const expired: Station[] = [
  { uid: 8398, name: "La Boca", lat: -34.6344961, lon: -58.3631337, aqi: null, measured_at: "2026-07-30T02:00:00+00:00", iaqi: { pm10: 14 } },
  { uid: 8399, name: "Centenario", lat: -34.635582, lon: -58.5518647, aqi: null, measured_at: "2026-07-30T02:00:00+00:00", iaqi: { pm10: 16 } },
  { uid: 8400, name: "Cordoba", lat: -34.5995674, lon: -58.3915767, aqi: null, measured_at: "2026-07-30T02:00:00+00:00", iaqi: { pm10: 15 } },
];

describe("historical thermal pipeline", () => {
  it("includes expired stations while the current heat pipeline excludes them", () => {
    expect(stationsToHeatGeoJSON(expired, "pm10", now).features).toHaveLength(0);
    expect(stationsToHistoricalHeatGeoJSON(expired, "pm10", now).features).toHaveLength(3);
  });

  it("uses real pollutant values and [longitude, latitude] coordinates", () => {
    const [feature] = stationsToHistoricalHeatGeoJSON(expired, "pm10", now).features;
    expect(feature.properties.aqi).toBe(14);
    expect(feature.geometry.coordinates).toEqual([-58.3631337, -34.6344961]);
  });

  it("attenuates old data but never reduces historical intensity to zero", () => {
    const points = historicalHeatPointsForPollutant(expired, "pm10", now);
    expect(points[0].historicalAgeFactor).toBe(0.65);
    expect(points.every((point) => point.intensity > 0)).toBe(true);
  });

  it("groups historical stations separately from current groups", () => {
    const groups = historicalGroupFeatureCollection(expired, "pm10");
    expect(groups.features).toHaveLength(1);
    expect(groups.features[0].properties.stationCount).toBe(3);
  });

  it("keeps very old data visible with a small historical floor", () => {
    const factor = historicalAgeFactorForStation({ ...expired[0], measured_at: "2026-06-01T00:00:00Z" }, now);
    expect(factor).toBe(0.12);
  });
});
