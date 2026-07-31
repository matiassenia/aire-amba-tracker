import type {
  Station,
  Zone,
  ZoneAqiSnapshot,
  NearestStationInfo,
  ConfidenceLevel,
  DataSourceType,
} from "@/types/airQuality";

import { haversineDistanceKm, pointInPolygon } from "@/lib/geo/geojson";
import { idwEstimate, type Sample } from "@/lib/idw";
import { aqiColor, aqiLabel } from "@/lib/aqiHeatScale";

// -----------------------------
// UI helpers (colors, labels, copy)
// -----------------------------

// Delegamos color y label a la fuente única de categorías en aqiHeatScale:
// la clasificación y el significado del color dependen del AQI absoluto.
export function getAqiColor(aqi: number): string {
  return aqiColor(aqi);
}

export function getAqiLabel(aqi: number): string {
  return aqiLabel(aqi);
}

export function getContextualMessage(aqi: number): { emoji: string; message: string } {
  if (aqi <= 50) return { emoji: "🚶‍♂️", message: "Excelente día para actividades al aire libre" };
  if (aqi <= 100) return { emoji: "🟡", message: "Buen día para salir, evitá ejercicio intenso" };
  if (aqi <= 150) return { emoji: "⚠️", message: "Grupos sensibles deberían limitar actividades" };
  if (aqi <= 200) return { emoji: "🏠", message: "Mejor evitar actividades al aire libre" };
  return { emoji: "🚫", message: "Calidad del aire peligrosa, quedate en interiores" };
}

export function getConfidenceLabel(c: ConfidenceLevel): string {
  switch (c) {
    case "high":
      return "Alta";
    case "medium":
      return "Media";
    case "low":
      return "Baja";
    default:
      return "Media";
  }
}

export function formatPollutant(p?: string): string {
  if (!p) return "—";
  const key = p.toLowerCase();
  if (key === "pm25") return "PM2.5";
  if (key === "pm10") return "PM10";
  if (key === "o3") return "O₃";
  if (key === "no2") return "NO₂";
  if (key === "so2") return "SO₂";
  if (key === "co") return "CO";
  return p.toUpperCase();
}

export function getConfidenceLevel(distance_km: number): ConfidenceLevel {
  if (distance_km <= 5) return "high";
  if (distance_km <= 12) return "medium";
  return "low";
}



// -----------------------------
// Snapshot / estimation
// -----------------------------

function confidenceFromDistanceKm(d: number): ConfidenceLevel {
  return getConfidenceLevel(d);
}

export function buildZoneSnapshot(zone: Zone, stations: Station[]): ZoneAqiSnapshot {
  const center = zone.centroid;

  const stationsByDistance: NearestStationInfo[] = stations
    .filter(
      (s): s is Station & { aqi: number } =>
        Number.isFinite(s.lat) && Number.isFinite(s.lon) && s.aqi !== null && Number.isFinite(s.aqi)
    )
    .map((s) => ({
      uid: s.uid,
      name: s.name,
      lat: s.lat,
      lon: s.lon,
      aqi: s.aqi,
      distance_km: haversineDistanceKm(center, { lat: s.lat, lon: s.lon }),
    }))
    .sort((a, b) => a.distance_km - b.distance_km);

  const nearest_stations = stationsByDistance.slice(0, 3);

  const stationsInside = stations.filter(
    (s): s is Station & { aqi: number } =>
      s.aqi !== null &&
      Number.isFinite(s.aqi) &&
      (zone.polygon?.length ? pointInPolygon({ lat: s.lat, lon: s.lon }, zone.polygon) : false)
  );

  const source: DataSourceType = stationsInside.length > 0 ? "REAL" : "ESTIMATED";

  let aqi: number | null = null;

  if (source === "REAL") {
    const insideSorted = stationsInside
      .map((s) => ({
        station: s,
        d: haversineDistanceKm(center, { lat: s.lat, lon: s.lon }),
      }))
      .sort((a, b) => a.d - b.d);

    aqi = Math.round(insideSorted[0].station.aqi);

    const confidence: ConfidenceLevel = "high";

    return {
      zone_id: zone.id,
      zone_name: zone.name,
      aqi,
      source,
      confidence,
      nearest_stations,
      dominant_variable: insideSorted[0]?.station.dominant_variable,
      last_updated: insideSorted[0]?.station.time ?? null,
    };
  }

  const samples: Sample[] = stations
    .filter(
      (s): s is Station & { aqi: number } =>
        Number.isFinite(s.lat) && Number.isFinite(s.lon) && s.aqi !== null && Number.isFinite(s.aqi)
    )
    .map((s) => ({ lat: s.lat, lon: s.lon, value: s.aqi }));

  const estimated = idwEstimate(center, samples, {
    k: 8,
    maxDistKm: 40,
    minPoints: 3,
    power: 2,
  });

  const fallbackAvg = (() => {
    const nearest = stationsByDistance.slice(0, 3);
    if (nearest.length === 0) return null;
    const sum = nearest.reduce((acc, s) => acc + s.aqi, 0);
    return sum / nearest.length;
  })();

  const finalEstimated = estimated ?? fallbackAvg;

  aqi = finalEstimated === null ? null : Math.round(finalEstimated);

  const d0 = nearest_stations[0]?.distance_km ?? 999;
  const confidence: ConfidenceLevel = estimated === null ? "low" : confidenceFromDistanceKm(d0);

  return {
    zone_id: zone.id,
    zone_name: zone.name,
    aqi,
    source,
    confidence,
    nearest_stations,
    dominant_variable: undefined,
    last_updated: null,
  };
}
