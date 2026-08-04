import type { Station, StationQueryMetadata } from "@/types/airQuality";
import { aqiCategory } from "@/lib/aqiHeatScale";
import { freshnessMultiplierForStation, pollutantValue, type PollutantKey } from "@/lib/pollutantHeat";

export type ThermalCoverageState = "loading" | "recent-data" | "expired-data-only" | "no-pollutant-data" | "no-stations";

export type PollutantMeasurement = {
  station: Station;
  value: number;
  category: string;
  measuredAt: string | null;
  ageHours: number | null;
  freshnessMultiplier: number;
};

export type ThermalCoverageSummary = {
  state: ThermalCoverageState;
  totalStations: number;
  stationsWithSelectedPollutant: number;
  recentStations: number;
  expiredStations: number;
  latestMeasurementAt: string | null;
  oldestMeasurementAt: string | null;
  latestAgeHours: number | null;
  heatFeatureCount: number;
  expiredMeasurements: PollutantMeasurement[];
  latestMeasurement: PollutantMeasurement | null;
};

const DATE_TIME_FORMATTER = new Intl.DateTimeFormat("es-AR", {
  timeZone: "America/Argentina/Buenos_Aires",
  day: "numeric",
  month: "short",
  year: "numeric",
  hour: "2-digit",
  minute: "2-digit",
  hour12: false,
});

function parseMeasurementDate(value: string | null | undefined): Date | null {
  if (!value) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

function ageHoursForMeasurement(measuredAt: string | null | undefined, now: Date): number | null {
  const measured = parseMeasurementDate(measuredAt);
  if (!measured) return null;
  return Math.max(0, (now.getTime() - measured.getTime()) / (1000 * 60 * 60));
}

export function formatMeasurementDate(value: string | null | undefined): string {
  const date = parseMeasurementDate(value);
  if (!date) return "Fecha no informada";
  return DATE_TIME_FORMATTER.format(date).replace(",", "");
}

export function formatAge(ageHours: number | null): string {
  if (ageHours === null) return "antigüedad no informada";
  if (ageHours < 1) return "hace menos de 1 hora";
  if (ageHours < 24) return `hace ${Math.round(ageHours)} ${Math.round(ageHours) === 1 ? "hora" : "horas"}`;
  const totalHours = Math.round(ageHours);
  const days = Math.floor(totalHours / 24);
  const hours = totalHours % 24;
  if (hours === 0) return `hace ${days} ${days === 1 ? "día" : "días"}`;
  return `hace ${days} ${days === 1 ? "día" : "días"} y ${hours} ${hours === 1 ? "hora" : "horas"}`;
}

export function latestMeasurementForPollutant(
  stations: Station[],
  pollutant: PollutantKey,
  now: Date = new Date(),
): PollutantMeasurement | null {
  return thermalCoverageState(stations, pollutant, 0, false, now).latestMeasurement;
}

export function thermalCoverageState(
  stations: Station[],
  pollutant: PollutantKey,
  heatFeatureCount: number,
  isLoading = false,
  now: Date = new Date(),
): ThermalCoverageSummary {
  const measurements = stations.flatMap((station) => {
    const value = pollutantValue(station, pollutant);
    if (value === null || !Number.isFinite(value)) return [];
    const measuredAt = station.measured_at ?? station.time ?? null;
    const ageHours = ageHoursForMeasurement(measuredAt, now);
    const freshnessMultiplier = freshnessMultiplierForStation(station, now);
    return [{ station, value, category: aqiCategory(value).label, measuredAt, ageHours, freshnessMultiplier }];
  });
  const sortedMeasurements = [...measurements].sort((a, b) => {
    const aTime = parseMeasurementDate(a.measuredAt)?.getTime() ?? 0;
    const bTime = parseMeasurementDate(b.measuredAt)?.getTime() ?? 0;
    return bTime - aTime;
  });
  const recentStations = measurements.filter((measurement) => measurement.freshnessMultiplier > 0).length;
  const expiredMeasurements = sortedMeasurements.filter((measurement) => measurement.freshnessMultiplier <= 0);
  const timestamps = measurements
    .map((measurement) => parseMeasurementDate(measurement.measuredAt)?.getTime() ?? null)
    .filter((value): value is number => value !== null);
  const latestTimestamp = timestamps.length ? Math.max(...timestamps) : null;
  const oldestTimestamp = timestamps.length ? Math.min(...timestamps) : null;
  const latestMeasurementAt = latestTimestamp === null ? null : new Date(latestTimestamp).toISOString();
  const oldestMeasurementAt = oldestTimestamp === null ? null : new Date(oldestTimestamp).toISOString();
  const latestAgeHours = latestMeasurementAt ? ageHoursForMeasurement(latestMeasurementAt, now) : null;
  let state: ThermalCoverageState = "recent-data";
  if (isLoading) state = "loading";
  else if (stations.length === 0) state = "no-stations";
  else if (measurements.length === 0) state = "no-pollutant-data";
  else if (recentStations === 0 && expiredMeasurements.length > 0 && heatFeatureCount === 0) state = "expired-data-only";

  return {
    state,
    totalStations: stations.length,
    stationsWithSelectedPollutant: measurements.length,
    recentStations,
    expiredStations: expiredMeasurements.length,
    latestMeasurementAt,
    oldestMeasurementAt,
    latestAgeHours,
    heatFeatureCount,
    expiredMeasurements,
    latestMeasurement: sortedMeasurements[0] ?? null,
  };
}

export function metadataWasUpdatedRecently(metadata: StationQueryMetadata | null | undefined, now: Date = new Date()): boolean {
  if (!metadata?.updated_at) return false;
  const ageHours = ageHoursForMeasurement(metadata.updated_at, now);
  return ageHours !== null && ageHours <= 24;
}
