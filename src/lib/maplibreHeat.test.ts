import { describe, expect, it } from "vitest";
import type { Station } from "@/types/airQuality";
import { aqiCategory, aqiToVisualHeatWeight } from "./aqiHeatScale";
import {
  findPollutantHotspot,
  mapLibreHeatExpressions,
  overviewLayerExpressions,
  stationsToHeatGeoJSON,
  hotspotScoreForGroup,
  visualGroupsForStations,
} from "./maplibreHeat";

const now = new Date("2026-08-01T12:00:00Z");

const stations: Station[] = [
  { uid: 1, name: "Buenos Aires", lat: -34.6, lon: -58.4, aqi: null, measured_at: "2026-08-01T10:00:00Z", iaqi: { pm25: 80 } },
  { uid: 2, name: "La Plata", lat: -34.92, lon: -57.95, aqi: null, measured_at: "2026-08-01T00:00:00Z", iaqi: { pm25: 120 } },
  { uid: 3, name: "Mendoza", lat: -32.89, lon: -68.84, aqi: null, measured_at: "2026-07-30T12:00:00Z", iaqi: { pm25: 40 } },
  { uid: 4, name: "Montevideo", lat: -34.9, lon: -56.16, aqi: null, measured_at: "2026-08-01T10:00:00Z", iaqi: { pm25: 200 } },
  { uid: 5, name: "Expired", lat: -31.4, lon: -64.18, aqi: null, measured_at: "2026-07-28T10:00:00Z", iaqi: { pm25: 150 } },
];

describe("stationsToHeatGeoJSON", () => {
  it("converts valid Argentine stations to GeoJSON", () => {
    const geojson = stationsToHeatGeoJSON(stations, "pm25", now);
    expect(geojson.type).toBe("FeatureCollection");
    expect(geojson.features.map((feature) => feature.properties.uid)).toEqual([1, 2, 3]);
    expect(geojson.features[0].geometry.coordinates).toEqual([-58.4, -34.6]);
  });

  it("computes finalWeight as visualWeight multiplied by freshnessMultiplier", () => {
    const feature = stationsToHeatGeoJSON(stations, "pm25", now).features[1];
    expect(feature.properties.visualWeight).toBe(aqiToVisualHeatWeight(120));
    expect(feature.properties.freshnessMultiplier).toBe(0.75);
    expect(feature.properties.finalWeight).toBe(aqiToVisualHeatWeight(120) * 0.75);
  });

  it("does not emit data older than 72 hours or foreign stations", () => {
    const ids = stationsToHeatGeoJSON(stations, "pm25", now).features.map((feature) => feature.properties.uid);
    expect(ids).not.toContain(4);
    expect(ids).not.toContain(5);
  });

  it("keeps the absolute AQI category", () => {
    const feature = stationsToHeatGeoJSON(stations, "pm25", now).features[1];
    expect(feature.properties.category).toBe(aqiCategory(120).label);
  });

  it("exports zoom-dependent MapLibre expressions", () => {
    expect(JSON.stringify(mapLibreHeatExpressions.radius)).toContain("zoom");
    expect(JSON.stringify(overviewLayerExpressions.outerOpacity)).toContain("zoom");
    expect(mapLibreHeatExpressions.weight).toEqual(["get", "finalWeight"]);
  });
});

describe("visualGroupsForStations", () => {
  it("groups nearby stations only for rendering", () => {
    const original = [...stations];
    const groups = visualGroupsForStations(stations, "pm25", 80, now);
    expect(groups[0].stationCount).toBe(2);
    expect(groups[0].maxAqi).toBe(120);
    expect(stations).toEqual(original);
  });

  it("does not join distant cities", () => {
    const groups = visualGroupsForStations(stations, "pm25", 80, now);
    expect(groups).toHaveLength(2);
    expect(groups.map((group) => group.stationCount)).toEqual([2, 1]);
  });

  it("keeps overview visible on continental zoom and hides it when close", () => {
    expect(overviewLayerExpressions.outerOpacity).toEqual(["interpolate", ["linear"], ["zoom"], 2, 0.36, 4, 0.42, 6.5, 0.24, 8, 0]);
  });
});

describe("findPollutantHotspot", () => {
  it("returns null without usable data", () => {
    expect(findPollutantHotspot([{ uid: 1, name: "x", lat: -34, lon: -58, aqi: null, measured_at: "2026-07-20T00:00:00Z", iaqi: { pm25: 100 } }], "pm25", now)).toBeNull();
  });

  it("excludes foreign stations and expired data", () => {
    const hotspot = findPollutantHotspot(stations, "pm25", now);
    expect(hotspot?.stationIds).toEqual([1, 2]);
    expect(hotspot?.maxAqi).toBe(120);
    expect(hotspot?.category).toBe(aqiCategory(120).label);
  });

  it("recalculates for the selected pollutant", () => {
    const mixed: Station[] = [
      { uid: 1, name: "pm", lat: -34.6, lon: -58.4, aqi: null, measured_at: "2026-08-01T10:00:00Z", iaqi: { pm25: 80, no2: 10 } },
      { uid: 2, name: "no2", lat: -31.4, lon: -64.18, aqi: null, measured_at: "2026-08-01T10:00:00Z", iaqi: { pm25: 20, no2: 140 } },
    ];
    expect(findPollutantHotspot(mixed, "pm25", now)?.stationIds).toEqual([1]);
    expect(findPollutantHotspot(mixed, "no2", now)?.stationIds).toEqual([2]);
  });

  it("lets a recent group beat an old isolated extreme when appropriate", () => {
    const candidates: Station[] = [
      { uid: 1, name: "a", lat: -34.6, lon: -58.4, aqi: null, measured_at: "2026-08-01T10:00:00Z", iaqi: { pm25: 120 } },
      { uid: 2, name: "b", lat: -34.7, lon: -58.5, aqi: null, measured_at: "2026-08-01T10:00:00Z", iaqi: { pm25: 118 } },
      { uid: 3, name: "old", lat: -32.89, lon: -68.84, aqi: null, measured_at: "2026-07-30T12:00:00Z", iaqi: { pm25: 180 } },
    ];
    expect(findPollutantHotspot(candidates, "pm25", now)?.stationIds).toEqual([1, 2]);
  });

  it("documents the hotspot score components", () => {
    const [group] = visualGroupsForStations(stations, "pm25", 80, now);
    expect(hotspotScoreForGroup(group)).toBeGreaterThan(0);
    expect(hotspotScoreForGroup(group)).toBeLessThanOrEqual(1);
  });
});
