import type { Station } from "@/types/airQuality";
import { aqiCategory, aqiColor, aqiToVisualHeatWeight } from "@/lib/aqiHeatScale";
import { isStationInsideArgentina } from "@/lib/argentinaBoundary";
import { distanceKm } from "@/lib/coverage";
import { pollutantValue, type PollutantKey } from "@/lib/pollutantHeat";

export type MapViewMode = "current" | "latest";

export type HistoricalHeatPoint = {
  lat: number;
  lon: number;
  value: number;
  intensity: number;
  visualWeight: number;
  historicalAgeFactor: number;
  station: Station;
};

function ageHours(station: Station, now: Date): number | null {
  const measuredAt = station.measured_at ?? station.time ?? null;
  if (!measuredAt) return null;
  const measured = new Date(measuredAt);
  if (Number.isNaN(measured.getTime())) return null;
  return Math.max(0, (now.getTime() - measured.getTime()) / (1000 * 60 * 60));
}

export function historicalAgeFactorForStation(station: Station, now: Date = new Date()): number {
  const hours = ageHours(station, now);
  if (hours === null) return 0.12;
  if (hours <= 72) return 1;
  if (hours <= 120) return 0.65;
  if (hours <= 168) return 0.5;
  if (hours <= 24 * 14) return 0.35;
  if (hours <= 24 * 30) return 0.22;
  return 0.12;
}

export function historicalHeatPointsForPollutant(
  stations: Station[],
  pollutant: PollutantKey,
  now: Date = new Date(),
): HistoricalHeatPoint[] {
  return stations.flatMap((station) => {
    if (!isStationInsideArgentina(station)) return [];
    const value = pollutantValue(station, pollutant);
    if (value === null || !Number.isFinite(value)) return [];
    const visualWeight = aqiToVisualHeatWeight(value);
    const historicalAgeFactor = historicalAgeFactorForStation(station, now);
    return [{ lat: station.lat, lon: station.lon, value, intensity: visualWeight * historicalAgeFactor, visualWeight, historicalAgeFactor, station }];
  });
}

export function stationsToHistoricalHeatGeoJSON(
  stations: Station[],
  pollutant: PollutantKey,
  now: Date = new Date(),
) {
  return {
    type: "FeatureCollection" as const,
    features: historicalHeatPointsForPollutant(stations, pollutant, now).map((point) => ({
      type: "Feature" as const,
      geometry: { type: "Point" as const, coordinates: [point.lon, point.lat] as [number, number] },
      properties: {
        uid: point.station.uid,
        pollutant,
        aqi: point.value,
        category: aqiCategory(point.value).label,
        color: aqiColor(point.value),
        visualWeight: point.visualWeight,
        historicalAgeFactor: point.historicalAgeFactor,
        finalWeight: Math.max(0.12, point.intensity),
        measuredAt: point.station.measured_at ?? point.station.time ?? null,
        source: point.station.source ?? null,
      },
    })),
  };
}

export function historicalGroupsForStations(
  stations: Station[],
  pollutant: PollutantKey,
  maxDistanceKm = 80,
  now: Date = new Date(),
) {
  const candidates = historicalHeatPointsForPollutant(stations, pollutant, now).map((point) => point.station);
  const groups: Station[][] = [];
  for (const station of candidates) {
    const target = groups.find((group) => group.some((member) => distanceKm(station.lat, station.lon, member.lat, member.lon) <= maxDistanceKm));
    if (target) target.push(station);
    else groups.push([station]);
  }
  return groups.map((group, index) => {
    const values = group.map((station) => pollutantValue(station, pollutant)).filter((value): value is number => value !== null && Number.isFinite(value));
    const maxAqi = Math.max(...values);
    const factors = group.map((station) => historicalAgeFactorForStation(station, now));
    const freshnessFactor = factors.reduce((sum, factor) => sum + factor, 0) / factors.length;
    return {
      id: `historical-group-${index}`,
      lat: group.reduce((sum, station) => sum + station.lat, 0) / group.length,
      lon: group.reduce((sum, station) => sum + station.lon, 0) / group.length,
      stationCount: group.length,
      maxAqi,
      averageAqi: values.reduce((sum, value) => sum + value, 0) / values.length,
      pollutant,
      category: aqiCategory(maxAqi).label,
      color: aqiColor(maxAqi),
      freshnessFactor,
      intensity: Math.min(1, aqiToVisualHeatWeight(maxAqi) * Math.log2(group.length + 1) * freshnessFactor),
      stations: group,
    };
  });
}

export function historicalGroupFeatureCollection(stations: Station[], pollutant: PollutantKey) {
  return {
    type: "FeatureCollection" as const,
    features: historicalGroupsForStations(stations, pollutant).map((group) => ({
      type: "Feature" as const,
      geometry: { type: "Point" as const, coordinates: [group.lon, group.lat] as [number, number] },
      properties: {
        id: group.id,
        stationCount: group.stationCount,
        maxAqi: group.maxAqi,
        averageAqi: group.averageAqi,
        color: group.color,
        category: group.category,
        intensity: group.intensity,
        freshnessFactor: group.freshnessFactor,
        oldPercent: 1,
      },
    })),
  };
}
