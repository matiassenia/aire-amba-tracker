# Architecture Decision Records

This index lists the ADRs currently present in `docs/adr`. Dates are not included in the ADR files, so this index does not invent them.

| ADR | Title | Status | Decision Summary |
| --- | --- | --- | --- |
| [ADR-001](ADR-001-domain-geography.md) | Domain Geography | Accepted | Model geography as `Country -> Province -> Municipality -> Zone`, with `AdministrativeArea` as optional grouping. |
| [ADR-002](ADR-002-environmental-variables.md) | Environmental Variables | Accepted | Treat environmental variables as first-class domain entities through `EnvironmentalVariableRepository`. |
| [ADR-003](ADR-003-gis-module.md) | GIS Module | Accepted | Keep GIS-specific code under `backend/app/gis/` and future source data under top-level `gis/`. |
| [ADR-004](ADR-004-future-postgis-migration.md) | Future PostGIS Migration | Accepted | Keep Sprint 3 geometry as JSON and defer native PostGIS migration. |
| [ADR-005](ADR-005-spatial-engine.md) | Spatial Engine | Accepted | Introduce `SpatialService` and `GeometryRepository`; use PostGIS as production-capable backend and SQLite/in-memory for development. |
| [ADR-006](ADR-006-real-postgis-repository.md) | Real PostGIS Repository | Accepted | Implement `PostGISGeometryRepository` in infrastructure with PostGIS spatial functions and no domain coupling. |
| [ADR-007](ADR-007-satellite-observation-layer.md) | Satellite Observation Layer | Accepted; implementation deferred | Treat future satellite observations as a separate layer, never mixed into station-derived AQI heatmaps. |
| [ADR-008](ADR-008-national-filter-and-freshness.md) | National Station Boundary Filter and Data Freshness Policy | Accepted | Filter stations geometrically against Argentina and treat freshness as a first-class data-quality signal. |

## Maintenance

- Add a new ADR when introducing a durable architectural or product-data decision.
- Keep ADRs immutable except for typo/format fixes; supersede instead of rewriting history.
- Update this index whenever an ADR is added or superseded.
