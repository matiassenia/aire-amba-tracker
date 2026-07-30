# ADR-003 GIS Module

## Status

Accepted

## Decision

GIS-specific code lives in `backend/app/gis/`, and future official data files live under top-level `gis/` folders.

## Rationale

Geographic calculations, loaders, and future PostGIS adapters should not be mixed with business use cases or source connectors.

## Consequences

Sprint 3 adds lightweight polygon, bounding-box, centroid, and future loader integration points. It does not download official GeoJSON.
