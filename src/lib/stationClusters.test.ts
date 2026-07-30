import { describe, expect, it } from "vitest";
import type { Station } from "@/types/airQuality";
import { clusterStations, shouldClusterStations } from "./stationClusters";

const stations: Station[] = [
  { uid: 1, name: "A", lat: -34.6, lon: -58.4, aqi: null },
  { uid: 2, name: "B", lat: -34.7, lon: -58.5, aqi: null },
  { uid: 3, name: "C", lat: -45.0, lon: -67.0, aqi: null },
];

describe("station clustering", () => {
  it("clusters only for national low-zoom views with enough stations", () => {
    expect(shouldClusterStations("argentina", 4, 8)).toBe(true);
    expect(shouldClusterStations("argentina", 6, 8)).toBe(false);
    expect(shouldClusterStations("amba", 4, 8)).toBe(false);
    expect(shouldClusterStations("argentina", 4, 7)).toBe(false);
  });

  it("groups nearby stations and keeps averaged real coordinates", () => {
    const clusters = clusterStations(stations);

    expect(clusters).toHaveLength(2);
    expect(clusters[0].stations.map((station) => station.uid)).toEqual([1, 2]);
    expect(clusters[0].lat).toBeCloseTo(-34.65);
    expect(clusters[0].lon).toBeCloseTo(-58.45);
  });
});
