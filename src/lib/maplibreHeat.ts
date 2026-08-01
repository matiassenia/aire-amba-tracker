import type { Station } from "@/types/airQuality";
import { aqiCategory, aqiColor, aqiToVisualHeatWeight } from "@/lib/aqiHeatScale";
import { distanceKm } from "@/lib/coverage";
import {
  freshnessMultiplierForStation,
  heatFreshnessBand,
  pollutantValue,
  type PollutantKey,
} from "@/lib/pollutantHeat";

export type HeatFeatureProperties = {
  uid: number;
  lat: number;
  lon: number;
  pollutant: PollutantKey;
  aqi: number;
  category: string;
  color: string;
  visualWeight: number;
  freshnessMultiplier: number;
  finalWeight: number;
  measuredAt: string | null;
  source: string | null;
};

export type HeatFeature = {
  type: "Feature";
  geometry: { type: "Point"; coordinates: [number, number] };
  properties: HeatFeatureProperties;
};

export type HeatFeatureCollection = {
  type: "FeatureCollection";
  features: HeatFeature[];
};

export type VisualGroup = {
  id: string;
  lat: number;
  lon: number;
  stationCount: number;
  maxAqi: number;
  averageAqi: number;
  pollutant: PollutantKey;
  category: string;
  color: string;
  latestMeasuredAt: string | null;
  freshPercent: number;
  stalePercent: number;
  oldPercent: number;
  freshnessFactor: number;
  intensity: number;
  stations: readonly Station[];
};

export type PollutantHotspot = {
  lat: number;
  lon: number;
  maxAqi: number;
  averageAqi: number;
  stationCount: number;
  category: string;
  color: string;
  freshestMeasuredAt: string | null;
  freshnessSummary: string;
  score: number;
  stationIds: number[];
};

const ARGENTINA_BOUNDS = {
  minLat: -56,
  maxLat: -21,
  minLon: -74,
  maxLon: -53,
};

export function isStationInsideArgentina(station: Station): boolean {
  const insideBroadBounds =
    station.lat >= ARGENTINA_BOUNDS.minLat &&
    station.lat <= ARGENTINA_BOUNDS.maxLat &&
    station.lon >= ARGENTINA_BOUNDS.minLon &&
    station.lon <= ARGENTINA_BOUNDS.maxLon;
  if (!insideBroadBounds) return false;
  // Evita incluir Uruguay/sur de Brasil en el recorte rectangular amplio.
  if (station.lat < -30 && station.lon > -57) return false;
  return true;
}

export function stationsToHeatGeoJSON(
  stations: Station[],
  pollutant: PollutantKey,
  now: Date = new Date(),
): HeatFeatureCollection {
  return {
    type: "FeatureCollection",
    features: stations.flatMap((station) => {
      if (!isStationInsideArgentina(station)) return [];
      const aqi = pollutantValue(station, pollutant);
      if (aqi === null || !Number.isFinite(aqi)) return [];
      const freshnessMultiplier = freshnessMultiplierForStation(station, now);
      if (freshnessMultiplier <= 0) return [];
      const visualWeight = aqiToVisualHeatWeight(aqi);
      const finalWeight = visualWeight * freshnessMultiplier;
      return [
        {
          type: "Feature" as const,
          geometry: { type: "Point" as const, coordinates: [station.lon, station.lat] as [number, number] },
          properties: {
            uid: station.uid,
            lat: station.lat,
            lon: station.lon,
            pollutant,
            aqi,
            category: aqiCategory(aqi).label,
            color: aqiColor(aqi),
            visualWeight,
            freshnessMultiplier,
            finalWeight,
            measuredAt: station.measured_at ?? station.time ?? null,
            source: station.source ?? null,
          },
        },
      ];
    }),
  };
}

export const mapLibreHeatExpressions = {
  weight: ["get", "finalWeight"],
  radius: ["interpolate", ["linear"], ["zoom"], 2, 16, 4, 24, 6, 38, 8, 34, 10, 24, 12, 16],
  intensity: ["interpolate", ["linear"], ["zoom"], 2, 0.55, 4, 0.78, 6, 1.05, 8, 0.86, 10, 0.6],
  opacity: ["interpolate", ["linear"], ["zoom"], 2, 0.3, 4, 0.42, 6, 0.5, 8, 0.36, 11, 0.22],
  color: [
    "interpolate",
    ["linear"],
    ["heatmap-density"],
    0,
    "rgba(15,23,42,0)",
    0.18,
    "#22c55e",
    0.34,
    "#eab308",
    0.5,
    "#f97316",
    0.68,
    "#ef4444",
    0.84,
    "#a855f7",
    1,
    "#ec4899",
  ],
};

export const overviewLayerExpressions = {
  outerRadius: ["interpolate", ["linear"], ["zoom"], 2, 52, 3.35, 66, 4, 72, 6, 82, 8, 28],
  outerOpacity: ["*", ["interpolate", ["linear"], ["zoom"], 2, 0.32, 3.35, 0.4, 4, 0.42, 6.5, 0.28, 8, 0], ["max", 0.35, ["get", "freshnessFactor"]], ["interpolate", ["linear"], ["get", "intensity"], 0, 0.65, 1, 1]],
  middleRadius: ["interpolate", ["linear"], ["zoom"], 2, 30, 3.35, 42, 4, 48, 6, 56, 8, 18],
  middleOpacity: ["*", ["interpolate", ["linear"], ["zoom"], 2, 0.5, 3.35, 0.64, 4, 0.68, 6.5, 0.46, 8, 0], ["max", 0.35, ["get", "freshnessFactor"]], ["interpolate", ["linear"], ["get", "intensity"], 0, 0.65, 1, 1]],
  coreRadius: ["interpolate", ["linear"], ["get", "stationCount"], 1, 5, 8, 9, 20, 12],
  coreOpacity: ["*", ["interpolate", ["linear"], ["zoom"], 2, 0.92, 6.5, 1, 8, 0], ["max", 0.45, ["get", "freshnessFactor"]], ["interpolate", ["linear"], ["get", "intensity"], 0, 0.72, 1, 1]],
};

export function visualGroupsForStations(
  stations: Station[],
  pollutant: PollutantKey,
  maxDistanceKm = 80,
  now: Date = new Date(),
): VisualGroup[] {
  const candidates = stations.filter((station) => {
    const value = pollutantValue(station, pollutant);
    return (
      isStationInsideArgentina(station) &&
      value !== null &&
      Number.isFinite(value) &&
      freshnessMultiplierForStation(station, now) > 0
    );
  });
  const groups: Station[][] = [];

  for (const station of candidates) {
    let target: Station[] | null = null;
    for (const group of groups) {
      const near = group.some((member) => distanceKm(station.lat, station.lon, member.lat, member.lon) <= maxDistanceKm);
      if (near) {
        target = group;
        break;
      }
    }
    if (target) target.push(station);
    else groups.push([station]);
  }

  return groups.map((group, index) => {
    const values = group.map((station) => pollutantValue(station, pollutant)).filter((value): value is number => value !== null && Number.isFinite(value));
    const maxAqi = Math.max(...values);
    const averageAqi = values.reduce((sum, value) => sum + value, 0) / values.length;
    const latestMeasuredAt = group
      .map((station) => station.measured_at ?? station.time ?? null)
      .filter((value): value is string => Boolean(value))
      .sort((a, b) => new Date(b).getTime() - new Date(a).getTime())[0] ?? null;
    const bands = group.map((station) => heatFreshnessBand(station, now));
    const usableFreshness = group.reduce((sum, station) => sum + freshnessMultiplierForStation(station, now), 0);
    const freshnessFactor = usableFreshness / group.length;
    return {
      id: `visual-group-${index}`,
      lat: group.reduce((sum, station) => sum + station.lat, 0) / group.length,
      lon: group.reduce((sum, station) => sum + station.lon, 0) / group.length,
      stationCount: group.length,
      maxAqi,
      averageAqi,
      pollutant,
      category: aqiCategory(maxAqi).label,
      color: aqiColor(maxAqi),
      latestMeasuredAt,
      freshPercent: bands.filter((band) => band === "fresh").length / group.length,
      stalePercent: bands.filter((band) => band === "stale").length / group.length,
      oldPercent: bands.filter((band) => band === "old").length / group.length,
      freshnessFactor,
      intensity: Math.min(1, aqiToVisualHeatWeight(maxAqi) * Math.log2(group.length + 1) * freshnessFactor),
      stations: group,
    };
  });
}

function freshnessSummaryForGroup(group: Station[], now: Date): string {
  const bands = group.map((station) => heatFreshnessBand(station, now));
  const fresh = bands.filter((band) => band === "fresh").length;
  const stale = bands.filter((band) => band === "stale").length;
  const old = bands.filter((band) => band === "old").length;
  return `${fresh} fresh · ${stale} stale · ${old} old`;
}

// Fórmula: prioriza grupos cercanos con AQI alto, varios sensores y frescura.
// maxAqi y averageAqi conservan categorías absolutas; freshness evita que un
// dato viejo extremo gane automáticamente sobre varios datos recientes.
export function hotspotScoreForGroup(group: VisualGroup): number {
  const maxAqiWeight = Math.min(group.maxAqi, 300) / 300 * 0.36;
  const averageAqiWeight = Math.min(group.averageAqi, 300) / 300 * 0.2;
  const stationDensityWeight = Math.min(Math.log2(group.stationCount + 1) / 4, 1) * 0.22;
  const freshnessWeight = (group.freshPercent + group.stalePercent * 0.75 + group.oldPercent * 0.35) * 0.22;
  return maxAqiWeight + averageAqiWeight + stationDensityWeight + freshnessWeight;
}

export function findPollutantHotspot(
  stations: Station[],
  pollutant: PollutantKey,
  now: Date = new Date(),
): PollutantHotspot | null {
  const groups = visualGroupsForStations(stations, pollutant, 80, now);
  if (!groups.length) return null;
  const ranked = groups
    .map((group) => ({ group, score: hotspotScoreForGroup(group) }))
    .sort((a, b) => b.score - a.score);
  const { group, score } = ranked[0];
  return {
    lat: group.lat,
    lon: group.lon,
    maxAqi: group.maxAqi,
    averageAqi: group.averageAqi,
    stationCount: group.stationCount,
    category: group.category,
    color: group.color,
    freshestMeasuredAt: group.latestMeasuredAt,
    freshnessSummary: freshnessSummaryForGroup([...group.stations], now),
    score,
    stationIds: group.stations.map((station) => station.uid),
  };
}
