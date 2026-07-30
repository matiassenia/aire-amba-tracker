import type { Station } from "@/types/airQuality";

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? "http://127.0.0.1:8000";

type StationDto = Omit<Station, "aqi"> & { aqi?: number | null };

export async function fetchStations(): Promise<Station[]> {
  const response = await fetch(`${API_BASE_URL}/stations`);
  if (!response.ok) {
    throw new Error(`Backend stations request failed with status ${response.status}`);
  }

  const stations = (await response.json()) as StationDto[];
  return stations.map((station) => ({
    ...station,
    aqi: station.aqi ?? null,
  }));
}
