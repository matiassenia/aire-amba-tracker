import { describe, expect, it } from "vitest";
import type { Station, Zone } from "@/types/airQuality";
import {
  buildZoneSnapshot,
  formatPollutant,
  getAqiColor,
  getAqiLabel,
  getConfidenceLevel,
  getContextualMessage,
} from "./aqiUtils";

describe("AQI presentation helpers", () => {
  it("maps AQI values to expected labels and colors", () => {
    expect(getAqiLabel(25)).toBe("Bueno");
    expect(getAqiLabel(75)).toBe("Moderado");
    expect(getAqiLabel(125)).toBe("Dañino para sensibles");
    expect(getAqiLabel(175)).toBe("Dañino");
    expect(getAqiLabel(250)).toBe("Muy dañino");
    expect(getAqiLabel(350)).toBe("Peligroso");
    expect(getAqiColor(25)).toBe("#4ADE80");
  });

  it("returns contextual messages without changing numeric data", () => {
    expect(getContextualMessage(42).message).toContain("Excelente");
    expect(getContextualMessage(180).message).toContain("evitar");
  });

  it("formats common pollutants", () => {
    expect(formatPollutant("pm25")).toBe("PM2.5");
    expect(formatPollutant("no2")).toBe("NO₂");
    expect(formatPollutant()).toBe("—");
  });

  it("maps station distance to confidence levels", () => {
    expect(getConfidenceLevel(4.9)).toBe("high");
    expect(getConfidenceLevel(8)).toBe("medium");
    expect(getConfidenceLevel(20)).toBe("low");
  });
});

describe("buildZoneSnapshot", () => {
  const zone: Zone = {
    id: "test-zone",
    name: "Test Zone",
    type: "partido",
    centroid: { lat: -34.6, lon: -58.4 },
    polygon: [
      [-34.61, -58.41],
      [-34.61, -58.39],
      [-34.59, -58.39],
      [-34.59, -58.41],
    ],
  };

  it("marks a zone as REAL when a station falls inside its polygon", () => {
    const stations: Station[] = [
      {
        uid: 1,
        name: "Inside",
        lat: -34.6,
        lon: -58.4,
        aqi: 55,
        dominentpol: "pm25",
        time: "2026-07-29T10:00:00Z",
      },
    ];

    expect(buildZoneSnapshot(zone, stations)).toMatchObject({
      aqi: 55,
      source: "REAL",
      confidence: "high",
      dominentpol: "pm25",
      lastUpdated: "2026-07-29T10:00:00Z",
    });
  });

  it("estimates a zone from nearby stations when no station is inside", () => {
    const stations: Station[] = [
      { uid: 1, name: "A", lat: -34.7, lon: -58.5, aqi: 40 },
      { uid: 2, name: "B", lat: -34.72, lon: -58.52, aqi: 60 },
      { uid: 3, name: "C", lat: -34.74, lon: -58.54, aqi: 80 },
    ];

    const snapshot = buildZoneSnapshot(zone, stations);

    expect(snapshot.source).toBe("ESTIMATED");
    expect(snapshot.aqi).toBeGreaterThan(0);
    expect(snapshot.nearestStations).toHaveLength(3);
  });
});
