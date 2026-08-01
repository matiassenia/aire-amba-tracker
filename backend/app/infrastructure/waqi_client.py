from concurrent.futures import ThreadPoolExecutor, as_completed
from dataclasses import replace
from datetime import UTC, datetime
from threading import Lock
from time import monotonic
from typing import Any

import httpx
from pydantic import BaseModel, ConfigDict, Field, ValidationError, field_validator

from app.application.ports import StationRepository
from app.domain.argentina_boundary import filter_argentina_stations
from app.domain.errors import ConfigurationError, InvalidSourcePayloadError, SourceUnavailableError
from app.domain.models import Station
from app.domain.regions import ALL_REGION_IDS, ARGENTINA_REGION, REGION_BY_ID, Region
from app.infrastructure.sources.waqi import WAQI_SOURCE_ID


class WaqiStationPayload(BaseModel):
    model_config = ConfigDict(extra="allow")

    name: str | None = None


class WaqiMapStation(BaseModel):
    model_config = ConfigDict(extra="allow")

    uid: int
    lat: float
    lon: float
    aqi: int | None = None
    pol: str | None = None
    utime: str | None = None
    station: WaqiStationPayload = Field(default_factory=WaqiStationPayload)

    @field_validator("aqi", mode="before")
    @classmethod
    def parse_aqi(cls, value: Any) -> int | None:
        if value in (None, "", "-"):
            return None
        parsed = float(value)
        if not parsed.is_integer():
            return round(parsed)
        return int(parsed)

    @field_validator("lat")
    @classmethod
    def validate_lat(cls, value: float) -> float:
        if not -90 <= value <= 90:
            raise ValueError("latitude is out of range")
        return value

    @field_validator("lon")
    @classmethod
    def validate_lon(cls, value: float) -> float:
        if not -180 <= value <= 180:
            raise ValueError("longitude is out of range")
        return value


class WaqiMapResponse(BaseModel):
    status: str
    data: list[WaqiMapStation]


class WaqiIaqiValue(BaseModel):
    model_config = ConfigDict(extra="allow")

    v: float | None = None

    @field_validator("v", mode="before")
    @classmethod
    def parse_value(cls, value: Any) -> float | None:
        if value in (None, "", "-"):
            return None
        return float(value)


class WaqiFeedCity(BaseModel):
    model_config = ConfigDict(extra="allow")

    name: str | None = None
    geo: list[float] | None = None


class WaqiFeedTime(BaseModel):
    model_config = ConfigDict(extra="allow")

    iso: str | None = None
    s: str | None = None


class WaqiFeedData(BaseModel):
    model_config = ConfigDict(extra="allow")

    aqi: int | None = None
    dominentpol: str | None = None
    city: WaqiFeedCity = Field(default_factory=WaqiFeedCity)
    time: WaqiFeedTime = Field(default_factory=WaqiFeedTime)
    iaqi: dict[str, WaqiIaqiValue] = Field(default_factory=dict)
    attributions: list[dict[str, Any]] = Field(default_factory=list)

    @field_validator("aqi", mode="before")
    @classmethod
    def parse_aqi(cls, value: Any) -> int | None:
        if value in (None, "", "-"):
            return None
        parsed = float(value)
        if not parsed.is_integer():
            return round(parsed)
        return int(parsed)


class WaqiFeedResponse(BaseModel):
    status: str
    data: WaqiFeedData | None = None


_IAQI_KEYS = ("pm25", "pm10", "no2", "o3", "so2", "co")
_CACHE_TTL_SECONDS = 600.0
_CACHE_LOCK = Lock()
_CACHE: dict[
    tuple[str, str, str, float, int],
    tuple[float, tuple[Station, ...], tuple[str, ...]],
] = {}
_META_LOCK = Lock()
_LAST_METADATA: dict[str, dict[str, object]] = {}


def clear_waqi_station_cache() -> None:
    with _CACHE_LOCK:
        _CACHE.clear()


def parse_waqi_measured_at(value: str | None) -> datetime | None:
    if not value:
        return None
    normalized = value.replace("Z", "+00:00")
    if " " in normalized and "T" not in normalized:
        normalized = normalized.replace(" ", "T", 1)
    try:
        parsed = datetime.fromisoformat(normalized)
    except ValueError:
        return None
    if parsed.tzinfo is None:
        parsed = parsed.replace(tzinfo=UTC)
    return parsed.astimezone(UTC)


def parse_waqi_map_bounds_response(payload: object) -> tuple[Station, ...]:
    try:
        parsed = WaqiMapResponse.model_validate(payload)
    except ValidationError as exc:
        raise InvalidSourcePayloadError("WAQI payload is invalid") from exc

    if parsed.status != "ok":
        raise SourceUnavailableError("WAQI returned a non-ok status", {"status": parsed.status})

    return tuple(_station_from_item(item) for item in parsed.data)


class WaqiStationRepository(StationRepository):
    def __init__(
        self,
        token: str | None,
        base_url: str,
        bounds: str,
        timeout_seconds: float,
        cache_ttl_seconds: float = _CACHE_TTL_SECONDS,
        max_feed_workers: int = 5,
        transport: httpx.BaseTransport | None = None,
    ) -> None:
        self._token = token
        self._base_url = base_url.rstrip("/")
        self._bounds = bounds
        self._timeout_seconds = timeout_seconds
        self._cache_ttl_seconds = cache_ttl_seconds
        self._max_feed_workers = max_feed_workers
        self._transport = transport

    def list_stations(
        self,
        limit: int = 100,
        offset: int = 0,
        region_id: str | None = None,
        bounds: str | None = None,
    ) -> tuple[Station, ...]:
        if not self._token:
            raise ConfigurationError("WAQI token is not configured")

        if bounds is not None:
            stations = self._list_for_bounds(bounds, query_id="custom-bounds", region=None)
            return stations[offset : offset + limit]

        if region_id is None:
            stations = self._list_for_bounds(
                self._bounds,
                query_id="amba",
                region=REGION_BY_ID.get("amba"),
            )
            return stations[offset : offset + limit]

        normalized_region_id = region_id
        if normalized_region_id == ARGENTINA_REGION.id:
            stations = self._list_national()
            return stations[offset : offset + limit]

        region = REGION_BY_ID.get(normalized_region_id)
        if region is None:
            raise ValueError(f"unknown region: {normalized_region_id}")
        stations = self._list_for_region(region)
        return stations[offset : offset + limit]

    def last_metadata(self, query_id: str) -> dict[str, object] | None:
        with _META_LOCK:
            metadata = _LAST_METADATA.get(query_id)
        return dict(metadata) if metadata is not None else None

    def _list_national(self) -> tuple[Station, ...]:
        stations_by_key: dict[tuple[str, str], Station] = {}
        region_summaries: list[dict[str, object]] = []
        unavailable_regions: list[str] = []
        for region_id in ALL_REGION_IDS:
            region = REGION_BY_ID[region_id]
            try:
                region_stations = self._list_for_region(region)
            except SourceUnavailableError:
                unavailable_regions.append(region.id)
                region_summaries.append(
                    _metadata_for(region.id, region.name, (), failed=True, cache_hit=False)
                )
                continue
            for station in region_stations:
                stations_by_key[(station.source_id, station.external_id)] = station
            metadata = self.last_metadata(region.id)
            if metadata is not None:
                region_summaries.append(metadata)

        stations = tuple(stations_by_key.values())
        discovered = sum(_metadata_int(item, "stations_discovered") for item in region_summaries)
        foreign_ids: set[str] = set()
        for item in region_summaries:
            foreign_ids_value = item.get("foreign_stations_ids")
            if isinstance(foreign_ids_value, list):
                for station_id in foreign_ids_value:
                    if isinstance(station_id, str):
                        foreign_ids.add(station_id)
        metadata = _metadata_for(
            ARGENTINA_REGION.id,
            ARGENTINA_REGION.name,
            stations,
            cache_hit=False,
            stations_discovered=discovered,
            foreign_stations_ids=sorted(foreign_ids),
            unavailable_regions=unavailable_regions,
            regions=region_summaries,
        )
        self._set_metadata(ARGENTINA_REGION.id, metadata)
        return stations

    def _list_for_region(self, region: Region) -> tuple[Station, ...]:
        return self._list_for_bounds(
            region.bounds.as_waqi_latlng(),
            query_id=region.id,
            region=region,
        )

    def _list_for_bounds(
        self,
        bounds: str,
        query_id: str,
        region: Region | None,
    ) -> tuple[Station, ...]:
        cache_key = (
            WAQI_SOURCE_ID,
            self._base_url,
            bounds,
            self._cache_ttl_seconds,
            self._max_feed_workers,
        )
        cached = self._get_cached(cache_key)
        if cached is not None:
            stations, foreign_ids = cached
            self._set_metadata(
                query_id,
                _metadata_for(
                    query_id,
                    region.name if region else "Custom bounds",
                    stations,
                    cache_hit=True,
                    foreign_stations_ids=list(foreign_ids),
                ),
            )
            return stations

        try:
            with httpx.Client(timeout=self._timeout_seconds, transport=self._transport) as client:
                response = client.get(
                    f"{self._base_url}/v2/map/bounds/",
                    params={"latlng": bounds, "token": self._token},
                )
                response.raise_for_status()
                payload = response.json()
                stations = parse_waqi_map_bounds_response(payload)
                stations = tuple(_tag_station_region(station, region) for station in stations)
                stations, foreign_stations = filter_argentina_stations(stations)
                foreign_ids = tuple(
                    f"{station.source_id}:{station.external_id}" for station in foreign_stations
                )
                enriched = self._enrich_stations(client, stations)
        except httpx.TimeoutException as exc:
            raise SourceUnavailableError("WAQI request timed out") from exc
        except httpx.HTTPStatusError as exc:
            raise SourceUnavailableError("WAQI returned an HTTP error") from exc
        except httpx.HTTPError as exc:
            raise SourceUnavailableError("WAQI request failed") from exc

        self._set_cached(cache_key, enriched, foreign_ids)
        self._set_metadata(
            query_id,
            _metadata_for(
                query_id,
                region.name if region else "Custom bounds",
                enriched,
                cache_hit=False,
                foreign_stations_ids=list(foreign_ids),
            ),
        )
        return enriched

    def _get_cached(
        self,
        cache_key: tuple[str, str, str, float, int],
    ) -> tuple[tuple[Station, ...], tuple[str, ...]] | None:
        with _CACHE_LOCK:
            cached = _CACHE.get(cache_key)
        if cached is None:
            return None
        timestamp, stations, foreign_ids = cached
        if monotonic() - timestamp > self._cache_ttl_seconds:
            return None
        return stations, foreign_ids

    def _set_cached(
        self,
        cache_key: tuple[str, str, str, float, int],
        stations: tuple[Station, ...],
        foreign_ids: tuple[str, ...],
    ) -> None:
        with _CACHE_LOCK:
            _CACHE[cache_key] = (monotonic(), stations, foreign_ids)

    def _set_metadata(self, query_id: str, metadata: dict[str, object]) -> None:
        with _META_LOCK:
            _LAST_METADATA[query_id] = metadata

    def _enrich_stations(
        self,
        client: httpx.Client,
        stations: tuple[Station, ...],
    ) -> tuple[Station, ...]:
        if not stations:
            return ()
        max_workers = max(1, min(self._max_feed_workers, len(stations)))
        enriched_by_id: dict[str, Station] = {}
        with ThreadPoolExecutor(max_workers=max_workers) as executor:
            futures = {
                executor.submit(self._fetch_station_feed, client, station): station
                for station in stations
            }
            for future in as_completed(futures):
                station = futures[future]
                try:
                    enriched_by_id[station.id] = future.result()
                except httpx.HTTPError:
                    enriched_by_id[station.id] = station
        return tuple(enriched_by_id.get(station.id, station) for station in stations)

    def _fetch_station_feed(self, client: httpx.Client, station: Station) -> Station:
        response = client.get(
            f"{self._base_url}/feed/@{station.external_id}/",
            params={"token": self._token},
        )
        response.raise_for_status()
        return _enrich_station_from_feed(station, response.json())


def _station_from_item(item: WaqiMapStation) -> Station:
    measured_at = parse_waqi_measured_at(item.utime)
    return Station(
        id=f"{WAQI_SOURCE_ID}:{item.uid}",
        source_id=WAQI_SOURCE_ID,
        external_id=str(item.uid),
        name=item.station.name or f"WAQI station {item.uid}",
        lat=item.lat,
        lon=item.lon,
        aqi=item.aqi,
        dominant_variable=item.pol,
        measured_at=measured_at,
        data_available=item.aqi is not None,
        metadata={"provider": "waqi"},
    )


def _enrich_station_from_feed(station: Station, payload: object) -> Station:
    try:
        parsed = WaqiFeedResponse.model_validate(payload)
    except ValidationError:
        return station
    if parsed.status != "ok" or parsed.data is None:
        return station

    data = parsed.data
    lat = station.lat
    lon = station.lon
    if data.city.geo and len(data.city.geo) >= 2:
        lat = data.city.geo[0]
        lon = data.city.geo[1]
    iaqi: dict[str, float | None] = {}
    for key in _IAQI_KEYS:
        value = data.iaqi.get(key)
        iaqi[key] = value.v if value is not None else None
    measured_at = parse_waqi_measured_at(data.time.iso or data.time.s) or station.measured_at
    data_available = data.aqi is not None or any(value is not None for value in iaqi.values())
    attribution = _attribution(data.attributions)

    return Station(
        id=station.id,
        source_id=station.source_id,
        external_id=station.external_id,
        name=data.city.name or station.name,
        lat=lat,
        lon=lon,
        country_id=station.country_id,
        province_id=station.province_id,
        municipality_id=station.municipality_id,
        timezone=station.timezone,
        metadata={**station.metadata, **({"attribution": attribution} if attribution else {})},
        active=station.active,
        aqi=data.aqi,
        dominant_variable=data.dominentpol or station.dominant_variable,
        measured_at=measured_at,
        data_available=data_available,
        iaqi=iaqi,
    )


def _attribution(attributions: list[dict[str, Any]]) -> str | None:
    for attribution in attributions:
        value = attribution.get("name")
        if isinstance(value, str) and value.strip():
            return value
    return None


def _tag_station_region(station: Station, region: Region | None) -> Station:
    if region is None:
        return station
    return replace(
        station,
        metadata={**station.metadata, "region_id": region.id, "region_name": region.name},
    )


def _metadata_for(
    query_id: str,
    name: str,
    stations: tuple[Station, ...],
    *,
    cache_hit: bool,
    failed: bool = False,
    stations_discovered: int | None = None,
    foreign_stations_ids: list[str] | None = None,
    unavailable_regions: list[str] | None = None,
    regions: list[dict[str, object]] | None = None,
) -> dict[str, object]:
    with_data = [station for station in stations if station.data_available]
    pollutants = sorted(
        {
            key
            for station in stations
            for key, value in station.iaqi.items()
            if key in _IAQI_KEYS and value is not None
        }
    )
    timestamps = [station.measured_at.isoformat() for station in stations if station.measured_at]
    discovered = len(stations) if stations_discovered is None else stations_discovered
    foreign_ids = foreign_stations_ids or []
    return {
        "region_id": query_id,
        "region_name": name,
        "source": WAQI_SOURCE_ID,
        "cache_hit": cache_hit,
        "cache_ttl_seconds": int(_CACHE_TTL_SECONDS),
        "stations_discovered": discovered,
        "stations_returned": len(stations),
        "stations_deduplicated": max(0, discovered - len(stations)),
        "foreign_stations_filtered": len(foreign_ids),
        "foreign_stations_ids": foreign_ids,
        "stations_with_data": len(with_data),
        "pollutants_available": pollutants,
        "timestamps_received": len(timestamps),
        "updated_at": datetime.now(UTC).isoformat(),
        "coverage_partial": failed or bool(unavailable_regions),
        "unavailable_regions": unavailable_regions or [],
        "regions": regions or [],
    }


def _metadata_int(metadata: dict[str, object], key: str) -> int:
    value = metadata.get(key, 0)
    return value if isinstance(value, int) else 0
