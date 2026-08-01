# ADR-007 Satellite Observation Layer

## Status

Accepted (deferred implementation; design decision recorded)

## Context

Argentina has a sparse ground monitoring network (~13 WAQI stations visible nationwide). To increase spatial transparency, satellite observations of air pollutants were considered as a complement to the station-based heatmap.

## Decision

A satellite observation layer will be **a separate, clearly-labeled layer**, never mixed into the station-derived AQI heatmap. Sentinel-5P (TROPOMI) column density of NO2 is the first candidate product:

- It is the only operational satellite product with regular coverage over Argentina at a useful horizontal resolution (~3.5 x 5.5 km native, resampled grids are coarser).
- TEMPO (TROPOMI-like geostationary, high-frequency) covers only North America and does **not** cover Argentina.

## Rationale

Satellite retrievals measure **column density** (molecules/cm^2) of the total air column, not surface concentration, and are not directly comparable with AQI or in-situ concentrations reported by ground stations. Mixing both into a single heatmap would produce a misleading "seamless" map. Keeping them separate preserves trust: each layer declares its own unit, source, and uncertainty.

## Implementation Notes

- Separate UI toggle (off by default), separate legend, and its own data source id (`satellite`).
- Use the raw tropospheric NO2 column density product (e.g., S5P offline/OFFL) with cloud fraction filtering.
- Annotate every tile/render with the acquisition timestamp and instrument; do not interpolate between passes.
- Version the product version in the metadata so reprocessing does not silently change results.
- Treated as reference/context, never as the basis for zone snapshots or confidence scoring.

## Risks

- **Misinterpretation**: column density is routinely confused with ground-level concentration by end users.
- **Latency/revisit**: revisit time is days, not minutes; a "current" layer can be hours to days old.
- **Resolution**: regional gradients are visible; city-block conclusions are not supported.
- **Cloud/surface effects**: aerosols, clouds, and snow can bias retrievals; filtering is mandatory.
- No satellite product should be used to claim "no monitoring needed" in a zone: absence of a retrieval is absence of data, not clean air.

## Related

- ADR-005 Spatial Engine: satellite tiles would enter through the same spatial boundary as other geometry data.
- Station coverage transparency: the satellite layer complements, never replaces, the ground-station confidence policy (see `backend/app/domain/station_coverage.py`).
