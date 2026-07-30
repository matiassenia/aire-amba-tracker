from dataclasses import dataclass, field
from datetime import UTC, datetime, timedelta
from enum import StrEnum
from math import isfinite
from typing import Any


class ZoneType(StrEnum):
    COMMUNE = "commune"
    NEIGHBORHOOD = "neighborhood"
    ENVIRONMENTAL_AREA = "environmental_area"


class SourceStatusValue(StrEnum):
    OK = "ok"
    DEGRADED = "degraded"
    UNAVAILABLE = "unavailable"
    NOT_CONFIGURED = "not_configured"


class MeasurementMethod(StrEnum):
    MEASURED = "measured"
    ESTIMATED = "estimated"
    NEAREST_STATION_AVERAGE = "nearest_station_average"
    DEMO = "demo"


class RawIngestionStatus(StrEnum):
    SUCCESS = "success"
    FAILED = "failed"


class EnvironmentalVariableCategory(StrEnum):
    AIR_QUALITY = "air_quality"
    WEATHER = "weather"
    NOISE = "noise"
    WATER_QUALITY = "water_quality"
    FIRE = "fire"
    SMOKE = "smoke"


class GeometryFormat(StrEnum):
    GEOJSON = "geojson"
    WKT = "wkt"
    WKB = "wkb"
    SHAPEFILE = "shapefile"
    VECTOR_TILE = "vector_tile"


class SnapshotAggregationPeriod(StrEnum):
    INSTANT = "instant"
    HOURLY = "hourly"
    DAILY = "daily"
    WEEKLY = "weekly"
    MONTHLY = "monthly"
    YEARLY = "yearly"


@dataclass(frozen=True)
class Country:
    id: str
    iso_code: str
    name: str
    default_timezone: str


@dataclass(frozen=True)
class Province:
    id: str
    country_id: str
    name: str
    timezone: str
    metadata: dict[str, str] = field(default_factory=dict)


@dataclass(frozen=True)
class AdministrativeArea:
    id: str
    country_id: str
    province_id: str | None
    name: str
    type: str
    parent_id: str | None = None
    metadata: dict[str, str] = field(default_factory=dict)


@dataclass(frozen=True)
class Municipality:
    id: str
    country_id: str
    province_id: str
    name: str
    timezone: str
    administrative_area_id: str | None = None
    metadata: dict[str, str] = field(default_factory=dict)


@dataclass(frozen=True)
class Zone:
    id: str
    name: str
    country_id: str
    province_id: str
    municipality_id: str
    type: ZoneType
    centroid_lat: float
    centroid_lon: float
    polygon: tuple[tuple[float, float], ...]
    timezone: str
    metadata: dict[str, str] = field(default_factory=dict)


@dataclass(frozen=True)
class Source:
    id: str
    name: str
    provider: str
    reliability_tier: str
    status: SourceStatusValue
    last_error: str | None = None
    last_success_at: datetime | None = None
    last_failure_at: datetime | None = None


@dataclass(frozen=True)
class Station:
    id: str
    source_id: str
    external_id: str
    name: str
    lat: float
    lon: float
    country_id: str | None = None
    province_id: str | None = None
    municipality_id: str | None = None
    timezone: str | None = None
    metadata: dict[str, str] = field(default_factory=dict)
    active: bool = True


@dataclass(frozen=True)
class EnvironmentalVariable:
    id: str
    code: str
    name: str
    category: EnvironmentalVariableCategory
    default_unit: str
    metadata: dict[str, str] = field(default_factory=dict)


@dataclass(frozen=True)
class GeometryRecord:
    id: str
    owner_type: str
    owner_id: str
    format: GeometryFormat
    srid: int
    geometry: dict[str, Any] | str | bytes
    bbox: tuple[float, float, float, float] | None = None
    metadata: dict[str, str] = field(default_factory=dict)


@dataclass(frozen=True)
class TimeWindow:
    start: datetime
    end: datetime

    def __post_init__(self) -> None:
        if self.start.tzinfo is None or self.end.tzinfo is None:
            raise ValueError("time window timestamps must include timezone")
        if self.start >= self.end:
            raise ValueError("time window start must be before end")

    @classmethod
    def trailing(cls, duration: timedelta, now: datetime | None = None) -> "TimeWindow":
        end = now or utc_now()
        if end.tzinfo is None:
            raise ValueError("time window end must include timezone")
        return cls(start=end - duration, end=end)


@dataclass(frozen=True)
class Page:
    limit: int = 100
    offset: int = 0

    def __post_init__(self) -> None:
        if not (1 <= self.limit <= 1000):
            raise ValueError("page limit must be between 1 and 1000")
        if self.offset < 0:
            raise ValueError("page offset cannot be negative")


@dataclass(frozen=True)
class CursorPage:
    limit: int = 100
    cursor: str | None = None

    def __post_init__(self) -> None:
        if not (1 <= self.limit <= 1000):
            raise ValueError("cursor page limit must be between 1 and 1000")


@dataclass(frozen=True)
class MeasurementFilter:
    station_id: str | None = None
    zone_id: str | None = None
    variable_code: str | None = None
    time_window: TimeWindow | None = None
    page: Page = field(default_factory=Page)


@dataclass(frozen=True)
class Measurement:
    id: str
    source_id: str
    station_id: str
    environmental_variable_id: str
    measured_at: datetime
    received_at: datetime
    value: float
    unit: str
    normalized_value: float
    normalized_unit: str
    lat: float | None = None
    lon: float | None = None
    zone_id: str | None = None
    metadata: dict[str, str] = field(default_factory=dict)
    quality_flags: tuple[str, ...] = field(default_factory=tuple)
    confidence: float = 1.0


@dataclass(frozen=True)
class NormalizedMeasurement:
    source_id: str
    station_external_id: str
    station_name: str
    lat: float
    lon: float
    environmental_variable_code: str
    measured_at: datetime
    original_value: float
    original_unit: str
    normalized_value: float
    normalized_unit: str
    quality_flags: tuple[str, ...]
    confidence: float
    external_metadata: dict[str, str] = field(default_factory=dict)

    def __post_init__(self) -> None:
        if not (-90 <= self.lat <= 90) or not (-180 <= self.lon <= 180):
            raise ValueError("measurement coordinates are out of range")
        if self.measured_at.tzinfo is None:
            raise ValueError("measurement timestamp must include timezone")
        if not isfinite(self.original_value) or not isfinite(self.normalized_value):
            raise ValueError("measurement values must be finite numbers")
        if not self.original_unit.strip() or not self.normalized_unit.strip():
            raise ValueError("measurement units cannot be empty")
        if not (0 <= self.confidence <= 1):
            raise ValueError("measurement confidence must be between 0 and 1")
        normalized_code = self.environmental_variable_code.strip().lower()
        if not normalized_code:
            raise ValueError("environmental variable code cannot be empty")
        object.__setattr__(self, "environmental_variable_code", normalized_code)


@dataclass(frozen=True)
class RawIngestionRecord:
    source_id: str
    connector_name: str
    fetched_at: datetime
    status: RawIngestionStatus
    payload: dict[str, Any] | list[Any] | None
    payload_hash: str | None
    error_message: str | None = None
    metadata: dict[str, str] = field(default_factory=dict)

    def __post_init__(self) -> None:
        if self.fetched_at.tzinfo is None:
            raise ValueError("raw ingestion timestamp must include timezone")


@dataclass(frozen=True)
class Snapshot:
    zone_id: str
    zone_name: str
    centroid_lat: float
    centroid_lon: float
    calculated_at: datetime
    valid_from: datetime
    valid_to: datetime
    aggregation_period: SnapshotAggregationPeriod
    calculation_version: str
    aqi: int
    method: MeasurementMethod
    confidence: float
    freshness_minutes: int
    dominant_variable_code: str | None
    primary_source_id: str
    quality_flags: tuple[str, ...]
    quality_metadata: dict[str, str]
    nearest_stations: tuple[Station, ...]
    source_summary: tuple[Source, ...]


ZoneSnapshot = Snapshot


def utc_now() -> datetime:
    return datetime.now(UTC)
