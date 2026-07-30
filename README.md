# Argentina Environmental Platform

This project is a modular environmental intelligence platform prepared for Argentina-wide coverage.

The current product still renders an air-quality map, but the backend domain is no longer scoped to a single metropolitan area. It is structured to support multiple provinces, municipalities, zones, stations, environmental variables, and future official GIS data.

## Architecture

```text
Frontend React/Vite
        -> Backend API
        -> Application use cases
        -> Domain models
        -> Infrastructure repositories and source connectors
```

The backend is a modular monolith. Domain code must not depend on FastAPI, SQLAlchemy, HTTP clients, settings, external source details, or frontend code.

## Domain Geography

`Country` is the national boundary and top-level jurisdiction. Sprint 3 seeds only Argentina.

`Province` is the first-level Argentine jurisdiction. Provinces belong to a country and carry timezone and metadata for future official identifiers.

`AdministrativeArea` is a flexible planning or administrative grouping. It is separate from municipalities and zones because not every operational grouping is a municipality.

`Municipality` belongs to one province and is the owner of operational zones. In CABA, the autonomous city is represented as a municipality-like operational unit for consistency.

`Zone` is the environmental analysis unit used for snapshots. Every zone has `country_id`, `province_id`, `municipality_id`, centroid, polygon, timezone, and metadata. Current polygons are placeholders, not official boundaries.

`Station` is an observation point from a source connector. It may later be linked to country, province, and municipality after geocoding or GIS matching.

## Environmental Variables

The platform is prepared for AQI, PM2.5, PM10, NO2, SO2, CO, O3, UV, temperature, humidity, wind, pressure, noise, water quality, fire, and smoke.

Sprint 3 does not implement new source ingestion for these variables. It only models them through `EnvironmentalVariable` and `EnvironmentalVariableRepository`.

## GIS

`backend/app/gis/` contains only geographic utilities and future GIS integration points.

Sprint 4 adds a PostGIS-ready persistence model while keeping SQLite available for local development. Geometry is currently persisted through portable fields such as GeoJSON JSON, WKT, WKB hex, SRID, and bounding boxes. Future PostGIS migrations can replace or complement those columns with native geometry columns and GIST/SP-GiST indexes behind repository interfaces.

Sprint 4A introduces the first spatial engine boundary:

```text
API spatial endpoints
  -> SpatialService
      -> GeometryRepository
          -> in-memory GIS repository for SQLite/dev
          -> future PostGIS repository in infrastructure
```

`GeoAlchemy2` is isolated to infrastructure. Domain models never import PostGIS, GeoAlchemy2, SQLAlchemy, or FastAPI.

Spatial backend selection:

```bash
SPATIAL_BACKEND=in_memory  # default, SQLite/local development
SPATIAL_BACKEND=postgis    # PostgreSQL/PostGIS
```

When `SPATIAL_BACKEND=postgis`, spatial endpoints use `PostGISGeometryRepository` and PostGIS functions. There is no silent production fallback from PostgreSQL to in-memory.

PostGIS local development:

```bash
docker compose up -d postgis
$env:DATABASE_URL="postgresql+psycopg://postgres:postgres@127.0.0.1:5432/environmental_platform"
$env:SPATIAL_BACKEND="postgis"
.\.venv\Scripts\python.exe -m alembic upgrade head
```

PostGIS integration tests require an explicit URL:

```bash
$env:POSTGIS_TEST_DATABASE_URL="postgresql+psycopg://postgres:postgres@127.0.0.1:5432/environmental_platform"
.\.venv\Scripts\python.exe -m pytest backend -m postgis
```

Seed minimal PostGIS validation data:

```bash
$env:DATABASE_URL="postgresql+psycopg://postgres:postgres@127.0.0.1:5432/environmental_platform"
.\.venv\Scripts\python.exe -m backend.scripts.seed_postgis
```

End-to-end PostGIS validation flow from a clean checkout:

```bash
.\.venv\Scripts\python.exe -m pip install -e .
docker compose up -d postgis
docker compose ps
$env:DATABASE_URL="postgresql+psycopg://postgres:postgres@127.0.0.1:5432/environmental_platform"
$env:POSTGIS_TEST_DATABASE_URL="postgresql+psycopg://postgres:postgres@127.0.0.1:5432/environmental_platform_test"
$env:SPATIAL_BACKEND="postgis"
.\.venv\Scripts\python.exe -m alembic upgrade head
.\.venv\Scripts\python.exe -m backend.scripts.seed_postgis
.\.venv\Scripts\python.exe -m pytest backend
.\.venv\Scripts\python.exe -m pytest backend -m postgis -v
```

## PostGIS Validation Status

Current local validation status: blocked because Docker Desktop/PostGIS is not reachable from this environment. The Docker client reports that `dockerDesktopLinuxEngine` is unavailable. SQLite validation remains green, and PostGIS tests are present but skip unless `POSTGIS_TEST_DATABASE_URL` is configured.

Do not mark PostGIS as fully validated until:

- `docker compose ps` shows `postgis` healthy.
- `SELECT PostGIS_Version();` succeeds.
- `alembic upgrade head` and `alembic check` pass with PostgreSQL `DATABASE_URL`.
- `.\.venv\Scripts\python.exe -m pytest backend -m postgis -v` reports passed tests with zero skips.

SRID policy:

- SRID 4326 is required.
- PostGIS `geom` is the spatial source of truth when PostGIS is active.
- GeoJSON is the API/input-output format.
- WKT/WKB columns are auxiliary/legacy migration aids.
- Distance and radius parameters are public kilometers; PostGIS calculations use `geography` meters internally.

GIS module responsibilities:

- `geometry.py`: portable geometric utilities.
- `formats.py`: geometry format detection.
- `loaders.py`: GeoJSON loader and future Shapefile/IGN extension points.
- `repositories.py`: spatial repository implementations that are not business logic.
- `services.py`: service layer delegating spatial operations to repositories.
- `utils.py`: WKT/SRID helpers.

`gis/` is reserved for future official GeoJSON files:

```text
gis/
  countries/
  provinces/
  municipalities/
  zones/
```

No official GeoJSON is downloaded in Sprint 3. No PostGIS is used yet.

## Backend Endpoints

- `GET /health`
- `GET /zones`
- `GET /zones/{zone_id}`
- `GET /zones/{zone_id}/current`
- `GET /stations`
- `GET /sources/status`
- `GET /variables`
- `GET /measurements`
- `GET /measurements/{station_id}`
- `GET /history`
- `GET /zones/{zone_id}/history`
- `GET /stations/{station_id}/history`
- `GET /stations/near`
- `GET /zones/contains`
- `GET /zones/intersects`
- `GET /zones/{zone_id}/geometry`
- `GET /stations/{station_id}/geometry`

Historical endpoints are contract-ready. They return persisted measurements/snapshots once ingestion persistence is wired; Sprint 4 does not add new sources or analytics.

## Temporal Model

`backend/app/time/` contains time windows, aggregation periods, and timezone helpers. Supported snapshot aggregation periods are instant, hourly, daily, weekly, monthly, and yearly.

Repositories accept bounded filters and pagination primitives so future large datasets do not require loading full collections into memory.

## Environment Variables

Backend:

```bash
WAQI_TOKEN=your_waqi_token
DEMO_MODE=false
DATABASE_URL=sqlite:///./backend/dev.db
```

Frontend:

```bash
VITE_API_BASE_URL=http://127.0.0.1:8000
```

The frontend does not call WAQI directly and must not expose source tokens.

## Run Locally

Backend:

```bash
.\.venv\Scripts\python.exe -m alembic upgrade head
.\.venv\Scripts\python.exe -m uvicorn app.main:app --app-dir backend --reload
```

Frontend:

```bash
npm install
npm run dev
```

## Quality Commands

```bash
.\.venv\Scripts\python.exe -m ruff check backend
.\.venv\Scripts\python.exe -m mypy backend
.\.venv\Scripts\python.exe -m pytest backend
.\.venv\Scripts\python.exe -m alembic check
npx tsc -b --pretty false
npm test -- --run
npm run lint
```

## Current Limits

- Seed geometries are simplified placeholders.
- No PostGIS yet.
- No new external sources beyond existing connectors.
- No history, forecasting, authentication, multitenancy, queues, or AI.
