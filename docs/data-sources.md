# Data Sources

## WAQI

WAQI is the active live station source.

Backend pieces:

- Source connector: `backend/app/infrastructure/sources/waqi.py`.
- Station repository: `backend/app/infrastructure/waqi_client.py`.
- Settings: `WAQI_TOKEN` or `WAQI_API_TOKEN`, `WAQI_BASE_URL`, `WAQI_TIMEOUT_SECONDS`, `WAQI_BOUNDS`.

WAQI map/bounds responses are rectangular. The backend filters stations geometrically against the Argentina boundary so Chilean/foreign stations returned by broad regional boxes are removed.

## Normalization

WAQI values are normalized into backend station DTOs with:

- `uid`
- `name`
- `lat`, `lon`
- `aqi`
- `dominant_variable`
- `time` / `measured_at`
- `source`
- `iaqi`
- `region_id`, `region_name`

The frontend uses `iaqi` for pollutant-specific maps.

## Metadata

`GET /stations/meta` exposes query metadata such as:

- cache hit / cache TTL
- discovered and returned stations
- deduplicated stations
- foreign stations filtered
- stations with data
- pollutants available
- timestamps received
- unavailable regions

## Cache

Frontend cache TTL is 10 minutes in `useAirQualityData.ts`. Backend WAQI metadata reports source cache information through `StationQueryMetadataDto`; consult the WAQI repository implementation for exact backend TTL behavior.

## Coverage Partiality

The backend metadata can mark `coverage_partial` and list `unavailable_regions`. The frontend displays partial coverage messaging when present.

## OpenAQ Readiness

OpenAQ is implemented as a readiness connector, not as an active station source.

- File: `backend/app/infrastructure/sources/openaq.py`.
- Settings: `OPENAQ_ENABLED`, `OPENAQ_API_KEY`, `OPENAQ_BASE_URL`, `OPENAQ_TIMEOUT_SECONDS`.
- When enabled, OpenAQ can appear in `/sources/status`.
- It is not merged into `/stations`.

Important limitation: OpenAQ v3 exposes concentration data and station/location metadata, not WAQI-style AQI. Do not mix OpenAQ concentrations with WAQI AQI until a documented conversion and freshness policy exists.

More detail: [openaq-readiness.md](openaq-readiness.md).

## Data Source Risks

- Station update frequency is controlled by the external source/station, not by this app.
- Sparse station coverage means heatmaps are interpolations from limited points.
- Source timestamps can be old even when the app query is recent.
- Rectangular source queries can include foreign stations unless filtered.
