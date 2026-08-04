import type { Station } from "@/types/airQuality";

// Coarse frontend mirror of backend/app/domain/argentina_boundary.py.
// It is a country filter for station visualization, not cadastral geometry.
const ARGENTINA_BOUNDARY: readonly [number, number][] = [
  [-22.82, -67.1], [-22.1, -65.6], [-22.4, -63.6], [-23.6, -61.9], [-26, -59.3],
  [-27.5, -57.2], [-27.1, -54.9], [-25.59, -54.59], [-25.9, -54.2], [-26.8, -53.75],
  [-28.3, -54.9], [-30.5, -57.4], [-33, -58.4], [-34.1, -58.4], [-35, -57.5],
  [-37.6, -57], [-40.8, -59.8], [-41.4, -63.6], [-42.5, -64], [-43.4, -65.5],
  [-45.9, -67.4], [-47.7, -66.1], [-50.1, -68.5], [-52.33, -68.35], [-54.66, -65.75],
  [-55.05, -67.4], [-53.8, -69.4], [-51.9, -71], [-49.4, -72.2], [-47.3, -72.4],
  [-45.2, -72], [-43, -71.8], [-41.1, -71.5], [-38.9, -71.5], [-36.4, -70.7],
  [-34.5, -70.1], [-33, -69.9], [-30.5, -69.9], [-28, -69.1], [-25, -68.4],
  [-23, -67.2], [-22.82, -67.1],
];

export function pointInArgentina(lat: number, lon: number): boolean {
  if (lat <= -52 && lat >= -55.2 && lon >= -69.8 && lon <= -65.5) return true;
  let inside = false;
  for (let index = 0; index < ARGENTINA_BOUNDARY.length; index += 1) {
    const nextIndex = (index + 1) % ARGENTINA_BOUNDARY.length;
    const [latI, lonI] = ARGENTINA_BOUNDARY[index];
    const [latJ, lonJ] = ARGENTINA_BOUNDARY[nextIndex];
    const crossesLatitude = (latI > lat) !== (latJ > lat);
    if (!crossesLatitude) continue;
    const lonIntersect = lonI + (lat - latI) * (lonJ - lonI) / (latJ - latI);
    if (lonIntersect > lon) inside = !inside;
  }
  return inside;
}

export function isStationInsideArgentina(station: Pick<Station, "lat" | "lon">): boolean {
  return pointInArgentina(station.lat, station.lon);
}
