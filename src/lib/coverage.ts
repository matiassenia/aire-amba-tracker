import type { Station } from "@/types/airQuality";
import { STALE_AFTER_HOURS } from "@/lib/stationFreshness";

export type CoverageConfidence = "high" | "medium" | "low" | "none";

export const CONFIDENCE_HIGH_MAX_KM = 5;
export const CONFIDENCE_MEDIUM_MAX_KM = 20;
export const CONFIDENCE_LOW_MAX_KM = 50;

export const COVERAGE_RADII_KM = [5, 10, 20] as const;

const EARTH_RADIUS_KM = 6371;

export function distanceKm(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number,
): number {
  const toRadians = (deg: number) => (deg * Math.PI) / 180;
  const dLat = toRadians(lat2 - lat1);
  const dLon = toRadians(lon2 - lon1);
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRadians(lat1)) * Math.cos(toRadians(lat2)) * Math.sin(dLon / 2) ** 2;
  return 2 * EARTH_RADIUS_KM * Math.asin(Math.min(1, Math.sqrt(h)));
}

export type NearestStationResult = {
  station: Station;
  distanceKm: number;
};

export function nearestStation(
  lat: number,
  lon: number,
  stations: Station[],
): NearestStationResult | null {
  let nearest: NearestStationResult | null = null;
  for (const station of stations) {
    const d = distanceKm(lat, lon, station.lat, station.lon);
    if (nearest === null || d < nearest.distanceKm) {
      nearest = { station, distanceKm: d };
    }
  }
  return nearest;
}

export function stationsWithinRadius(
  lat: number,
  lon: number,
  stations: Station[],
  radiusKm: number,
): Station[] {
  return stations.filter((station) => distanceKm(lat, lon, station.lat, station.lon) <= radiusKm);
}

export function stationHasData(station: Station): boolean {
  if (station.data_available === false && station.aqi === null) {
    const values = station.iaqi ? Object.values(station.iaqi) : [];
    return values.some((value) => value !== null && value !== undefined);
  }
  return station.data_available !== false;
}

export function isFresh(
  station: Station,
  now: Date = new Date(),
): boolean {
  const measured = station.measured_at ?? station.time ?? null;
  if (!measured) return false;
  const timestamp = new Date(measured).getTime();
  if (Number.isNaN(timestamp)) return false;
  return now.getTime() - timestamp < STALE_AFTER_HOURS * 60 * 60 * 1000;
}

export function coverageBandForDistance(distanceKmValue: number): CoverageConfidence {
  if (distanceKmValue < CONFIDENCE_HIGH_MAX_KM) return "high";
  if (distanceKmValue < CONFIDENCE_MEDIUM_MAX_KM) return "medium";
  if (distanceKmValue < CONFIDENCE_LOW_MAX_KM) return "low";
  return "none";
}

export function coverageConfidence(
  distanceKmValue: number,
  station: Station,
  now: Date = new Date(),
): CoverageConfidence {
  if (!stationHasData(station) || !isFresh(station, now)) return "none";
  return coverageBandForDistance(distanceKmValue);
}

export function formatDistanceKm(distanceKmValue: number): string {
  if (distanceKmValue < 10) return `${distanceKmValue.toFixed(1)} km`;
  return `${Math.round(distanceKmValue)} km`;
}

export function coverageConfidenceLabel(confidence: CoverageConfidence): string {
  switch (confidence) {
    case "high":
      return "Cobertura alta";
    case "medium":
      return "Cobertura media";
    case "low":
      return "Cobertura baja";
    case "none":
      return "Sin cobertura";
  }
}

export function coverageConfidenceMessage(confidence: CoverageConfidence): string {
  switch (confidence) {
    case "high":
      return "Medición cercana y reciente: la estación más cercana está a menos de 5 km.";
    case "medium":
      return "Cobertura estimada: la estación más cercana está entre 5 y 20 km. Las áreas intermedias no son mediciones directas.";
    case "low":
      return "Cobertura débil: la estación más cercana está entre 20 y 50 km. El valor no representa el aire de este lugar.";
    case "none":
      return "Sin cobertura local en un radio de 50 km o con mediciones desactualizadas.";
  }
}

export type StationCoverageInfo = {
  nearestOther: NearestStationResult | null;
  withinRadii: Record<number, number>;
  directConfidence: CoverageConfidence;
  totalStations: number;
};

export function stationCoverageInfo(
  station: Station,
  allStations: Station[],
  now: Date = new Date(),
): StationCoverageInfo {
  const others = allStations.filter((candidate) => candidate.uid !== station.uid);
  const nearestOther = nearestStation(station.lat, station.lon, others);
  const withinRadii: Record<number, number> = {};
  for (const radius of COVERAGE_RADII_KM) {
    withinRadii[radius] = stationsWithinRadius(station.lat, station.lon, others, radius).length;
  }
  return {
    nearestOther,
    withinRadii,
    directConfidence: coverageConfidence(0, station, now),
    totalStations: allStations.length,
  };
}

export type PointCoverageMessage = {
  message: string;
  confidence: CoverageConfidence;
  nearest: NearestStationResult | null;
  hasStations: boolean;
};

export function pointCoverage(
  lat: number,
  lon: number,
  stations: Station[],
  now: Date = new Date(),
): PointCoverageMessage {
  if (stations.length === 0) {
    return { message: "No hay estaciones reales en esta región.", confidence: "none", nearest: null, hasStations: false };
  }
  const nearest = nearestStation(lat, lon, stations);
  if (!nearest) {
    return { message: "No hay estaciones reales en esta región.", confidence: "none", nearest: null, hasStations: false };
  }
  const confidence = coverageConfidence(nearest.distanceKm, nearest.station, now);
  const name = nearest.station.name;
  const distance = formatDistanceKm(nearest.distanceKm);
  return {
    message: `${coverageConfidenceLabel(confidence)}: la estación más cercana es "${name}" a ${distance}. ${coverageConfidenceMessage(confidence)}`,
    confidence,
    nearest,
    hasStations: true,
  };
}
