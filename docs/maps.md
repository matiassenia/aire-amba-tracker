# Maps

The app supports MapLibre Globe and Leaflet fallback. Both consume shared thermal helpers so business rules do not diverge between renderers.

## Basemap

- Tiles: CARTO Dark Matter raster tiles.
- Attribution: `© OpenStreetMap contributors © CARTO`.
- No commercial map token is required for the current basemap.

## MapLibre Globe

- Component: `src/components/map/MapLibreGlobe.tsx`.
- Projection: `globe` via `map.setProjection({ type: "globe" })`.
- Glyphs: `https://demotiles.maplibre.org/font/{fontstack}/{range}.pbf` for symbol labels.
- Camera helpers: `src/lib/maplibreGlobe.ts`.
- Globe camera animation uses `jumpTo` frames instead of `flyTo/easeTo` when projection is not explicit mercator.

## Leaflet Fallback

- Component: `src/components/map/LeafletMap.tsx`.
- Heat implementation: `leaflet.heat` wrapped by `src/components/HeatLayer.tsx`.
- Markers remain interactive with popups and detail panels.

## Sources

| Source ID | Content | Origin | Updated |
| --- | --- | --- | --- |
| `cartoDark` | Raster tiles | CARTO URL templates | Map style load/tile loading. |
| `air-quality-heat` | Current heat GeoJSON | `stationsToHeatGeoJSON` | On station/pollutant change. |
| `air-quality-historical-heat` | Latest-measurements heat GeoJSON | `stationsToHistoricalHeatGeoJSON` | On station/pollutant change. |
| `air-quality-stations` | Individual station points | `stationFeatureCollection` | On station/pollutant change. |
| `air-quality-visual-groups` | Current overview groups | `visualGroupsForStations` | On station/pollutant change. |
| `air-quality-historical-groups` | Latest-measurements groups | `historicalGroupFeatureCollection` | On station/pollutant change. |
| `selected-hotspot` | Current hotspot | `findPollutantHotspot` | On station/pollutant/hotspot change. |

## Layers

| Layer ID | Type | Source | Minzoom | Maxzoom | Purpose |
| --- | --- | --- | --- | --- | --- |
| `cartoDark` | raster | `cartoDark` | none | none | Basemap. |
| `air-quality-heatmap` | heatmap | `air-quality-heat` | none | none | Current thermal field. |
| `air-quality-historical-heatmap` | heatmap | `air-quality-historical-heat` | none | none | Latest-measurements thermal field, hidden unless latest mode is active. |
| `air-quality-overview-outer` | circle | `air-quality-visual-groups` | none | 8 | Large current overview halo. |
| `air-quality-overview-middle` | circle | `air-quality-visual-groups` | none | 8 | Middle current overview halo. |
| `air-quality-groups` | circle | `air-quality-visual-groups` | none | 8 | Current group core. |
| `air-quality-historical-overview` | circle | `air-quality-historical-groups` | none | 8 | Latest-measurements overview circle layer. |
| `selected-hotspot-outer` | circle | `selected-hotspot` | none | none | Hotspot pulse/halo. |
| `selected-hotspot-middle` | circle | `selected-hotspot` | none | none | Hotspot middle ring. |
| `selected-hotspot-core` | circle | `selected-hotspot` | none | none | Hotspot core. |
| `air-quality-stations` | circle | `air-quality-stations` | 7 | none | Individual station markers. |
| `air-quality-group-labels` | symbol | `air-quality-visual-groups` | none | 8 | Group station-count/old-data label. |

Declared order lives in `AIR_QUALITY_LAYER_ORDER`.

## Current vs Latest Measurements

- Current sources/layers are visible in `Actual` mode.
- Historical/latest sources/layers are visible in `Últimas mediciones` mode.
- Current and historical heat layers are separate; they are not visually merged.

## Globe Compatibility Notes

- Heatmap behavior on globe projection can differ from mercator. Overview circle layers provide a stable national/continental representation.
- Camera movement avoids `flyTo` unless projection is explicitly `mercator` to prevent globe easing warnings.
- Symbol labels require `glyphs`; missing glyphs can prevent labels from rendering correctly.

## Source Sync

`syncMapLibreSources()` calls `setData()` on known GeoJSON sources when they exist. It accepts optional historical data so current-only usage stays compatible.
