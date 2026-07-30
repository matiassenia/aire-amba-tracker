# ADR-006 Real PostGIS Repository

## Status

Accepted

## Decision

Implement `PostGISGeometryRepository` as the production spatial repository. Spatial operations use PostGIS functions through SQLAlchemy in infrastructure. SQLite uses `InMemoryGeometryRepository` for local development.

## Rationale

PostGIS provides correct spatial predicates, indexes, geometry validation, and geography-based distance calculations. The domain and application layers should remain independent from database-specific geometry types.

## Implementation

`PostGISGeometryRepository` implements `GeometryRepository` with:

- `ST_Covers` for point containment so boundary points count as contained.
- `ST_Intersects` for exact geometry intersection.
- `ST_DWithin` with `geography` casts for radius queries in meters.
- `ST_Distance` with `geography` casts, returned as kilometers.
- `ST_Buffer` with `geography` meters, returned as a bounding box envelope.
- `ST_AsGeoJSON` for API serialization.
- `ST_GeomFromGeoJSON`, `ST_GeomFromText`, and `ST_SetSRID` in migrations/backfill.

## Source Of Truth

When PostGIS is active, native `geom` columns are the spatial source of truth. GeoJSON is an exchange format. WKT and WKB remain auxiliary migration formats and should not be treated as authoritative long term.

## Fallback Policy

`SPATIAL_BACKEND=in_memory` is the default for SQLite/local development. `SPATIAL_BACKEND=postgis` requires a PostgreSQL URL and enabled PostGIS extension. Production PostgreSQL deployments must not silently fall back to in-memory.

## Risks

Official datasets are not loaded yet. Invalid geometries are repaired only when detected during migration backfill. Distance calculations use WGS84 geography, which is appropriate for current point/radius queries but may need projected workflows for future advanced analytics.
