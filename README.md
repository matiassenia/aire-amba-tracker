# AireBA - Air Quality Map for Buenos Aires

**AireBA** is a React/Vite web app for visualizing current and estimated air quality across Buenos Aires and the AMBA region.

Live app: https://aire-ba.vercel.app/

The project is currently a frontend-only application. It consumes WAQI directly from the browser when a token is available and falls back to local demo data when it is not.

## Current Architecture

```text
React + TypeScript + Vite
        -> useAirQualityData hook
        -> WAQI map bounds API or local mock stations
        -> local parsing and normalization
        -> IDW interpolation for zones without direct station data
        -> Leaflet map, heat layer, zone polygons, summary panels
```

There is no backend, database, Redis, Celery, RAG, LangChain, or LangGraph in the current implementation.

## Data Flow

1. `src/pages/Index.tsx` selects the active scope: `caba`, `conurbano`, or `amba`.
2. `src/hooks/useAirQualityData.ts` loads stations.
3. If `VITE_WAQI_TOKEN` exists, the app calls WAQI map bounds for Buenos Aires.
4. `src/lib/waqi.ts` parses and validates usable station rows.
5. If WAQI is unavailable or malformed, the app uses `src/data/mockStations.ts`.
6. `src/lib/idw.ts` estimates AQI for zones without direct stations.
7. `src/lib/aqiUtils.ts` builds labels, confidence levels, colors, and selected-zone snapshots.
8. Leaflet renders the map, heat layer, particles, and zone polygons.

## Tech Stack

- React 18
- TypeScript
- Vite
- Tailwind CSS
- shadcn/Radix UI components
- Leaflet and React Leaflet
- Vitest
- ESLint
- npm

## Environment Variables

Create a local `.env` file if you want live WAQI data:

```bash
VITE_WAQI_TOKEN=your_waqi_token
```

Important: because this is currently a frontend-only app, any `VITE_*` variable is exposed to the browser. This is acceptable for local/demo usage only. A production version should move WAQI access behind a backend or serverless proxy.

## Run Locally

```bash
npm install
npm run dev
```

The dev server runs on `127.0.0.1:8080` by default.

## Quality Commands

```bash
npx tsc -b
npm run lint
npm test
npm run build
```

## Technical Decisions

- **Vite stays**: the current product is a SPA, so Next.js would add unnecessary complexity right now.
- **Leaflet stays**: it is enough for the current map requirements and avoids Mapbox operational cost.
- **No backend yet**: Sprint 1 focuses on stabilizing the frontend. Backend work is intentionally deferred.
- **No AI yet**: the project needs reliable structured data and history before an assistant or RAG adds real value.
- **npm is the package manager**: the Bun lockfile was removed to keep installs reproducible.
- **Mock data remains**: it keeps the app usable without a WAQI token, but the UI marks it as demo data.

## Project Status

Implemented:

- Interactive AMBA/CABA/Conurbano map.
- WAQI data path with parser validation.
- Mock fallback.
- IDW interpolation.
- Confidence labels.
- Mobile bottom-sheet interaction.
- Unit tests for core pure functions.

Not implemented yet:

- Backend API.
- Secure WAQI token proxy.
- Persistent history.
- PostgreSQL/PostGIS.
- Scheduled ingestion.
- Alerts.
- AI assistant.
- RAG.

## Next Engineering Direction

The next technical step is a small FastAPI backend that hides the WAQI token, validates external responses, and exposes a stable `/air-quality/current` endpoint for the frontend.
