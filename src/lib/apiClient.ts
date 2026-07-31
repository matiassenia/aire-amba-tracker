import type { Region, Station, StationQueryMetadata } from "@/types/airQuality";

function apiBaseUrl(): string {
  const configured = import.meta.env.VITE_API_BASE_URL;
  if (configured) return configured.replace(/\/+$/, "");
  if (import.meta.env.DEV) return "http://127.0.0.1:8000";
  throw new Error(
    "VITE_API_BASE_URL is not configured for production. " +
      "Set it in the Vercel project environment variables and redeploy."
  );
}

type StationDto = Omit<Station, "aqi"> & { aqi?: number | null };

function query(params: Record<string, string | undefined>): string {
  const search = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value) search.set(key, value);
  }
  const text = search.toString();
  return text ? `?${text}` : "";
}

export async function fetchStations(region?: string): Promise<Station[]> {
  const response = await fetch(`${apiBaseUrl()}/stations${query({ region })}`);
  if (!response.ok) {
    throw new Error(`Backend stations request failed with status ${response.status}`);
  }

  const stations = (await response.json()) as StationDto[];
  return stations.map((station) => ({
    ...station,
    aqi: station.aqi ?? null,
    data_available: station.data_available ?? station.aqi !== null,
  }));
}

export async function fetchRegions(): Promise<Region[]> {
  const response = await fetch(`${apiBaseUrl()}/regions`);
  if (!response.ok) {
    throw new Error(`Backend regions request failed with status ${response.status}`);
  }
  return (await response.json()) as Region[];
}

export async function fetchStationMetadata(region?: string): Promise<StationQueryMetadata> {
  const response = await fetch(`${apiBaseUrl()}/stations/meta${query({ region })}`);
  if (!response.ok) {
    throw new Error(`Backend stations metadata request failed with status ${response.status}`);
  }
  return (await response.json()) as StationQueryMetadata;
}
