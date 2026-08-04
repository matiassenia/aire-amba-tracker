import type { GeoJSONSource, Map as MapLibreMap } from "maplibre-gl";
import type { FeatureCollection } from "geojson";
import type { HeatFeatureCollection } from "@/lib/maplibreHeat";

export const MAPLIBRE_SOURCE_IDS = {
  heat: "air-quality-heat",
  stations: "air-quality-stations",
  groups: "air-quality-visual-groups",
  hotspot: "selected-hotspot",
} as const;

export type MapLibreSourceData = {
  heat: HeatFeatureCollection;
  stations: FeatureCollection;
  groups: FeatureCollection;
  hotspot: FeatureCollection;
};

export function syncMapLibreSources(map: Pick<MapLibreMap, "getSource">, data: MapLibreSourceData): void {
  (map.getSource(MAPLIBRE_SOURCE_IDS.heat) as GeoJSONSource | undefined)?.setData(data.heat);
  (map.getSource(MAPLIBRE_SOURCE_IDS.stations) as GeoJSONSource | undefined)?.setData(data.stations);
  (map.getSource(MAPLIBRE_SOURCE_IDS.groups) as GeoJSONSource | undefined)?.setData(data.groups);
  (map.getSource(MAPLIBRE_SOURCE_IDS.hotspot) as GeoJSONSource | undefined)?.setData(data.hotspot);
}
