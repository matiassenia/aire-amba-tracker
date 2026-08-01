# ADR-008 National Station Boundary Filter and Data Freshness Policy

## Status

Accepted

## Decision

1. **Geometric national filter.** Stations served by `/stations` must fall inside the
   national territory, decided geometrically by point-in-polygon against
   `ARGENTINA_BOUNDARY` (`backend/app/domain/argentina_boundary.py`), never by an optional
   `country_id` field. WAQI's `/map/bounds` responses do not populate `country_id` reliably,
   so field-based filtering is not trustworthy. The filter is applied at ingestion time in
   `WaqiRepository`; foreign stations are dropped from the station list and their count and
   IDs are exposed as `foreign_stations_filtered` / `foreign_stations_ids` in query metadata.

2. **Single freshness policy.** Data freshness is governed by one policy shared by backend
   and frontend: `recent` when `age <= 6 h`, `stale` when `age > 24 h`, `aging` between,
   `unknown` when no timestamp is available. A station without fresh-enough data (or without
   an AQI value) contributes **no coverage** and no heatmap point, even if geographically
   close.

## Rationale

- A real audit on 2026-08-01 showed 17 of 30 national WAQI stations were Chilean, reached
  through the NOA/Patagonia bounding boxes. Counting them inflated coverage of Argentine
  cities. The national view now reports 13 stations, all within the boundary polygon.
- The polygon is verified against real Argentine and foreign station coordinates and keeps
  the previously failing edge cases (Misiones/Iguazú, eastern Tierra del Fuego).
- An honest coverage layer must distinguish "a station exists nearby" from "a station exists
  nearby **with usable, fresh data**". The 49-hour-old official AMBA stations made CABA/AMBA
  look covered while the data was effectively unusable.

## Consequences

- The boundary polygon must be maintained: an accuracy of ~5 km against IGN 1:250k is enough
  for a regional/air-quality product; coastal and island edges should be reviewed against a
  trusted source (INDEC/IGN shapefile) when it becomes available, not left to memory.
- The `measured_at` timestamp becomes a first-class quality signal: `station_coverage` skips
  non-fresh stations, `pollutantHeat` excludes them, and the map UI labels them `aging`/`stale`
  instead of presenting them as current.
- Backend and frontend constants must stay in sync manually (`RECENT_AFTER_HOURS=6`,
  `STALE_AFTER_HOURS=24`); a shared contract test is the intended guard.
- Foreign-station counts are metadata, not an error: the UI shows a banner when
  `foreign_stations_filtered > 0`.
