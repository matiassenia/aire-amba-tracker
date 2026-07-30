import type { Station } from "@/types/airQuality";

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? "http://127.0.0.1:8000";

export async function fetchStations(): Promise<Station[] | null> {
  try {
    const response = await fetch(`${API_BASE_URL}/stations`);
    if (!response.ok) return null;

    return (await response.json()) as Station[];
  } catch (error) {
    console.error("Error fetching backend air quality data:", error);
    return null;
  }
}
