import type { Station } from "@/types/airQuality";
import { aqiToVisualHeatWeight } from "@/lib/aqiHeatScale";
import { POLLUTANT_INFO } from "@/lib/pollutantInfo";

export type PollutantKey = "pm25" | "pm10" | "no2" | "o3" | "so2" | "co";

export type HeatPoint = {
  lat: number;
  lon: number;
  value: number;
  intensity: number;
  station: Station;
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

export function heatPointsForPollutant(
  stations: Station[],
  pollutant: PollutantKey,
): HeatPoint[] {
  return stations.flatMap((station) => {
    const value = pollutantValue(station, pollutant);
    if (value === null || !Number.isFinite(value)) return [];
    return [
      {
        lat: station.lat,
        lon: station.lon,
        value,
        intensity: aqiToVisualHeatWeight(value),
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
  if (regionId === "argentina") return zoom >= 7;
  return true;
}

export type HeatLayerConfig = {
  radius: number;
  blur: number;
  minOpacity: number;
  maxZoom: number;
};

// Configuración efectiva de leaflet.heat por región y cobertura.
// - Regional: manchas amplias y suaves (radio base 75 / blur 58), con halos
//   más locales cuando hay pocas estaciones (0.7x) para no pintar
//   continuidad falsa entre puntos distantes.
// - Nacional: mucho más contenido; se priorizan marcadores y clusters.
// - El radio se escala con el zoom para que el halo geográfico sea
//   aproximadamente constante y desaparezca gradualmente al alejarse.
// - maxZoom se ancla al zoom por defecto de la región: a ese zoom (y por
//   encima) leaflet.heat usa intensidad plena (factor v = 1).
export function heatLayerConfig(
  regionId: string,
  pointCount: number,
  zoom: number,
  defaultZoom = 9,
): HeatLayerConfig | null {
  if (!shouldShowHeatmap(regionId, zoom, pointCount)) return null;

  if (regionId === "argentina") {
    return { radius: 26, blur: 36, minOpacity: 0.12, maxZoom: 6 };
  }

  const localScale = pointCount < 4 ? 0.7 : 1;
  const zoomScale = Math.pow(2, zoom - defaultZoom);
  const radius = Math.round(Math.min(110, 75 * localScale * zoomScale));
  const blur = Math.round(Math.min(85, 58 * localScale * zoomScale));

  return { radius, blur, minOpacity: 0.2, maxZoom: defaultZoom };
}
