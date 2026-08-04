# Architecture

This document describes the architecture observed in the repository. It does not describe planned behavior unless explicitly marked as future/readiness.

## System Flow

```mermaid
flowchart TD
  UI[React UI] --> Hook[useAirQualityData]
  Hook --> Client[apiClient]
  Client --> API[FastAPI app]
  API --> Router[backend/app/api/router.py]
  Router --> UseCases[Application use cases]
  UseCases --> Ports[Application ports]
  Ports --> WaqiRepo[WaqiStationRepository]
  Ports --> MemoryRepos[In-memory repositories]
  Ports --> PostGIS[PostGIS repositories when configured]
  WaqiRepo --> WAQI[WAQI API]
  API --> Metadata[Station query metadata]
  Hook --> State[Coverage and freshness state]
  State --> Map{Renderer}
  Map --> MapLibre[MapLibreGlobe]
  Map --> Leaflet[LeafletMap]
```

## Runtime Boundaries

| Layer | Location | Responsibilities |
| --- | --- | --- |
| Frontend UI | `src/components`, `src/pages` | Region/pollutant selection, panels, current/latest modes, map rendering. |
| Frontend data | `src/hooks/useAirQualityData.ts`, `src/lib/apiClient.ts` | Backend requests, local cache, loading/offline state. |
| Frontend domain helpers | `src/lib/*` | AQI categories, freshness, coverage, MapLibre GeoJSON, historical thermal mode. |
| Backend API | `backend/app/api` | FastAPI routes, schemas, dependencies, errors. |
| Backend application | `backend/app/application` | Use cases and repository/source ports. |
| Backend domain | `backend/app/domain` | Models, regions, station coverage, national boundary, domain errors. |
| Infrastructure | `backend/app/infrastructure`, `backend/app/db` | WAQI/OpenAQ/demo connectors, repositories, SQLAlchemy/PostGIS adapters. |
| GIS | `backend/app/gis`, `gis/` | Spatial utilities, loaders, repository interfaces, future official GIS data. |

## Frontend To Backend Flow

```mermaid
sequenceDiagram
  participant Browser
  participant Hook as useAirQualityData
  participant Client as apiClient
  participant API as FastAPI
  participant Source as WAQI repository

  Browser->>Hook: selected scope changes
  Hook->>Client: checkBackendHealth() in DEV
  Client->>API: GET /health
  Hook->>Client: fetchRegions(), fetchStations(), fetchStationMetadata()
  Client->>API: GET /regions
  Client->>API: GET /stations?region=...
  Client->>API: GET /stations/meta?region=...
  API->>Source: list_stations(region/bounds)
  Source-->>API: normalized StationDto + metadata
  API-->>Client: JSON
  Client-->>Hook: typed data
  Hook-->>Browser: stations, regions, metadata, loading/error state
```

## Thermal Pipeline

```mermaid
flowchart LR
  Stations[Station[]] --> Pollutant[pollutantValue iaqi[selectedPollutant]]
  Pollutant --> Freshness[freshnessMultiplier]
  Freshness --> Current{<= 72h?}
  Current -- yes --> Heat[stationsToHeatGeoJSON / heatPointsForPollutant]
  Current -- yes --> Groups[visualGroupsForStations]
  Current -- yes --> Hotspot[findPollutantHotspot]
  Current -- no --> Expired[expired marker + latest measurements]
  Stations --> Historical[stationsToHistoricalHeatGeoJSON]
  Historical --> LatestMode[Últimas mediciones mode]
```

## Renderer Selection

```mermaid
flowchart TD
  Flag[VITE_MAP_RENDERER] --> Resolve[resolveMapRenderer]
  Resolve --> Leaflet[leaflet default/fallback]
  Resolve --> MapLibre[maplibre when configured]
  MapLibre --> WebGL{WebGL available?}
  WebGL -- yes --> Globe[MapLibre Globe]
  WebGL -- no --> Fallback[Leaflet fallback]
  Globe --> Fatal{fatal map error?}
  Fatal -- yes --> Fallback
```

## Configuration By Environment

- Frontend local default API base: `http://127.0.0.1:8000`.
- Frontend production requires `VITE_API_BASE_URL`; `apiClient.ts` throws if missing.
- Local Vite server is pinned to `127.0.0.1:8080` with `strictPort: true`.
- Backend reads settings from `.env` with no prefix via `pydantic-settings`.
- CORS defaults include local `8080`, local `5173`, `https://aire-ba.vercel.app`, and Vercel preview regex.

## Error Handling

- Browser fetch failures become `No se pudo conectar al backend`.
- Backend domain errors are mapped in `backend/app/api/errors.py`.
- MapLibre initialization failures trigger renderer fallback to Leaflet.
- Old data is not treated as backend failure; it becomes `expired-data-only` in the UI.

## Infrastructure Notes

- Render backend configuration is in `render.yaml`.
- Optional local PostGIS service is in `docker-compose.yml`.
- The frontend build is static and Vercel-compatible, but no Vercel config file was found.
