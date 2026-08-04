import type { Region, Station, StationQueryMetadata } from "@/types/airQuality";

let apiBaseUrlLogged = false;
let backendStatusLogged: boolean | null = null;

function apiBaseUrl(): string {
  const configured = import.meta.env.VITE_API_BASE_URL;
  const baseUrl = configured
    ? configured.replace(/\/+$/, "")
    : import.meta.env.DEV
      ? "http://127.0.0.1:8000"
      : null;
  if (baseUrl) {
    if (import.meta.env.DEV && !apiBaseUrlLogged) {
      console.info("[API BASE URL]", baseUrl);
      apiBaseUrlLogged = true;
    }
    return baseUrl;
  }
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

async function apiFetch(path: string): Promise<Response> {
  const url = `${apiBaseUrl()}${path}`;
  if (import.meta.env.DEV) console.info("[API REQUEST]", url);
  try {
    return await fetch(url);
  } catch {
    throw new Error("No se pudo conectar al backend");
  }
}

export async function checkBackendHealth(): Promise<boolean> {
  try {
    const response = await apiFetch("/health");
    const online = response.ok;
    if (import.meta.env.DEV && backendStatusLogged !== online) {
      console.info(online ? "[BACKEND ONLINE]" : "[BACKEND OFFLINE]", apiBaseUrl());
      backendStatusLogged = online;
    }
    return online;
  } catch (error) {
    if (import.meta.env.DEV && backendStatusLogged !== false) {
      console.warn("[BACKEND OFFLINE]", apiBaseUrl(), error);
      backendStatusLogged = false;
    }
    return false;
  }
}

export async function fetchStations(region?: string): Promise<Station[]> {
  const response = await apiFetch(`/stations${query({ region })}`);
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
  const response = await apiFetch("/regions");
  if (!response.ok) {
    throw new Error(`Backend regions request failed with status ${response.status}`);
  }
  return (await response.json()) as Region[];
}

export async function fetchStationMetadata(region?: string): Promise<StationQueryMetadata> {
  const response = await apiFetch(`/stations/meta${query({ region })}`);
  if (!response.ok) {
    throw new Error(`Backend stations metadata request failed with status ${response.status}`);
  }
  return (await response.json()) as StationQueryMetadata;
}
