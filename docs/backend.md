# Backend

The backend is a FastAPI modular monolith under `backend/app`.

## Entrypoint

- App factory: `backend/app/main.py:create_app()`.
- ASGI target: `app.main:app` with `--app-dir backend`.
- Local command:

```powershell
python -m uvicorn app.main:app --app-dir backend --host 127.0.0.1 --port 8000
```

## Structure

| Path | Purpose |
| --- | --- |
| `backend/app/api` | FastAPI router, schemas, dependencies and error mapping. |
| `backend/app/application` | Use cases and ports. |
| `backend/app/domain` | Domain models, regions, boundary filter, coverage/freshness policy. |
| `backend/app/infrastructure` | Repositories and source connectors. |
| `backend/app/gis` | Spatial services, geometry utilities, loaders. |
| `backend/app/db` | SQLAlchemy engine/session and models. |
| `backend/alembic` | Migrations. |
| `backend/tests` | pytest suite. |

## Core Endpoints

| Method | Route | Purpose | Parameters | Response | Errors |
| --- | --- | --- | --- | --- | --- |
| GET | `/health` | Liveness and app version. | none | `{status, version}` | 500 if app boot fails. |
| GET | `/regions` | Public operational regions. | none | `RegionDto[]` | none expected. |
| GET | `/stations` | Station list from selected source. | `region`, `bounds`, `limit`, `offset` | `StationDto[]` | 422 for invalid query. |
| GET | `/stations/meta` | Metadata for last station query. | `region`, `bounds` | `StationQueryMetadataDto` | 404 if metadata unavailable. |
| GET | `/sources/status` | Source status list. | none | `SourceStatusDto[]` | none expected. |
| GET | `/zones` | Seed zones. | none | `ZoneDto[]` | none expected. |
| GET | `/zones/{zone_id}` | Single zone. | path `zone_id` | `ZoneDto` | 404-like domain errors. |
| GET | `/zones/{zone_id}/current` | Current calculated zone snapshot. | path `zone_id` | `ZoneCurrentDto` | source/config errors. |
| GET | `/stations/near` | Nearest stations to a point. | `lat`, `lon`, `radius_km`, `limit` | `NearestStationResultDto[]` | 422/domain validation. |
| GET | `/zones/contains` | Zones containing a point. | `lat`, `lon` | `ContainsResultDto` | validation errors. |
| GET | `/zones/intersects` | Zones intersecting polygon. | `polygon` | `IntersectsResultDto` | validation errors. |
| GET | `/zones/{zone_id}/geometry` | Zone geometry. | path `zone_id` | `GeometryDto` | geometry not found. |
| GET | `/stations/{station_id}/geometry` | Station geometry. | path `station_id` | `GeometryDto` | geometry not found. |
| GET | `/variables` | Environmental variable catalog. | none | `EnvironmentalVariableDto[]` | none expected. |
| GET | `/measurements` | Persisted measurements query. | `station_id`, `zone_id`, `variable_code`, `start`, `end`, `limit`, `offset` | `MeasurementDto[]` | validation errors. |
| GET | `/measurements/{station_id}` | Measurements for station. | `start`, `end`, `limit`, `offset` | `MeasurementDto[]` | validation errors. |
| GET | `/history` | Measurement history. | `start`, `end`, `limit`, `offset` | `MeasurementDto[]` | validation errors. |
| GET | `/zones/{zone_id}/history` | Zone snapshot history. | `start`, `end`, `limit`, `cursor` | `ZoneSnapshotHistoryDto[]` | validation errors. |
| GET | `/stations/{station_id}/history` | Station measurement history. | `start`, `end`, `limit`, `offset` | `MeasurementDto[]` | validation errors. |

## Example Responses

Health:

```json
{"status":"ok","version":"0.1.0"}
```

Station excerpt:

```json
{
  "uid": 8398,
  "name": "La boca, Buenos Aires, Argentina",
  "lat": -34.6344961,
  "lon": -58.3631337,
  "aqi": null,
  "measured_at": "2026-07-30T02:00:00+00:00",
  "source": "waqi",
  "iaqi": {"pm10": 14.0, "no2": 14.2, "co": 1.9}
}
```

## Station Source Selection

`get_station_repository()` selects by `STATION_DATA_SOURCE`:

- `waqi`: `WaqiStationRepository` using WAQI token/base URL/bounds/timeout.
- `postgis`: `SQLAlchemyStationRepository`.
- `in_memory`: seed station repository.

## Caching And Metadata

The WAQI station repository exposes `last_metadata(query_id)` used by `/stations/meta`. Metadata includes cache status, TTL, returned/deduplicated counts, filtered foreign stations, available pollutants, timestamps, and regional details.

## CORS

CORS is configured in `backend/app/main.py` with:

- `allow_origins=settings.cors_origins`
- `allow_origin_regex=settings.cors_origin_regex`
- wildcard origins rejected by settings validation.

## Logging And Request IDs

`backend/app/core/logging.py` exists for logging setup. Request ID behavior should be verified in that module before relying on it operationally.

## Tests

Backend tests cover API routes, CORS, boundary filtering, sources, station coverage, spatial services, repositories, logging, and history contracts. See [testing.md](testing.md).

## Limitations

- WAQI is the only active live station source by default.
- OpenAQ is readiness-only and not merged into `/stations`.
- History endpoints are contract-ready but depend on persisted measurements/snapshots.
- PostGIS requires explicit configuration and database availability.
