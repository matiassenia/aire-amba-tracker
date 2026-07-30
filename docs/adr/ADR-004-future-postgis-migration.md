# ADR-004 Future PostGIS Migration

## Status

Accepted

## Decision

Sprint 3 keeps geometry as JSON and defers PostGIS.

## Rationale

The current goal is domain and architecture preparation, not spatial database behavior. Deferring PostGIS avoids premature operational complexity.

## Consequences

Future migration should replace JSON geometry persistence with PostGIS geometry columns and move spatial queries behind repository interfaces without changing domain models.
