import { describe, expect, it } from "vitest";
import type { Station } from "@/types/airQuality";
import { aqiToVisualHeatWeight } from "./aqiHeatScale";
import {
  availablePollutants,
  capRadiusPixels,
  heatLayerConfig,
  heatPointsForPollutant,
  maxInfluenceRadiusKm,
  pollutantValue,
  shouldShowHeatmap,
} from "./pollutantHeat";

const FRESH_ISO = new Date(Date.now() - 60 * 60 * 1000).toISOString();

const stations: Station[] = [
  {
    uid: 1,
    name: "A",
    lat: -34.6,
    lon: -58.4,
    aqi: null,
    measured_at: FRESH_ISO,
    iaqi: { pm10: 22, no2: null },
  },
  {
    uid: 2,
    name: "B",
    lat: -34.7,
    lon: -58.5,
    aqi: null,
    measured_at: FRESH_ISO,
    iaqi: { pm10: null, co: 1.2 },
  },
  {
    uid: 3,
    name: "C",
    lat: -34.8,
    lon: -58.6,
    aqi: null,
    measured_at: FRESH_ISO,
    iaqi: { pm10: NaN },
  },
];

describe("pollutant heat helpers", () => {
  it("filters null and missing pollutant values without converting them to zero", () => {
    const points = heatPointsForPollutant(stations, "pm10");

    expect(points).toHaveLength(1);
    expect(points[0].value).toBe(22);
    expect(points[0].station.uid).toBe(1);
  });

  it("never generates a heat point for NaN values", () => {
    expect(heatPointsForPollutant(stations, "pm10")).toHaveLength(1);

    const nanOnly: Station[] = [
      { uid: 9, name: "NaN", lat: -34, lon: -58, aqi: null, measured_at: FRESH_ISO, iaqi: { pm10: NaN } },
    ];
    expect(heatPointsForPollutant(nanOnly, "pm10")).toEqual([]);
  });

  it("excludes stale and unknown stations from the heatmap", () => {
    const staleIso = new Date(Date.now() - 48 * 60 * 60 * 1000).toISOString();
    const mixed: Station[] = [
      { uid: 1, name: "fresca", lat: -34.6, lon: -58.4, aqi: null, measured_at: FRESH_ISO, iaqi: { pm10: 22 } },
      { uid: 2, name: "vieja", lat: -34.7, lon: -58.5, aqi: null, measured_at: staleIso, iaqi: { pm10: 30 } },
      { uid: 3, name: "sin fecha", lat: -34.8, lon: -58.6, aqi: null, iaqi: { pm10: 40 } },
    ];

    const points = heatPointsForPollutant(mixed, "pm10");

    expect(points).toHaveLength(1);
    expect(points[0].station.uid).toBe(1);
  });

  it("preserves real station coordinates in heat points", () => {
    const [point] = heatPointsForPollutant(stations, "co");

    expect(point.lat).toBe(-34.7);
    expect(point.lon).toBe(-58.5);
  });

  it("uses the perceptual absolute weight instead of value / 300", () => {
    const [point] = heatPointsForPollutant(stations, "pm10");

    expect(point.intensity).toBe(aqiToVisualHeatWeight(22));
    expect(point.intensity).toBeGreaterThan(22 / 300);
  });

  it("does not escalate the highest value of a small set to the top of the scale", () => {
    const lowSet: Station[] = [
      { uid: 1, name: "low", lat: -34.6, lon: -58.4, aqi: null, measured_at: FRESH_ISO, iaqi: { pm10: 60 } },
    ];

    const [point] = heatPointsForPollutant(lowSet, "pm10");

    expect(point.intensity).toBe(aqiToVisualHeatWeight(60));
    expect(point.intensity).toBeLessThan(1);
    expect(point.intensity).toBeLessThan(aqiToVisualHeatWeight(100));
  });

  it("keeps intensity comparable across sets of different sizes", () => {
    const small: Station[] = [
      { uid: 1, name: "a", lat: -34.6, lon: -58.4, aqi: null, measured_at: FRESH_ISO, iaqi: { pm10: 120 } },
    ];
    const large: Station[] = [
      { uid: 1, name: "a", lat: -34.6, lon: -58.4, aqi: null, measured_at: FRESH_ISO, iaqi: { pm10: 120 } },
      { uid: 2, name: "b", lat: -34.7, lon: -58.5, aqi: null, measured_at: FRESH_ISO, iaqi: { pm10: 20 } },
      { uid: 3, name: "c", lat: -34.8, lon: -58.6, aqi: null, measured_at: FRESH_ISO, iaqi: { pm10: 30 } },
    ];

    const smallIntensity = heatPointsForPollutant(small, "pm10")[0].intensity;
    const largeIntensity = heatPointsForPollutant(large, "pm10")[0].intensity;

    expect(smallIntensity).toBe(largeIntensity);
  });

  it("returns no points for a pollutant without data", () => {
    expect(heatPointsForPollutant(stations, "o3")).toEqual([]);
    expect(pollutantValue(stations[2], "o3")).toBeNull();
  });

  it("detects available pollutants from partial station data", () => {
    expect(availablePollutants(stations)).toEqual(["pm10", "co"]);
  });
});

describe("shouldShowHeatmap", () => {
  it("never shows a heatmap without at least one point", () => {
    expect(shouldShowHeatmap("amba", 9, 0)).toBe(false);
    expect(shouldShowHeatmap("argentina", 9, 0)).toBe(false);
  });

  it("shows a local thermal halo with a single station", () => {
    expect(shouldShowHeatmap("amba", 9, 1)).toBe(true);
    expect(shouldShowHeatmap("argentina", 7, 1)).toBe(true);
  });

  it("shows limited interpolation with two or three stations", () => {
    expect(shouldShowHeatmap("amba", 9, 2)).toBe(true);
    expect(shouldShowHeatmap("amba", 9, 3)).toBe(true);
    expect(shouldShowHeatmap("argentina", 7, 3)).toBe(true);
  });

  it("shows the normal regional heatmap with four or more stations", () => {
    expect(shouldShowHeatmap("amba", 9, 4)).toBe(true);
  });

  it("hides the national heatmap until zoomed in", () => {
    expect(shouldShowHeatmap("argentina", 4, 12)).toBe(false);
    expect(shouldShowHeatmap("argentina", 6, 12)).toBe(false);
    expect(shouldShowHeatmap("argentina", 7, 4)).toBe(true);
  });
});

describe("heatLayerConfig", () => {
  it("returns null when the heatmap is hidden", () => {
    expect(heatLayerConfig("amba", 0, 9, 9)).toBeNull();
    expect(heatLayerConfig("argentina", 4, 6, 6)).toBeNull();
  });

  it("uses a smaller local halo for one, two or three stations", () => {
    const single = heatLayerConfig("amba", 1, 9, 9)!;
    const couple = heatLayerConfig("amba", 2, 9, 9)!;
    const trio = heatLayerConfig("amba", 3, 9, 9)!;
    const full = heatLayerConfig("amba", 4, 9, 9)!;

    expect(single.radius).toBeLessThan(full.radius);
    expect(couple.radius).toBeLessThan(full.radius);
    expect(trio.radius).toBeLessThan(full.radius);
    expect(single.blur).toBeLessThan(full.blur);
  });

  it("enables a full regional cloud with four or more stations", () => {
    const full = heatLayerConfig("amba", 4, 9, 9)!;
    expect(full.radius).toBe(75);
    expect(full.blur).toBe(58);
    expect(full.minOpacity).toBe(0.2);
  });

  it("uses contained settings for the national view", () => {
    const national = heatLayerConfig("argentina", 6, 8, 6)!;
    const regional = heatLayerConfig("amba", 6, 9, 9)!;
    expect(national.radius).toBeLessThan(regional.radius);
    expect(national.blur).toBeLessThan(regional.blur);
    expect(national.minOpacity).toBeLessThan(regional.minOpacity);
  });

  it("anchors maxZoom to the region default zoom", () => {
    const amba = heatLayerConfig("amba", 4, 9, 9)!;
    expect(amba.maxZoom).toBe(9);
    const cuyo = heatLayerConfig("cuyo", 4, 6, 6)!;
    expect(cuyo.maxZoom).toBe(6);
  });

  it("shrinks the halo when zooming out so coverage fades gradually", () => {
    const atDefault = heatLayerConfig("amba", 4, 9, 9)!;
    const zoomedOut = heatLayerConfig("amba", 4, 8, 9)!;
    expect(zoomedOut.radius).toBeLessThan(atDefault.radius);
    expect(zoomedOut.blur).toBeLessThan(atDefault.blur);
  });
});

describe("maxInfluenceRadiusKm and capRadiusPixels", () => {
  it("keeps a small local halo for one, two or three stations", () => {
    const single = heatLayerConfig("amba", 1, 9, 9)!;
    const full = heatLayerConfig("amba", 4, 9, 9)!;
    expect(single.radius).toBeLessThan(full.radius);
  });

  it("caps the national halo so distant stations are never connected", () => {
    const national = heatLayerConfig("argentina", 6, 7, 4)!;
    expect(national.radius).toBeLessThan(26);
  });

  it("caps the halo harder at lower zoom levels", () => {
    const atDefault = heatLayerConfig("amba", 1, 9, 9)!;
    const zoomedOut = heatLayerConfig("amba", 1, 8, 9)!;
    expect(zoomedOut.radius).toBeLessThan(atDefault.radius);
  });

  it("does not cap a dense regional set at its default zoom", () => {
    const dense = heatLayerConfig("amba", 4, 9, 9)!;
    expect(dense.radius).toBe(75);
    expect(dense.blur).toBe(58);
  });

  it("keeps the maximum influence radius geographically bounded", () => {
    const maxInfluenceKm = maxInfluenceRadiusKm("argentina", 6);
    expect(maxInfluenceKm).toBeGreaterThan(0);
    const radiusPx = capRadiusPixels("argentina", 6, 100, 7);
    expect(radiusPx).toBeLessThan(100);
  });
});
