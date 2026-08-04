# Troubleshooting

## `ERR_CONNECTION_REFUSED`

Symptom: frontend shows backend offline or browser network request fails.

Cause: backend is not running or wrong host/port.

Diagnose:

```powershell
Invoke-WebRequest http://127.0.0.1:8000/health
```

Fix: start backend on `127.0.0.1:8000`.

## Port 8000 In Use / `WinError 10048`

Symptom: uvicorn cannot bind port.

Cause: another process is using 8000.

Diagnose:

```powershell
netstat -ano | findstr :8000
```

Fix: stop the other process or choose a different backend port and update `VITE_API_BASE_URL`.

## Vite Uses 8081 Instead Of 8080

Current config uses `strictPort: true`, so Vite should fail if 8080 is occupied instead of switching. If you see 8081, check that you are running this repo's `vite.config.ts`.

## CORS Failure

Symptom: backend responds but browser blocks request.

Cause: frontend origin is not in `CORS_ORIGINS` or preview regex.

Fix: add exact origin, redeploy backend, and avoid wildcard `*`.

## Production Frontend Cannot Reach API

Symptom: production build throws about missing API base or requests wrong URL.

Cause: `VITE_API_BASE_URL` missing or stale.

Fix: set `VITE_API_BASE_URL` in frontend host and redeploy.

## Backend Online But Map Empty

Check:

```powershell
Invoke-WebRequest http://127.0.0.1:8000/stations?region=argentina
Invoke-WebRequest http://127.0.0.1:8000/stations/meta?region=argentina
```

Possible causes:

- No stations for region.
- No selected pollutant values.
- Measurements older than 72 h, so current heat features are zero.
- Map renderer fallback due to WebGL/MapLibre failure.

## `heatFeatures = 0`

If stations exist and pollutant values exist, check timestamps. Current heatmaps exclude data older than 72 h and unknown timestamps.

Use `Últimas mediciones` mode to view old measurements explicitly.

## MapLibre `zoom expression` Error

MapLibre requires `zoom` expressions as top-level `step` or `interpolate` inputs. Overview opacity expressions are structured with top-level `interpolate` to satisfy this.

## MapLibre Missing Glyphs

Symbol text layers require a `glyphs` URL in the style. The app sets `MAPLIBRE_GLYPHS_URL` for group labels.

## `Easing around a point is not supported under globe projection`

Cause: `flyTo/easeTo` style movement under globe projection.

Fix in code: globe/non-explicit-mercator movement uses `jumpTo` animation frames; only explicit `mercator` may use `flyTo`.

## Globe Heatmap Looks Different From Leaflet

MapLibre globe and Leaflet mercator rendering are different engines. Overview circle layers provide stable national context; heatmaps remain visual interpolations.

## pnpm Ignored Builds / Mixed Package Managers

The repo contains `package-lock.json`, `pnpm-lock.yaml`, and a `pnpm-workspace.yaml` with `allowBuilds` entries for `@swc/core` and `esbuild`. Prefer one package manager per environment and approve native builds if pnpm prompts.

## Large Chunk Warning

Vite may warn that the lazy MapLibre chunk exceeds 500 kB. This is currently non-blocking.

## Browserslist Outdated

If shown, update browser data with:

```powershell
npx update-browserslist-db@latest
```

Only commit lockfile changes intentionally.
