from datetime import UTC, datetime
from hashlib import sha256
from typing import Any

import httpx
from pydantic import BaseModel, ConfigDict, Field, ValidationError, field_validator

from app.application.ports import SourceConnector
from app.domain.errors import ConfigurationError, InvalidSourcePayloadError, SourceUnavailableError
from app.domain.models import (
    NormalizedMeasurement,
    RawIngestionRecord,
    RawIngestionStatus,
    Source,
    SourceStatusValue,
)

WAQI_SOURCE_ID = "waqi"


def waqi_source(status: SourceStatusValue, error: str | None = None) -> Source:
    now = datetime.now(UTC)
    return Source(
        id=WAQI_SOURCE_ID,
        name="WAQI",
        provider="World Air Quality Index",
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


class WaqiStationPayload(BaseModel):
    model_config = ConfigDict(extra="allow")

    name: str | None = None


class WaqiMapItem(BaseModel):
    model_config = ConfigDict(extra="allow")

    uid: int
    lat: float
    lon: float
    aqi: float
    pol: str | None = None
    utime: str | None = None
    station: WaqiStationPayload = Field(default_factory=WaqiStationPayload)

    @field_validator("aqi", mode="before")
    @classmethod
    def parse_aqi(cls, value: Any) -> float:
        if value in (None, "", "-"):
            raise ValueError("item does not include a numeric AQI")
        return float(value)


class WaqiMapResponse(BaseModel):
    status: str
    data: list[WaqiMapItem]


def _parse_measured_at(raw: str | None) -> datetime:
    if not raw:
        return datetime.now(UTC)
    try:
        return datetime.fromisoformat(raw.replace("Z", "+00:00")).astimezone(UTC)
    except ValueError:
        return datetime.now(UTC)


def _hash_payload(payload: object) -> str:
    return sha256(repr(payload).encode("utf-8")).hexdigest()


class WaqiConnector(SourceConnector):
    def __init__(self, token: str | None, bounds: str, timeout_seconds: float) -> None:
        self._token = token
        self._bounds = bounds
        self._timeout_seconds = timeout_seconds

    def source(self) -> Source:
        if not self._token:
            return waqi_source(SourceStatusValue.NOT_CONFIGURED, "WAQI token is not configured")
        return waqi_source(SourceStatusValue.OK)

    async def fetch_raw(self) -> RawIngestionRecord:
        if not self._token:
            raise ConfigurationError("WAQI token is not configured")

        try:
            async with httpx.AsyncClient(timeout=self._timeout_seconds) as client:
                response = await client.get(
                    "https://api.waqi.info/v2/map/bounds/",
                    params={"latlng": self._bounds, "token": self._token},
                )
                response.raise_for_status()
                payload = response.json()
        except httpx.TimeoutException as exc:
            raise SourceUnavailableError("WAQI request timed out") from exc
        except httpx.HTTPStatusError as exc:
            raise SourceUnavailableError("WAQI returned an HTTP error") from exc
        except httpx.HTTPError as exc:
            raise SourceUnavailableError("WAQI request failed") from exc

        return RawIngestionRecord(
            source_id=WAQI_SOURCE_ID,
            connector_name="waqi",
            fetched_at=datetime.now(UTC),
            status=RawIngestionStatus.SUCCESS,
            payload=payload,
            payload_hash=_hash_payload(payload),
            metadata={"bounds": self._bounds},
        )

    def parse(self, raw: RawIngestionRecord) -> tuple[NormalizedMeasurement, ...]:
        try:
            parsed = WaqiMapResponse.model_validate(raw.payload)
        except ValidationError as exc:
            raise InvalidSourcePayloadError() from exc

        if parsed.status != "ok":
            raise SourceUnavailableError("WAQI returned a non-ok status", {"status": parsed.status})

        return tuple(self._normalize_item(item) for item in parsed.data)

    def _normalize_item(self, item: WaqiMapItem) -> NormalizedMeasurement:
        return NormalizedMeasurement(
            source_id=WAQI_SOURCE_ID,
            station_external_id=str(item.uid),
            station_name=item.station.name or f"External station {item.uid}",
            lat=item.lat,
            lon=item.lon,
            environmental_variable_code="aqi",
            measured_at=_parse_measured_at(item.utime),
            original_value=item.aqi,
            original_unit="AQI",
            normalized_value=item.aqi,
            normalized_unit="AQI",
            quality_flags=(),
            confidence=1.0,
            external_metadata={"dominant_variable": item.pol or "aqi"},
        )
