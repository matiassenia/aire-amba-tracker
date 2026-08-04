import { describe, expect, it } from "vitest";
import type { Station } from "@/types/airQuality";
import { aqiCategory, aqiToVisualHeatWeight } from "./aqiHeatScale";
import {
  findPollutantHotspot,
  mapLibreHeatExpressions,
  overviewLayerExpressions,
  propertyOpacityExpression,
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

function containsNestedZoomUnderMultiply(expression: unknown): boolean {
  if (!Array.isArray(expression)) return false;
  const [operator, ...children] = expression;
  if (operator === "*" && JSON.stringify(children).includes('"zoom"')) return true;
  return children.some(containsNestedZoomUnderMultiply);
}

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

  it("emits group coordinates as GeoJSON longitude, latitude inside Argentina bounds", () => {
    const groups = visualGroupsForStations(stations, "pm25", 80, now);
    for (const group of groups) {
      const coordinates = [group.lon, group.lat];
      expect(coordinates).toEqual([expect.any(Number), expect.any(Number)]);
      expect(Number.isFinite(coordinates[0])).toBe(true);
      expect(Number.isFinite(coordinates[1])).toBe(true);
      expect(coordinates[0]).toBeGreaterThanOrEqual(-73.8);
      expect(coordinates[0]).toBeLessThanOrEqual(-53.5);
      expect(coordinates[1]).toBeGreaterThanOrEqual(-55.2);
      expect(coordinates[1]).toBeLessThanOrEqual(-21.6);
    }
  });

  it("keeps overview visible on continental zoom and hides it when close", () => {
    expect(overviewLayerExpressions.outerRadius).toContain(3.35);
    expect(overviewLayerExpressions.outerRadius).toContain(66);
    expect(JSON.stringify(overviewLayerExpressions.outerOpacity)).toContain("freshnessFactor");
    expect(JSON.stringify(overviewLayerExpressions.outerOpacity)).toContain("intensity");
  });

  it("uses top-level interpolate for overview opacity expressions", () => {
    expect(overviewLayerExpressions.outerOpacity[0]).toBe("interpolate");
    expect(overviewLayerExpressions.middleOpacity[0]).toBe("interpolate");
    expect(overviewLayerExpressions.coreOpacity[0]).toBe("interpolate");
    expect(containsNestedZoomUnderMultiply(overviewLayerExpressions.outerOpacity)).toBe(false);
    expect(containsNestedZoomUnderMultiply(overviewLayerExpressions.middleOpacity)).toBe(false);
    expect(containsNestedZoomUnderMultiply(overviewLayerExpressions.coreOpacity)).toBe(false);
  });

  it("keeps zoom 3.35 and zoom 8 opacity stops", () => {
    expect(JSON.stringify(overviewLayerExpressions.outerOpacity)).toContain("0.4");
    expect(JSON.stringify(overviewLayerExpressions.middleOpacity)).toContain("0.64");
    expect(JSON.stringify(overviewLayerExpressions.coreOpacity)).toContain("0.94");
    expect(overviewLayerExpressions.outerOpacity.at(-1)).toBe(0);
    expect(overviewLayerExpressions.middleOpacity.at(-1)).toBe(0);
    expect(overviewLayerExpressions.coreOpacity.at(-1)).toBe(0);
  });

  it("builds property opacity expressions with freshness, intensity and coalesce", () => {
    const expression = propertyOpacityExpression({ zoomStops: [[2, 0.3], [8, 0]], freshnessFloor: 0.35, intensityFloor: 0.65 });
    expect(expression[0]).toBe("interpolate");
    expect(JSON.stringify(expression)).toContain("freshnessFactor");
    expect(JSON.stringify(expression)).toContain("intensity");
    expect(JSON.stringify(expression)).toContain("coalesce");
    expect(containsNestedZoomUnderMultiply(expression)).toBe(false);
  });

  it("uses numeric fallbacks in overview expressions", () => {
    expect(JSON.stringify(overviewLayerExpressions.outerOpacity)).toContain("coalesce");
    expect(JSON.stringify(overviewLayerExpressions.middleOpacity)).toContain("coalesce");
    expect(JSON.stringify(overviewLayerExpressions.coreRadius)).toContain("stationCount");
  });

  it("keeps old data visible with reduced overview opacity but excludes expired data", () => {
    const oldOnly: Station[] = [
      { uid: 1, name: "old", lat: -32.89, lon: -68.84, aqi: null, measured_at: "2026-07-30T12:00:00Z", iaqi: { pm25: 80 } },
      { uid: 2, name: "expired", lat: -31.4, lon: -64.18, aqi: null, measured_at: "2026-07-28T10:00:00Z", iaqi: { pm25: 180 } },
    ];
    const groups = visualGroupsForStations(oldOnly, "pm25", 80, now);
    expect(groups).toHaveLength(1);
    expect(groups[0].freshnessFactor).toBe(0.35);
    expect(groups[0].oldPercent).toBe(1);
  });

  it("uses absolute AQI colors for overview groups", () => {
    const [group] = visualGroupsForStations(stations, "pm25", 80, now);
    expect(group.color).toBe(aqiCategory(group.maxAqi).color);
  });
});

describe("findPollutantHotspot", () => {
  it("returns null without usable data", () => {
    expect(findPollutantHotspot([{ uid: 1, name: "x", lat: -34, lon: -58, aqi: null, measured_at: "2026-07-20T00:00:00Z", iaqi: { pm25: 100 } }], "pm25", now)).toBeNull();
  });

  it("does not promote AQI 0 readings to highlighted hotspots", () => {
    expect(findPollutantHotspot([{ uid: 1, name: "zero", lat: -34, lon: -58, aqi: null, measured_at: "2026-08-01T10:00:00Z", iaqi: { co: 0 } }], "co", now)).toBeNull();
  });

  it("keeps AQI 0 in heat features and visual groups", () => {
    const zero: Station[] = [
      { uid: 1, name: "zero", lat: -34.6, lon: -58.4, aqi: null, measured_at: "2026-08-01T10:00:00Z", iaqi: { co: 0 } },
    ];
    expect(stationsToHeatGeoJSON(zero, "co", now).features).toHaveLength(1);
    expect(visualGroupsForStations(zero, "co", 80, now)).toHaveLength(1);
  });

  it("keeps low AQI values in overview groups", () => {
    const low: Station[] = [
      { uid: 1, name: "a", lat: -34.6, lon: -58.4, aqi: null, measured_at: "2026-08-01T10:00:00Z", iaqi: { pm10: 20 } },
      { uid: 2, name: "b", lat: -34.7, lon: -58.5, aqi: null, measured_at: "2026-08-01T10:00:00Z", iaqi: { pm10: 50 } },
      { uid: 3, name: "c", lat: -31.4, lon: -64.18, aqi: null, measured_at: "2026-08-01T10:00:00Z", iaqi: { pm10: 100 } },
    ];
    expect(visualGroupsForStations(low, "pm10", 80, now).map((group) => group.maxAqi)).toEqual([50, 100]);
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
