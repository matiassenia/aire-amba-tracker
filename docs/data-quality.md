# Data Quality And Freshness

## Pollutants

The frontend pollutant keys are:

| Key | Label | Source field |
| --- | --- | --- |
| `pm25` | PM2.5 | `station.iaqi.pm25` |
| `pm10` | PM10 | `station.iaqi.pm10` |
| `no2` | NO2 | `station.iaqi.no2` |
| `o3` | O3 | `station.iaqi.o3` |
| `so2` | SO2 | `station.iaqi.so2` |
| `co` | CO | `station.iaqi.co` |

`pollutantValue(station, pollutant)` reads `iaqi[selectedPollutant]`. It does not use `station.aqi` for pollutant-specific heatmaps.

## AQI Categories

Categories and colors are defined in `src/lib/aqiHeatScale.ts`:

| Range | Label |
| --- | --- |
| 0-50 | Bueno |
| 51-100 | Moderado |
| 101-150 | Dañino para grupos sensibles |
| 151-200 | Dañino |
| 201-300 | Muy dañino |
| 301+ | Peligroso |

The category is absolute. Freshness affects visual weight/opacity, not category.

## Station Fields

| Field | Meaning |
| --- | --- |
| `uid` | External station identifier. |
| `name` | Station display name. |
| `lat`, `lon` | WGS84 coordinates. |
| `aqi` | Station dominant/global AQI if present; may be `null`. |
| `iaqi` | Pollutant-specific values used by the frontend. |
| `dominant_variable` | Dominant pollutant if provided by source. |
| `measured_at` | Preferred measurement timestamp. |
| `time` | Source timestamp fallback. |
| `source` | Source id such as `waqi`. |
| `data_available` | Backend availability flag. |
| `region_id`, `region_name` | Operational region classification. |

## Freshness Rules For Current Thermal Maps

| Age | `freshnessMultiplier` | Current heatmap | Groups | Hotspot |
| --- | ---: | --- | --- | --- |
| 0-6 h | 1 | yes | yes | yes |
| 6-24 h | 0.75 | yes | yes | yes |
| 24-72 h | 0.35 | yes | yes | yes |
| >72 h | 0 | no | no | no |
| unknown timestamp | 0 | no | no | no |

Backend coverage confidence currently uses a stricter 24 h stale threshold in `station_coverage.py` for point-coverage confidence. Frontend thermal interpolation uses the 72 h cutoff in `pollutantHeat.ts`.

## Latest Measurements Mode

`Últimas mediciones` mode uses `src/lib/historicalThermal.ts` and includes last available pollutant values even when older than 72 h. It is visually and textually labeled as not current.

Historical age factor:

| Age | Factor |
| --- | ---: |
| <=72 h | 1 |
| 72-120 h | 0.65 |
| 120-168 h | 0.50 |
| 7-14 days | 0.35 |
| 14-30 days | 0.22 |
| >30 days or unknown | 0.12 |

## AMBA PM10 Example

Observed AMBA/Buenos Aires PM10 station data:

| Station | PM10 | Measurement time | Thermal current result |
| --- | ---: | --- | --- |
| La Boca | 14 | `2026-07-30T02:00:00+00:00` | excluded when older than 72 h |
| Centenario | 16 | `2026-07-30T02:00:00+00:00` | excluded when older than 72 h |
| Cordoba, Buenos Aires | 15 | `2026-07-30T02:00:00+00:00` | excluded when older than 72 h |

These stations still appear as old markers and in last-measurements mode.

## Last Measurement vs Last App Query

- `latestMeasurementAt`: latest environmental measurement timestamp from stations.
- `metadata.updated_at`: time when the backend/source query metadata was updated.

The UI displays both so users can see that the app queried recently even if stations did not publish newer measurements.
