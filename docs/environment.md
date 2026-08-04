# Environment

Do not commit real tokens. The repository contains `.env.example` and `backend/.env.example` with placeholders only. The current backend settings load `.env` from the repository root; `backend/.env.example` is a backend-focused reference for deployment or backend-only setups.

## Frontend Variables

| Variable | Required | Evaluated | Local example | Production example | Notes |
| --- | --- | --- | --- | --- | --- |
| `VITE_API_BASE_URL` | Required in production | Build/runtime via Vite env replacement | `http://127.0.0.1:8000` | Render backend URL | If missing in production, `apiClient.ts` throws. Changing it in Vercel requires redeploy. |
| `VITE_MAP_RENDERER` | Optional | Build/runtime via Vite env replacement | `maplibre` or `leaflet` | `maplibre` | Invalid values fall back to Leaflet with a dev warning. |

Frontend code must not access WAQI or OpenAQ secrets.

## Backend Variables

| Variable | Required | Default | Purpose | Risk |
| --- | --- | --- | --- | --- |
| `ENVIRONMENT` | Optional | `local` | `local`, `test`, `staging`, or `production`. | Invalid values fail settings validation. |
| `LOG_LEVEL` | Optional | `INFO` | Logging level used by backend logging setup. | Too verbose in production can leak operational detail. |
| `CORS_ORIGINS` | Optional but important | Local 8080/5173 and Vercel prod | Comma-separated or JSON list of allowed origins. | `*` is rejected; missing frontend origin causes CORS failure. |
| `CORS_ORIGIN_REGEX` | Optional | `https://.*\.vercel\.app` | Allows preview deployments. | Keep scoped to trusted preview domains. |
| `DATABASE_URL` | Optional | `sqlite:///./backend/dev.db` | SQLAlchemy DB URL. | Production PostgreSQL with `SPATIAL_BACKEND=in_memory` is rejected. |
| `SPATIAL_BACKEND` | Optional | `in_memory` | `in_memory` or `postgis`. | `postgis` requires PostgreSQL/PostGIS. |
| `STATION_DATA_SOURCE` | Optional | `waqi` | `waqi`, `in_memory`, or `postgis`. | `waqi` needs token for live data. |
| `DEMO_MODE` | Optional | `false` | Uses demo connector for snapshots when true. | Cannot be enabled in production. |
| `WAQI_TOKEN` | Required for live WAQI | None | WAQI token used by backend. | Secret; do not expose to frontend or commit. |
| `WAQI_API_TOKEN` | Alternative to `WAQI_TOKEN` | None | Also accepted by backend. | Secret. |
| `WAQI_BASE_URL` | Optional | `https://api.waqi.info` | Config value for station repository. | Keep HTTPS. |
| `WAQI_TIMEOUT_SECONDS` | Optional | `5.0` | WAQI HTTP timeout. | Must be positive. |
| `WAQI_BOUNDS` | Optional | AMBA bounds | Default connector bounds for measurement connector. | Four comma-separated coordinates required. |
| `OPENAQ_ENABLED` | Optional | `false` | Registers OpenAQ in `/sources/status` when true. | Does not make OpenAQ an active station source. |
| `OPENAQ_API_KEY` | Optional | None | OpenAQ v3 key for readiness connector. | Secret; integration is not operational by default. |
| `OPENAQ_BASE_URL` | Optional | `https://api.openaq.org/v3` | OpenAQ base URL. | v3 requires API key header. |
| `OPENAQ_TIMEOUT_SECONDS` | Optional | `5.0` | OpenAQ HTTP timeout. | Must be positive. |

## Local PowerShell Setup

```powershell
Copy-Item .env.example .env
# Edit .env and replace tokens locally.
```

## Production Notes

- Render backend secrets should be configured in Render dashboard; `render.yaml` marks `WAQI_TOKEN` as `sync: false`.
- Vite variables are baked into the frontend build; redeploy after changing `VITE_*`.
- Do not copy local `.env` values into documentation or issue comments.
