import type { Station } from "@/types/airQuality";

export type StationCluster = {
  id: string;
  lat: number;
  lon: number;
  stations: Station[];
};

export function shouldClusterStations(regionId: string, zoom: number, stationCount: number): boolean {
  return regionId === "argentina" && zoom <= 5 && stationCount >= 8;
}

export function clusterStations(stations: Station[], cellDegrees = 2): StationCluster[] {
  const grouped = new Map<string, Station[]>();
  for (const station of stations) {
    const key = `${Math.round(station.lat / cellDegrees) * cellDegrees}:${Math.round(
      station.lon / cellDegrees,
    ) * cellDegrees}`;
    grouped.set(key, [...(grouped.get(key) ?? []), station]);
  }
  return Array.from(grouped.entries()).map(([id, items]) => ({
    id,
    stations: items,
    lat: items.reduce((sum, station) => sum + station.lat, 0) / items.length,
    lon: items.reduce((sum, station) => sum + station.lon, 0) / items.length,
  }));
}
