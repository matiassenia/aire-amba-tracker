from pydantic import BaseModel


class ErrorPayload(BaseModel):
    error: dict[str, object]


class HealthResponse(BaseModel):
    status: str
    version: str


class PointDto(BaseModel):
    lat: float
    lon: float


class BoundingBoxDto(BaseModel):
    min_lat: float
    min_lon: float
    max_lat: float
    max_lon: float


class ZoneDto(BaseModel):
    id: str
    name: str
    country_id: str
    province_id: str
    municipality_id: str
    type: str
    centroid: PointDto
    polygon: list[tuple[float, float]]
    timezone: str
    metadata: dict[str, str]


class EnvironmentalVariableDto(BaseModel):
    id: str
    code: str
    name: str
    category: str
    default_unit: str
    metadata: dict[str, str]


class MeasurementDto(BaseModel):
    id: str
    source_id: str
    station_id: str
    environmental_variable_id: str
    measured_at: str
    received_at: str
    value: float
    unit: str
    normalized_value: float
    normalized_unit: str
    lat: float | None = None
    lon: float | None = None
    zone_id: str | None = None
    quality_flags: list[str]
    confidence: float
    metadata: dict[str, str]


class ZoneSnapshotHistoryDto(BaseModel):
    zone_id: str
    zone_name: str
    calculated_at: str
    valid_from: str
    valid_to: str
    aggregation_period: str
    calculation_version: str
    aqi: int
    method: str
    confidence: float
    freshness_minutes: int
    dominant_variable: str | None = None
    source: str
    quality_flags: list[str]
    quality_metadata: dict[str, str]


class StationDto(BaseModel):
    uid: int
    name: str
    lat: float
    lon: float
    aqi: int | None = None
    dominant_variable: str | None = None
    time: str | None = None


class GeometryDto(BaseModel):
    id: str
    owner_type: str
    owner_id: str
    format: str
    srid: int
    geometry: dict[str, object] | str | None
    bbox: BoundingBoxDto | None = None
    metadata: dict[str, str]


class ContainsResultDto(BaseModel):
    lat: float
    lon: float
    zones: list[ZoneDto]


class IntersectsResultDto(BaseModel):
    zones: list[ZoneDto]


class NearestStationResultDto(BaseModel):
    station: StationDto
    distance_km: float


class SourceStatusDto(BaseModel):
    id: str
    name: str
    provider: str
    status: str
    reliability_tier: str


class NearestStationDto(BaseModel):
    uid: int
    name: str
    lat: float
    lon: float
    aqi: int = 0
    distance_km: float


class ZoneCurrentDto(BaseModel):
    zone_id: str
    zone_name: str
    aqi: int
    source: str
    confidence: str
    nearest_stations: list[NearestStationDto]
    dominant_variable: str | None = None
    last_updated: str | None = None
    method: str
    freshness_minutes: int
    quality_flags: list[str]
