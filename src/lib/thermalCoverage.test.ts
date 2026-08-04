import { describe, expect, it } from "vitest";
import type { Station, StationQueryMetadata } from "@/types/airQuality";
import {
  formatAge,
  formatMeasurementDate,
  latestMeasurementForPollutant,
  metadataWasUpdatedRecently,
  thermalCoverageState,
} from "./thermalCoverage";

const now = new Date("2026-08-03T23:15:00Z");

const ambaExpired: Station[] = [
  { uid: 8398, name: "La Boca", lat: -34.6344961, lon: -58.3631337, aqi: null, measured_at: "2026-07-30T02:00:00+00:00", source: "waqi", iaqi: { pm10: 14 } },
  { uid: 8399, name: "Centenario", lat: -34.635582, lon: -58.5518647, aqi: null, measured_at: "2026-07-30T02:00:00+00:00", source: "waqi", iaqi: { pm10: 16 } },
  { uid: 8400, name: "Cordoba", lat: -34.5995674, lon: -58.3915767, aqi: null, measured_at: "2026-07-30T02:00:00+00:00", source: "waqi", iaqi: { pm10: 15 } },
];

describe("thermalCoverageState", () => {
  it("detects three PM10 stations older than 72 hours as expired-data-only", () => {
    const summary = thermalCoverageState(ambaExpired, "pm10", 0, false, now);
    expect(summary.state).toBe("expired-data-only");
    expect(summary.totalStations).toBe(3);
    expect(summary.stationsWithSelectedPollutant).toBe(3);
    expect(summary.recentStations).toBe(0);
    expect(summary.expiredStations).toBe(3);
    expect(summary.heatFeatureCount).toBe(0);
    expect(summary.latestAgeHours).toBeCloseTo(117.25, 1);
  });

  it("keeps expired measurements available and sorted by most recent", () => {
    const older = { ...ambaExpired[0], uid: 1, measured_at: "2026-07-29T02:00:00+00:00", iaqi: { pm10: 20 } };
    const summary = thermalCoverageState([older, ...ambaExpired], "pm10", 0, false, now);
    expect(summary.expiredMeasurements).toHaveLength(4);
    expect(summary.latestMeasurement?.station.uid).toBe(8398);
    expect(latestMeasurementForPollutant([older, ...ambaExpired], "pm10", now)?.measuredAt).toBe("2026-07-30T02:00:00+00:00");
  });

  it("keeps recent data in the current behavior", () => {
    const recent: Station[] = [{ uid: 1, name: "Recent", lat: -34, lon: -58, aqi: null, measured_at: "2026-08-03T20:00:00Z", iaqi: { pm10: 40 } }];
    expect(thermalCoverageState(recent, "pm10", 1, false, now).state).toBe("recent-data");
  });

  it("differentiates pollutant absence, no stations and loading", () => {
    expect(thermalCoverageState([], "o3", 0, false, now).state).toBe("no-stations");
    expect(thermalCoverageState(ambaExpired, "o3", 0, false, now).state).toBe("no-pollutant-data");
    expect(thermalCoverageState(ambaExpired, "pm10", 0, true, now).state).toBe("loading");
  });
});

describe("thermal coverage formatting", () => {
  it("formats measurement dates in es-AR and Buenos Aires time", () => {
    expect(formatMeasurementDate("2026-07-30T02:00:00+00:00")).toMatch(/29 de jul de 2026 23:00/);
  });

  it("formats old ages as days and hours", () => {
    expect(formatAge(117.25)).toBe("hace 4 días y 21 horas");
  });

  it("detects recent app metadata separately from old measurements", () => {
    const metadata = { updated_at: "2026-08-03T22:30:00Z" } as StationQueryMetadata;
    expect(metadataWasUpdatedRecently(metadata, now)).toBe(true);
  });
});
