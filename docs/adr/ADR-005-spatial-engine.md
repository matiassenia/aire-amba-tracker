# ADR-005 Spatial Engine

## Status

Accepted

## Decision

The platform introduces a spatial engine boundary composed of `SpatialService` and `GeometryRepository`. PostGIS is the recommended production spatial backend, while SQLite remains supported for development through portable geometry fields and in-memory spatial repositories.

## Rationale

Spatial behavior should be expressed through application-facing interfaces, not through direct PostGIS calls in domain or API code. This keeps the domain independent from SQLAlchemy, GeoAlchemy2, and database-specific functions.

## Consequences

`GeoAlchemy2` may only be imported inside infrastructure. Alembic creates PostGIS extension, native geometry columns, and GIST/SP-GiST indexes only when running against PostgreSQL. SQLite migrations remain no-op for those native spatial features.

Future official datasets from IGN or other authorities should enter through `backend/app/gis/loaders.py` and top-level `gis/` folders, then be persisted behind `GeometryRepository`.
