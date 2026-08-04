# Testing

## Frontend Commands

```powershell
npm run lint
npm test
npm run build
npx tsc -b --pretty false
```

The repository has both `package-lock.json` and `pnpm-lock.yaml`; pnpm is recommended for install consistency, while scripts are npm-compatible.

## Backend Commands

```powershell
pytest backend
ruff check backend
mypy backend
```

If `ruff` or `mypy` are not installed in the active environment, install the project dev dependencies first. In the latest validation environment for this documentation pass, both commands were unavailable in PATH.

## Current Suite Coverage

Frontend suites include:

- AQI scale and utilities.
- Pollutant heat/freshness.
- Thermal coverage states.
- Historical thermal mode.
- Map renderer resolution.
- MapLibre camera/source/layer helpers.
- Argentina boundary filtering.
- Coverage and clustering helpers.
- EnvironmentalMap UI behavior.
- Index/EducationGuide behavior.

Backend suites include:

- API endpoints.
- CORS policy.
- Argentina boundary.
- WAQI connector.
- OpenAQ readiness connector.
- Source status.
- Station coverage/deduplication.
- Time windows.
- GIS geometry/loaders/repositories/spatial service.
- PostGIS integration tests that skip unless configured.
- History repositories and snapshot service.

## Latest Observed Counts

At the time of this documentation pass:

- Frontend: `208 passed`.
- Backend: `113 passed, 4 skipped`.

## PostGIS Tests

PostGIS tests require `POSTGIS_TEST_DATABASE_URL` and a reachable PostgreSQL/PostGIS instance. Without it, marked tests are skipped.
