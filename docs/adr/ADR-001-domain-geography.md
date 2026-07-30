# ADR-001 Domain Geography

## Status

Accepted

## Decision

The geographic domain is modeled as `Country -> Province -> Municipality -> Zone`, with `AdministrativeArea` as a separate optional grouping concept.

## Rationale

Argentina-wide coverage requires removing assumptions that zones belong directly to a country or to one metropolitan region. Municipalities and zones have different responsibilities: municipalities are jurisdictions, while zones are environmental analysis units.

## Consequences

Every zone must carry country, province, municipality, centroid, polygon, timezone, and metadata. Current seed polygons are placeholders until official GIS data is integrated.
