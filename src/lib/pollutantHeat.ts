import type { Station } from "@/types/airQuality";
import { aqiToVisualHeatWeight } from "@/lib/aqiHeatScale";
import { POLLUTANT_INFO } from "@/lib/pollutantInfo";
import { stationFreshness } from "@/lib/stationFreshness";

export type PollutantKey = "pm25" | "pm10" | "no2" | "o3" | "so2" | "co";

export type HeatPoint = {
  lat: number;
  lon: number;
  value: number;
  intensity: number;
  visualWeight: number;
  freshnessMultiplier: number;
  station: Station;
};

export type HeatFreshnessBand = "fresh" | "stale" | "old" | "expired" | "unknown";

export type HeatDiagnostics = {
  stationsReceived: number;
  argentineStations: number;
  stationsWithPollutantValue: number;
  fresh: number;
  stale: number;
  old: number;
  unknown: number;
  expired: number;
  heatPointsGenerated: number;
};

export const POLLUTANTS: { key: PollutantKey; label: string }[] = Object.values(POLLUTANT_INFO).map(
  (pollutant) => ({ key: pollutant.key, label: pollutant.shortName }),
);

export function pollutantLabel(key: PollutantKey): string {
  return POLLUTANTS.find((pollutant) => pollutant.key === key)?.label ?? key.toUpperCase();
}

export function pollutantValue(station: Station, pollutant: PollutantKey): number | null {
  const value = station.iaqi?.[pollutant];
  return value === undefined ? null : value;
}

export function heatFreshnessBand(
  station: Station,
  now: Date = new Date(),
): HeatFreshnessBand {
  const measured = station.measured_at ?? station.time ?? null;
  const freshness = stationFreshness(measured, now);
  if (freshness.ageHours === null) return "unknown";
  if (freshness.ageHours <= 6) return "fresh";
  if (freshness.ageHours <= 24) return "stale";
  if (freshness.ageHours <= 72) return "old";
  return "expired";
}

export function freshnessMultiplierForStation(
  station: Station,
  now: Date = new Date(),
): number {
  switch (heatFreshnessBand(station, now)) {
    case "fresh":
      return 1;
    case "stale":
      return 0.75;
    case "old":
      return 0.35;
    case "expired":
    case "unknown":
      return 0;
  }
}

export function heatDiagnosticsForPollutant(
  stations: Station[],
  pollutant: PollutantKey,
  now: Date = new Date(),
): HeatDiagnostics {
  const diagnostics: HeatDiagnostics = {
    stationsReceived: stations.length,
    argentineStations: stations.filter((station) => station.region_id !== "foreign").length,
    stationsWithPollutantValue: 0,
    fresh: 0,
    stale: 0,
    old: 0,
    unknown: 0,
    expired: 0,
    heatPointsGenerated: 0,
  };

  for (const station of stations) {
    const value = pollutantValue(station, pollutant);
    if (value === null || !Number.isFinite(value)) continue;
    diagnostics.stationsWithPollutantValue += 1;
    const band = heatFreshnessBand(station, now);
    diagnostics[band] += 1;
    if (freshnessMultiplierForStation(station, now) > 0) {
      diagnostics.heatPointsGenerated += 1;
    }
  }

  return diagnostics;
}

// Los puntos térmicos se generan solo cuando hay dato y timestamp utilizable.
// La antigüedad reduce peso/opacidad visual, pero no cambia la categoría AQI.
export function heatPointsForPollutant(
  stations: Station[],
  pollutant: PollutantKey,
  now: Date = new Date(),
): HeatPoint[] {
  return stations.flatMap((station) => {
    const value = pollutantValue(station, pollutant);
    if (value === null || !Number.isFinite(value)) return [];
    const freshnessMultiplier = freshnessMultiplierForStation(station, now);
    if (freshnessMultiplier <= 0) return [];
    const visualWeight = aqiToVisualHeatWeight(value);
    return [
      {
        lat: station.lat,
        lon: station.lon,
        value,
        intensity: visualWeight * freshnessMultiplier,
        visualWeight,
        freshnessMultiplier,
        station,
      },
    ];
  });
}

export function availablePollutants(stations: Station[]): PollutantKey[] {
  return POLLUTANTS.map((pollutant) => pollutant.key).filter((key) =>
    stations.some((station) => pollutantValue(station, key) !== null),
  );
}

// Visibilidad del heatmap:
// - 0 puntos: nunca.
// - 1 estación: halo térmico local alrededor del punto (con mensaje de
//   cobertura muy limitada en la UI).
// - 2 o 3 estaciones: manchas locales e interpolación limitada.
// - 4 o más: heatmap regional normal.
// - Argentina: solo con zoom suficiente (vista nacional contenida).
// No se oculta la capa únicamente porque existan tres estaciones.
export function shouldShowHeatmap(
  regionId: string,
  zoom: number,
  heatPointCount: number,
): boolean {
  if (heatPointCount < 1) return false;
  if (regionId === "argentina") return zoom >= 2;
  return true;
}

export type HeatLayerConfig = {
  radius: number;
  blur: number;
  minOpacity: number;
  maxZoom: number;
};

// Máximo radio geográfico de influencia por estación. Más allá de este radio
// el halo no se amplía: no se conectan estaciones lejanas entre sí.
export function maxInfluenceRadiusKm(regionId: string, pointCount: number): number {
  if (regionId === "argentina") return 20;
  return pointCount < 4 ? 12 : 20;
}

export function pixelsPerKm(zoom: number, latitude: number = -34.6): number {
  const metersPerPixel = (156543.03392 * Math.cos((latitude * Math.PI) / 180)) / Math.pow(2, zoom);
  return 1000 / metersPerPixel;
}

export function capRadiusPixels(
  regionId: string,
  pointCount: number,
  baseRadius: number,
  zoom: number,
  latitude: number = -34.6,
): number {
  const maxInfluencePx = maxInfluenceRadiusKm(regionId, pointCount) * pixelsPerKm(zoom, latitude);
  return Math.min(baseRadius, maxInfluencePx);
}

// Configuración efectiva de leaflet.heat por región y cobertura.
// - Regional: manchas amplias y suaves (radio base 75 / blur 58), con halos
//   más locales cuando hay pocas estaciones (0.7x) para no pintar
//   continuidad falsa entre puntos distantes.
// - Nacional: mucho más contenido; se priorizan marcadores y clusters.
// - El radio se escala con el zoom para que el halo geográfico sea
//   aproximadamente constante y desaparezca gradualmente al alejarse.
// - El radio se limita además por un máximo de influencia por estación
//   (ver maxInfluenceRadiusKm) para no conectar estaciones lejanas.
// - maxZoom se ancla al zoom por defecto de la región: a ese zoom (y por
//   encima) leaflet.heat usa intensidad plena (factor v = 1).
export function heatLayerConfig(
  regionId: string,
  pointCount: number,
  zoom: number,
  defaultZoom = 9,
): HeatLayerConfig | null {
  if (!shouldShowHeatmap(regionId, zoom, pointCount)) return null;

  let radius: number;
  let blur: number;
  let minOpacity: number;
  let maxZoom: number;

  if (regionId === "argentina") {
    const zoomScale = Math.max(1, Math.pow(1.35, zoom - 2));
    radius = Math.round(Math.min(58, 34 * zoomScale));
    blur = Math.round(Math.min(62, 44 * zoomScale));
    minOpacity = 0.16;
    maxZoom = 6;
  } else {
    const localScale = pointCount < 4 ? 0.7 : 1;
    const zoomScale = Math.pow(2, zoom - defaultZoom);
    radius = Math.round(Math.min(110, 75 * localScale * zoomScale));
    blur = Math.round(Math.min(85, 58 * localScale * zoomScale));
    minOpacity = 0.2;
    maxZoom = defaultZoom;
  }

  const cappedRadius = capRadiusPixels(regionId, pointCount, radius, zoom);
  if (cappedRadius < radius) {
    blur = Math.max(14, Math.round(blur * (cappedRadius / radius)));
    radius = Math.round(cappedRadius);
  }

  return { radius, blur, minOpacity, maxZoom };
}
