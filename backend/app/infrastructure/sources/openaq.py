from dataclasses import dataclass
from datetime import UTC, datetime
from hashlib import sha256
from typing import Any

import httpx
from pydantic import BaseModel, ConfigDict, Field, ValidationError, field_validator

from app.domain.errors import ConfigurationError, InvalidSourcePayloadError, SourceUnavailableError
from app.domain.models import (
    RawIngestionRecord,
    RawIngestionStatus,
    Source,
    SourceStatusValue,
)

OPENAQ_SOURCE_ID = "openaq"


def openaq_source(status: SourceStatusValue, error: str | None = None) -> Source:
    now = datetime.now(UTC)
    return Source(
        id=OPENAQ_SOURCE_ID,
        name="OpenAQ",
        provider="OpenAQ",
        reliability_tier="external_aggregator",
        status=status,
        last_error=error,
        last_success_at=now if status == SourceStatusValue.OK else None,
        last_failure_at=(
            now
            if status in {SourceStatusValue.UNAVAILABLE, SourceStatusValue.NOT_CONFIGURED}
            else None
        ),
    )


@dataclass(frozen=True)
class OpenAQLocation:
    id: int
    name: str
    lat: float
    lon: float
    country_code: str | None
    locality: str | None
    provider: str | None
    is_monitor: bool
    parameters: tuple[str, ...]
    units_by_parameter: dict[str, str]

    def __post_init__(self) -> None:
        if not (-90 <= self.lat <= 90) or not (-180 <= self.lon <= 180):
            raise ValueError("location coordinates are out of range")


class OpenAQCountry(BaseModel):
    model_config = ConfigDict(extra="allow")

    code: str | None = None


class OpenAQCoordinates(BaseModel):
    model_config = ConfigDict(extra="allow")

    latitude: float
    longitude: float

    @field_validator("latitude")
    @classmethod
    def validate_latitude(cls, value: float) -> float:
        if not -90 <= value <= 90:
            raise ValueError("latitude is out of range")
        return value

    @field_validator("longitude")
    @classmethod
    def validate_longitude(cls, value: float) -> float:
        if not -180 <= value <= 180:
            raise ValueError("longitude is out of range")
        return value


class OpenAQParameter(BaseModel):
    model_config = ConfigDict(extra="allow")

    name: str | None = None
    units: str | None = None


class OpenAQSensor(BaseModel):
    model_config = ConfigDict(extra="allow")

    id: int
    parameter: OpenAQParameter = Field(default_factory=OpenAQParameter)


class OpenAQLocationPayload(BaseModel):
    model_config = ConfigDict(extra="allow")

    id: int
    name: str | None = None
    locality: str | None = None
    country: OpenAQCountry = Field(default_factory=OpenAQCountry)
    provider: str | None = None
    isMonitor: bool = False
    coordinates: OpenAQCoordinates | None = None
    sensors: list[OpenAQSensor] = Field(default_factory=list)

    @field_validator("provider", mode="before")
    @classmethod
    def parse_provider(cls, value: Any) -> str | None:
        if isinstance(value, str):
            return value
        if isinstance(value, dict):
            name = value.get("name")
            return name if isinstance(name, str) else None
        return None


class OpenAQLocationsResponse(BaseModel):
    model_config = ConfigDict(extra="allow")

    results: list[OpenAQLocationPayload] = Field(default_factory=list)


def _normalize_parameter_name(name: str | None) -> str | None:
    if not name:
        return None
    normalized = name.strip().lower()
    return normalized or None


def _payload_hash(payload: object) -> str:
    return sha256(repr(payload).encode("utf-8")).hexdigest()


def parse_locations_payload(payload: object) -> tuple[OpenAQLocation, ...]:
    try:
        parsed = OpenAQLocationsResponse.model_validate(payload)
    except ValidationError as exc:
        raise InvalidSourcePayloadError("OpenAQ locations payload is invalid") from exc

    locations: list[OpenAQLocation] = []
    for item in parsed.results:
        if item.coordinates is None:
            continue
        parameters: dict[str, str] = {}
        for sensor in item.sensors:
            name = _normalize_parameter_name(sensor.parameter.name)
            if name is None:
                continue
            parameters.setdefault(name, sensor.parameter.units or "µg/m³")
        locations.append(
            OpenAQLocation(
                id=item.id,
                name=item.name or f"OpenAQ location {item.id}",
                lat=item.coordinates.latitude,
                lon=item.coordinates.longitude,
                country_code=item.country.code,
                locality=item.locality,
                provider=item.provider,
                is_monitor=item.isMonitor,
                parameters=tuple(sorted(parameters)),
                units_by_parameter=parameters,
            )
        )
    return tuple(locations)


class OpenAQConnector:
    """Port for the OpenAQ v3 API.

    The integration is intentionally BLOCKED until OPENAQ_API_KEY is configured:
    - source() reports not_configured without a key.
    - fetch_raw() raises ConfigurationError without a key.
    - With a key, fetch_raw() issues a real request against OPENAQ_BASE_URL.
    - parse_locations() converts the v3 /locations payload into OpenAQLocation records.

    OpenAQ does NOT expose an AQI index, only raw concentrations and units. This
    connector therefore does not map into NormalizedMeasurement (the WAQI pipeline
    is AQI-centric) and must not be merged with WAQI stations without the
    deduplication policy in app.domain.station_coverage.
    """

    def __init__(
        self,
        api_key: str | None,
        base_url: str = "https://api.openaq.org/v3",
        timeout_seconds: float = 5.0,
        transport: httpx.AsyncBaseTransport | None = None,
    ) -> None:
        self._api_key = api_key
        self._base_url = base_url.rstrip("/")
        self._timeout_seconds = timeout_seconds
        self._transport = transport

    @property
    def is_configured(self) -> bool:
        return bool(self._api_key)

    def source(self) -> Source:
        if not self.is_configured:
            return openaq_source(
                SourceStatusValue.NOT_CONFIGURED, "OpenAQ is not configured: set OPENAQ_API_KEY"
            )
        return openaq_source(SourceStatusValue.OK)

    async def fetch_raw(self) -> RawIngestionRecord:
        if not self.is_configured:
            raise ConfigurationError("OpenAQ is not configured: set OPENAQ_API_KEY")
        assert self._api_key is not None

        try:
            async with httpx.AsyncClient(
                timeout=self._timeout_seconds, transport=self._transport
            ) as client:
                response = await client.get(
                    f"{self._base_url}/locations",
                    params={"iso": "AR", "limit": 100, "monitor": "true"},
                    headers={"X-API-Key": self._api_key},
                )
                response.raise_for_status()
                payload: Any = response.json()
        except httpx.TimeoutException as exc:
            raise SourceUnavailableError("OpenAQ request timed out") from exc
        except httpx.HTTPStatusError as exc:
            raise SourceUnavailableError("OpenAQ returned an HTTP error") from exc
        except httpx.HTTPError as exc:
            raise SourceUnavailableError("OpenAQ request failed") from exc

        return RawIngestionRecord(
            source_id=OPENAQ_SOURCE_ID,
            connector_name="openaq",
            fetched_at=datetime.now(UTC),
            status=RawIngestionStatus.SUCCESS,
            payload=payload,
            payload_hash=_payload_hash(payload),
            metadata={"iso": "AR", "limit": "100"},
        )

    def parse_locations(self, raw: RawIngestionRecord) -> tuple[OpenAQLocation, ...]:
        return parse_locations_payload(raw.payload)
