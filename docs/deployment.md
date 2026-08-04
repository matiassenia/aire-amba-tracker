# Deployment

## Frontend

The frontend is a Vite static build suitable for Vercel-style hosting.

Recommended settings:

| Setting | Value |
| --- | --- |
| Install command | `pnpm install` |
| Build command | `pnpm build` or `npm run build` |
| Output directory | `dist` |

Required production variable:

```text
VITE_API_BASE_URL=https://your-backend.example.com
```

Optional:

```text
VITE_MAP_RENDERER=maplibre
```

Changing any `VITE_*` variable requires a frontend redeploy.

## Backend

Render configuration exists in `render.yaml`:

```yaml
buildCommand: pip install .
startCommand: uvicorn app.main:app --app-dir backend --host 0.0.0.0 --port $PORT
```

Render env vars from `render.yaml`:

- `PYTHON_VERSION=3.13.5`
- `ENVIRONMENT=production`
- `SPATIAL_BACKEND=in_memory`
- `STATION_DATA_SOURCE=waqi`
- `CORS_ORIGINS=http://localhost:5173,http://127.0.0.1:5173,https://aire-ba.vercel.app`
- `WAQI_TOKEN` as secret (`sync: false`)

## CORS

Backend CORS must include the deployed frontend origin. The current settings also support Vercel preview origins via regex by default.

## Health Checks

Use:

```powershell
Invoke-WebRequest https://your-backend.example.com/health
```

Expected body:

```json
{"status":"ok","version":"0.1.0"}
```

## Deployment Checklist

1. Backend deploy finished.
2. `/health` returns 200.
3. `/regions` returns 200.
4. `/stations?region=argentina` returns 200.
5. CORS allows the frontend origin.
6. Frontend `VITE_API_BASE_URL` points to backend.
7. Frontend redeployed after env changes.
8. Map loads with selected renderer.
9. Browser console has no backend connection errors.
10. Test both AMBA and Argentina scopes.

## Operational Notes

- Render free plan may cold-start.
- WAQI token must be configured in backend environment.
- Do not store source tokens in Vercel frontend variables.
