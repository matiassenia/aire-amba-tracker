import type { Station } from "@/types/airQuality";

type WaqiMapStation = {
  uid?: unknown;
  lat?: unknown;
  lon?: unknown;
  aqi?: unknown;
  pol?: unknown;
  utime?: unknown;
  station?: {
    name?: unknown;
  };
};

export type WaqiMapBoundsResponse = {
  status?: unknown;
  data?: unknown;
};

export function parseAqi(value: unknown): number | null {
  if (value === "-" || value === null || value === undefined) return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function parseNumber(value: unknown): number | null {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function isWaqiMapStation(value: unknown): value is WaqiMapStation {
  return typeof value === "object" && value !== null;
}

export function parseWaqiMapBoundsResponse(json: WaqiMapBoundsResponse): Station[] | null {
  if (json.status !== "ok" || !Array.isArray(json.data)) return null;

  const stations = json.data.flatMap((item): Station[] => {
    if (!isWaqiMapStation(item)) return [];

    const uid = parseNumber(item.uid);
    const lat = parseNumber(item.lat);
    const lon = parseNumber(item.lon);
    const aqi = parseAqi(item.aqi);

    if (uid === null || lat === null || lon === null || aqi === null) return [];

    return [
      {
        uid,
        name: typeof item.station?.name === "string" ? item.station.name : `Station ${uid}`,
        lat,
        lon,
        aqi,
        dominentpol: typeof item.pol === "string" ? item.pol : undefined,
        time: typeof item.utime === "string" ? item.utime : undefined,
      },
    ];
  });

  return stations;
}
