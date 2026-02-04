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

function confidenceFromDistanceKm(d: number): ConfidenceLevel {
  if (d <= 5) return "high";
  if (d <= 12) return "medium";
  return "low";
}

export function buildZoneSnapshot(zone: Zone, stations: Station[]): ZoneAqiSnapshot {
  const center = zone.centroid;

  // 1) estaciones con distancia
  const stationsByDistance: NearestStationInfo[] = stations
    .filter((s) => Number.isFinite(s.lat) && Number.isFinite(s.lon) && Number.isFinite(s.aqi))
    .map((s) => ({
      uid: s.uid,
      name: s.name,
      lat: s.lat,
      lon: s.lon,
      aqi: s.aqi,
      distanceKm: haversineDistanceKm(center, { lat: s.lat, lon: s.lon }),
    }))
    .sort((a, b) => a.distanceKm - b.distanceKm);

  const nearestStations = stationsByDistance.slice(0, 3);

  // 2) detectar estación dentro del polígono
  const stationsInside = stations.filter((s) =>
    zone.polygon?.length ? pointInPolygon({ lat: s.lat, lon: s.lon }, zone.polygon) : false
  );

  const source: DataSourceType = stationsInside.length > 0 ? "REAL" : "ESTIMATED";

  // 3) AQI final
  let aqi = 0;

  if (source === "REAL") {
    // elegimos la más cercana al centro (pero dentro de la zona)
    const insideSorted = stationsInside
      .map((s) => ({
        station: s,
        d: haversineDistanceKm(center, { lat: s.lat, lon: s.lon }),
      }))
      .sort((a, b) => a.d - b.d);

    aqi = Math.round(insideSorted[0]?.station.aqi ?? 0);

    const confidence: ConfidenceLevel = "high";

    return {
      zoneId: zone.id,
      zoneName: zone.name,
      aqi,
      source,
      confidence,
      nearestStations,
      dominentpol: insideSorted[0]?.station.dominentpol,
      lastUpdated: insideSorted[0]?.station.time ?? null,
    };
  }

  // ESTIMATED: armamos samples para IDW (value = aqi)
  const samples: Sample[] = stations
    .filter((s) => Number.isFinite(s.lat) && Number.isFinite(s.lon) && Number.isFinite(s.aqi))
    .map((s) => ({ lat: s.lat, lon: s.lon, value: s.aqi }));

  const estimated = idwEstimate(center, samples, {
    k: 8,
    maxDistKm: 40,
    minPoints: 3,
    power: 2,
  });

  // ✅ Fallback: si IDW devuelve null, usamos promedio de las 3 más cercanas
  const fallbackAvg = (() => {
    const nearest = stationsByDistance.slice(0, 3); // podés subir a 5 si querés
    if (nearest.length === 0) return null;
    const sum = nearest.reduce((acc, s) => acc + s.aqi, 0);
    return sum / nearest.length;
  })();

  const finalEstimated = estimated ?? fallbackAvg;

  aqi = Math.round(finalEstimated ?? 0);

  // Confianza: si IDW falló -> low; si no, depende de distancia al vecino más cercano
  const d0 = nearestStations[0]?.distanceKm ?? 999;
  const confidence: ConfidenceLevel = estimated === null ? "low" : confidenceFromDistanceKm(d0);

  return {
    zoneId: zone.id,
    zoneName: zone.name,
    aqi,
    source,
    confidence,
    nearestStations,
    dominentpol: undefined,
    lastUpdated: null,
  };
}
