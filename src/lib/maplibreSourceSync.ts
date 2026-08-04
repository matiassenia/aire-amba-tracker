import type { GeoJSONSource, Map as MapLibreMap } from "maplibre-gl";
import type { FeatureCollection } from "geojson";
import type { HeatFeatureCollection } from "@/lib/maplibreHeat";

export const MAPLIBRE_SOURCE_IDS = {
  heat: "air-quality-heat",
  historicalHeat: "air-quality-historical-heat",
  stations: "air-quality-stations",
  groups: "air-quality-visual-groups",
  historicalGroups: "air-quality-historical-groups",
  hotspot: "selected-hotspot",
} as const;

export type MapLibreSourceData = {
  heat: HeatFeatureCollection;
  historicalHeat?: FeatureCollection;
  stations: FeatureCollection;
  groups: FeatureCollection;
  historicalGroups?: FeatureCollection;
  hotspot: FeatureCollection;
};

export function syncMapLibreSources(map: Pick<MapLibreMap, "getSource">, data: MapLibreSourceData): void {
  (map.getSource(MAPLIBRE_SOURCE_IDS.heat) as GeoJSONSource | undefined)?.setData(data.heat);
  if (data.historicalHeat) (map.getSource(MAPLIBRE_SOURCE_IDS.historicalHeat) as GeoJSONSource | undefined)?.setData(data.historicalHeat);
  (map.getSource(MAPLIBRE_SOURCE_IDS.stations) as GeoJSONSource | undefined)?.setData(data.stations);
  (map.getSource(MAPLIBRE_SOURCE_IDS.groups) as GeoJSONSource | undefined)?.setData(data.groups);
  if (data.historicalGroups) (map.getSource(MAPLIBRE_SOURCE_IDS.historicalGroups) as GeoJSONSource | undefined)?.setData(data.historicalGroups);
  (map.getSource(MAPLIBRE_SOURCE_IDS.hotspot) as GeoJSONSource | undefined)?.setData(data.hotspot);
}
