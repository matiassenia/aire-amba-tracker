# OpenAQ readiness

El puerto OpenAQ está **preparado pero bloqueado** a propósito: la plataforma sigue
funcionando solo con WAQI. `OPENAQ_ENABLED` es `false` por defecto, no se hicieron requests
de OpenAQ desde el backend en producción y no se almacenaron secretos en el repo.

## Qué se preparó

- `backend/app/infrastructure/sources/openaq.py`: conector OpenAQ v3 + parser de `/locations`.
  - Sin key: `source()` reporta `not_configured` y `fetch_raw()` lanza `ConfigurationError`.
  - Con key: `fetch_raw()` consulta `GET {base}/locations?iso=AR&limit=100&monitor=true`
    con el header `X-API-Key`.
- `backend/app/core/config.py`: `openaq_api_key`, `openaq_base_url`, `openaq_timeout_seconds`
  y `openaq_enabled` (default `false`). No se tocó `.env`.
- `backend/app/api/dependencies.py`: la fuente OpenAQ solo se registra en `/sources/status`
  cuando `OPENAQ_ENABLED=true`. Mientras sea `false`, no aparece en ningún endpoint.
- `backend/app/domain/station_coverage.py`: haversine, deduplicación WAQI+OpenAQ y política
  de confianza (alta <5 km fresca, media 5-20 km, baja 20-50 km, sin cobertura >50 km o dato
  viejo o sin contaminante).
- Tests con fixtures locales (`backend/tests/test_openaq_source.py`,
  `backend/tests/test_station_coverage.py`, `backend/tests/test_sources_status.py`); no
  requieren red ni secretos.

## Auditoría real con key (2026-08-01)

- OpenAQ `GET /locations?iso=AR&limit=100&monitor=true`: **8 locations argentinas**:
  CORDOBA (5241), CENTENARIO (5242), LA BOCA (5240), Buenos Aires/AirNow (225349),
  SPARTAN-CITEDEF (14 y 1285340, duplicado), EMC I Dock Sud (1212895), EMC II La Matanza (1212896).
- OpenAQ v3 **no expone AQI** (solo concentración + unidades por sensor) y `/locations` **no
  trae timestamps**; para frescura habría que consultar mediciones `latest` por location.
- `provider` llega como objeto `{id, name}` (no string); el parser lo normaliza.
- Dedup real con `station_coverage.deduplicate_stations()`: WAQI 30 + OpenAQ 8 → 35
  (3 duplicados removidos: LA BOCA, CORDOBA, SPARTAN autoduplicado). Regla ajustada:
  misma fuente+id, o **2 km** con mismo **nombre primario** (WAQI agrega
  ", Buenos Aires, Argentina"; p. ej. "La boca" vs "LA BOCA" difieren ~1 km).
- **Cobertura neta limitada**: las 8 locations OpenAQ suman pocas estaciones nuevas en AMBA
  (SPARTAN, AirNow, Dock Sud, La Matanza) y ninguna fuera de la región metropolitana.
- Hallazgo de frescura: las estaciones oficiales de CABA/AMBA en WAQI tenían datos de
  ~49 h en la auditoría; con la política del sprint (>24 h) quedan **sin cobertura** hasta
  que actualicen.

## Variables para configurar (localmente, en el `.env` de la raíz)

```
OPENAQ_API_KEY=tu_key
# Opcionales (tienen default):
# OPENAQ_BASE_URL=https://api.openaq.org/v3
# OPENAQ_TIMEOUT_SECONDS=5
# OPENAQ_ENABLED=false
```

No se modifica `.env` desde este repo/agente; lo agregás vos localmente. `OPENAQ_ENABLED`
queda en `false` hasta resolver el mapeo de AQI (ver "Qué falta").

## Cómo verificar que la key carga, sin imprimirla

```powershell
.\.venv\Scripts\python.exe -c "from app.core.config import get_settings; print('configured' if get_settings().openaq_api_key else 'missing')"
```

Devuelve `configured` o `missing` sin exponer el valor. También podés chequear el estado
del conector:

```python
from app.infrastructure.sources.openaq import OpenAQConnector
from app.core.config import get_settings
c = OpenAQConnector(api_key=get_settings().openaq_api_key)
print(c.is_configured, c.source().status)
```

## Consulta mínima para auditar cobertura en Argentina (una vez con key)

```powershell
curl -H "X-API-Key: TU_KEY" "https://api.openaq.org/v3/locations?iso=AR&limit=100&monitor=true"
```

La respuesta v3 no incluye AQI (solo concentración + unidades por sensor); para valores
se usarían endpoints de `latest`/measurements. Eso queda para la integración real.

## Qué falta para habilitar OpenAQ de verdad

1. Setear `OPENAQ_API_KEY` en `.env` (y en el host de producción) y verificar con el paso anterior.
2. Poner `OPENAQ_ENABLED=true` cuando el mapeo AQI esté resuelto y exista política de mezcla.
3. Conectar `OpenAQConnector` al repositorio de estaciones que hoy alimenta `/stations`
   (hoy NO está registrado como fuente de estaciones; `/sources/status` solo lo lista si está enabled).
4. Resolver **frescura**: consultar mediciones `latest` por location (hoy no hay `measured_at`).
5. Aplicar `deduplicate_stations()` al fusionar WAQI+OpenAQ (regla ajustada con datos reales:
   misma fuente+id, o **2 km** con mismo nombre primario).
6. Decidir el mapeo OpenAQ→modelo: OpenAQ no tiene AQI; derivar AQI desde concentraciones o
   exponer contaminantes por separado. **No mezclar concentraciones OpenAQ con AQI WAQI.**
7. Etiquetar fuente en la UI (el modelo ya guarda `source_id`/`metadata.provider`).

## Recordatorios

- No committear la key. No imprimirla en logs ni en respuestas.
- No activar OpenAQ como fuente por defecto mientras no esté el punto 4/6 resuelto.
- OpenAQ v2 está retirada (HTTP 410); v3 exige el header `X-API-Key` (401 sin él).
- La vista nacional hoy filtra estaciones extranjeras por polígono
  (`backend/app/domain/argentina_boundary.py`); OpenAQ entra ya filtrado por `iso=AR`.
