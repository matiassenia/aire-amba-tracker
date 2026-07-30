import type { Station } from "@/types/airQuality";
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

const NORMALIZATION_MAX: Record<PollutantKey, number> = {
  pm25: 75,
  pm10: 150,
  no2: 100,
  o3: 120,
  so2: 80,
  co: 15,
};

export function pollutantLabel(key: PollutantKey): string {
  return POLLUTANTS.find((pollutant) => pollutant.key === key)?.label ?? key.toUpperCase();
}

export function pollutantValue(station: Station, pollutant: PollutantKey): number | null {
  const value = station.iaqi?.[pollutant];
  return value === undefined ? null : value;
}

export function normalizePollutantIntensity(value: number, pollutant: PollutantKey): number {
  const normalized = value / NORMALIZATION_MAX[pollutant];
  const curved = Math.pow(Math.max(0, normalized), 0.72);
  return Math.max(0.08, Math.min(1, curved));
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
        intensity: normalizePollutantIntensity(value, pollutant),
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

export function shouldShowHeatmap(
  regionId: string,
  zoom: number,
  heatPointCount: number,
): boolean {
  if (heatPointCount < 2) return false;
  if (regionId === "argentina") return zoom >= 7 && heatPointCount >= 4;
  return true;
}
