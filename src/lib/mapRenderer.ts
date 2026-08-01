export type MapRenderer = "leaflet" | "maplibre";

export function resolveMapRenderer(value: string | undefined, isDev = false): MapRenderer {
  if (value === "maplibre" || value === "leaflet") return value;
  if (value && isDev) {
    console.warn(`VITE_MAP_RENDERER inválido: ${value}. Usando Leaflet.`);
  }
  return "leaflet";
}
