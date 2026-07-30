import os
from collections.abc import Generator
from datetime import UTC

import httpx
import pytest
from fastapi.testclient import TestClient

from app.api.dependencies import get_station_repository
from app.application.ports import StationRepository
from app.domain.errors import ConfigurationError, InvalidSourcePayloadError, SourceUnavailableError
from app.domain.models import Station
from app.infrastructure.sources.waqi import WaqiConnector, WaqiMapItem
from app.infrastructure.waqi_client import (
    WaqiStationRepository,
    clear_waqi_station_cache,
    parse_waqi_map_bounds_response,
)
from app.main import create_app


def test_waqi_item_rejects_placeholder_aqi() -> None:
    with pytest.raises(ValueError):
        WaqiMapItem.model_validate({"uid": 1, "lat": -34.6, "lon": -58.4, "aqi": "-"})


def test_waqi_connector_normalizes_payload_item() -> None:
    connector = WaqiConnector(token="token", bounds="0,0,1,1", timeout_seconds=1)
    item = WaqiMapItem.model_validate(
        {
            "uid": 123,
            "lat": "-34.6",
            "lon": "-58.4",
            "aqi": "45",
            "utime": "2026-07-29T10:00:00Z",
            "station": {"name": "Buenos Aires"},
        }
    )

    normalized = connector._normalize_item(item)

    assert normalized.source_id == "waqi"
    assert normalized.station_external_id == "123"
    assert normalized.station_name == "Buenos Aires"
    assert normalized.normalized_value == 45
    assert normalized.measured_at.tzinfo == UTC


def test_waqi_station_parser_normalizes_valid_response() -> None:
    stations = parse_waqi_map_bounds_response(
        {
            "status": "ok",
            "data": [
                {
                    "uid": 123,
                    "lat": "-34.6",
                    "lon": "-58.4",
                    "aqi": "45",
                    "pol": "pm25",
                    "utime": "2026-07-29 10:00:00",
                    "station": {"name": "Buenos Aires"},
                }
            ],
        }
    )

    station = stations[0]
    assert station.id == "waqi:123"
    assert station.source_id == "waqi"
    assert station.external_id == "123"
    assert station.name == "Buenos Aires"
    assert station.lat == -34.6
    assert station.lon == -58.4
    assert station.aqi == 45
    assert station.dominant_variable == "pm25"
    assert station.measured_at is not None
    assert station.measured_at.tzinfo == UTC
    assert station.data_available


def test_waqi_station_parser_keeps_missing_aqi_as_null() -> None:
    stations = parse_waqi_map_bounds_response(
        {
            "status": "ok",
            "data": [{"uid": 123, "lat": -34.6, "lon": -58.4, "aqi": "-"}],
        }
    )

    assert stations[0].aqi is None
    assert not stations[0].data_available


def test_waqi_station_repository_raises_when_token_is_missing() -> None:
    repository = WaqiStationRepository(
        token=None,
        base_url="https://api.waqi.info",
        bounds="0,0,1,1",
        timeout_seconds=1,
    )

    with pytest.raises(ConfigurationError):
        repository.list_stations()


def test_waqi_station_repository_handles_http_error() -> None:
    transport = httpx.MockTransport(lambda request: httpx.Response(502, request=request))
    repository = WaqiStationRepository(
        token="token",
        base_url="https://api.waqi.info",
        bounds="0,0,1,1",
        timeout_seconds=1,
        transport=transport,
    )

    with pytest.raises(SourceUnavailableError):
        repository.list_stations()


def test_waqi_station_repository_handles_non_ok_status() -> None:
    transport = httpx.MockTransport(
        lambda request: httpx.Response(200, json={"status": "error", "data": []}, request=request)
    )
    repository = WaqiStationRepository(
        token="token",
        base_url="https://api.waqi.info",
        bounds="0,0,1,1",
        timeout_seconds=1,
        transport=transport,
    )

    with pytest.raises(SourceUnavailableError):
        repository.list_stations()


def test_waqi_station_repository_handles_invalid_payload() -> None:
    transport = httpx.MockTransport(
        lambda request: httpx.Response(200, json={"status": "ok", "data": {}}, request=request)
    )
    repository = WaqiStationRepository(
        token="token",
        base_url="https://api.waqi.info",
        bounds="0,0,1,1",
        timeout_seconds=1,
        transport=transport,
    )

    with pytest.raises(InvalidSourcePayloadError):
        repository.list_stations()


def test_waqi_station_repository_handles_timeout() -> None:
    def handler(request: httpx.Request) -> httpx.Response:
        raise httpx.TimeoutException("timed out", request=request)

    repository = WaqiStationRepository(
        token="token",
        base_url="https://api.waqi.info",
        bounds="0,0,1,1",
        timeout_seconds=1,
        transport=httpx.MockTransport(handler),
    )

    with pytest.raises(SourceUnavailableError):
        repository.list_stations()


def test_waqi_station_repository_enriches_complete_feed() -> None:
    clear_waqi_station_cache()
    requested_paths: list[str] = []

    def handler(request: httpx.Request) -> httpx.Response:
        requested_paths.append(request.url.path)
        if request.url.path == "/v2/map/bounds/":
            return httpx.Response(
                200,
                json={
                    "status": "ok",
                    "data": [{"uid": 123, "lat": -34.6, "lon": -58.4}],
                },
                request=request,
            )
        return httpx.Response(
            200,
            json={
                "status": "ok",
                "data": {
                    "aqi": 45,
                    "dominentpol": "pm25",
                    "city": {"name": "Buenos Aires", "geo": [-34.61, -58.41]},
                    "time": {"iso": "2026-07-29T10:00:00-03:00"},
                    "iaqi": {
                        "pm25": {"v": 12.5},
                        "pm10": {"v": 22},
                        "no2": {"v": 8},
                        "o3": {"v": 31},
                        "so2": {"v": 2},
                        "co": {"v": 0.4},
                    },
                    "attributions": [{"name": "WAQI"}],
                },
            },
            request=request,
        )

    repository = WaqiStationRepository(
        token="token",
        base_url="https://api.waqi.info",
        bounds="0,0,1,1",
        timeout_seconds=1,
        transport=httpx.MockTransport(handler),
    )

    station = repository.list_stations()[0]

    assert requested_paths == ["/v2/map/bounds/", "/feed/@123/"]
    assert station.name == "Buenos Aires"
    assert station.lat == -34.61
    assert station.lon == -58.41
    assert station.aqi == 45
    assert station.dominant_variable == "pm25"
    assert station.measured_at is not None
    assert station.measured_at.isoformat() == "2026-07-29T13:00:00+00:00"
    assert station.iaqi == {
        "pm25": 12.5,
        "pm10": 22.0,
        "no2": 8.0,
        "o3": 31.0,
        "so2": 2.0,
        "co": 0.4,
    }
    assert station.data_available


def test_waqi_station_repository_enriches_partial_feed() -> None:
    clear_waqi_station_cache()

    def handler(request: httpx.Request) -> httpx.Response:
        if request.url.path == "/v2/map/bounds/":
            return httpx.Response(
                200,
                json={"status": "ok", "data": [{"uid": 123, "lat": -34.6, "lon": -58.4}]},
                request=request,
            )
        return httpx.Response(
            200,
            json={"status": "ok", "data": {"aqi": "-", "iaqi": {"pm25": {"v": 9}}}},
            request=request,
        )

    repository = WaqiStationRepository(
        token="token",
        base_url="https://api.waqi.info",
        bounds="0,0,1,1",
        timeout_seconds=1,
        transport=httpx.MockTransport(handler),
    )

    station = repository.list_stations()[0]

    assert station.aqi is None
    assert station.iaqi["pm25"] == 9
    assert station.iaqi["pm10"] is None
    assert station.data_available


def test_waqi_station_repository_keeps_station_when_feed_is_non_ok() -> None:
    clear_waqi_station_cache()

    def handler(request: httpx.Request) -> httpx.Response:
        if request.url.path == "/v2/map/bounds/":
            return httpx.Response(
                200,
                json={"status": "ok", "data": [{"uid": 123, "lat": -34.6, "lon": -58.4}]},
                request=request,
            )
        return httpx.Response(200, json={"status": "error", "data": {}}, request=request)

    repository = WaqiStationRepository(
        token="token",
        base_url="https://api.waqi.info",
        bounds="0,0,1,1",
        timeout_seconds=1,
        transport=httpx.MockTransport(handler),
    )

    station = repository.list_stations()[0]

    assert station.external_id == "123"
    assert station.aqi is None
    assert not station.data_available


def test_waqi_station_repository_continues_when_one_feed_times_out() -> None:
    clear_waqi_station_cache()

    def handler(request: httpx.Request) -> httpx.Response:
        if request.url.path == "/v2/map/bounds/":
            return httpx.Response(
                200,
                json={
                    "status": "ok",
                    "data": [
                        {"uid": 123, "lat": -34.6, "lon": -58.4},
                        {"uid": 456, "lat": -34.7, "lon": -58.5},
                    ],
                },
                request=request,
            )
        if request.url.path == "/feed/@123/":
            raise httpx.TimeoutException("timed out", request=request)
        return httpx.Response(200, json={"status": "ok", "data": {"aqi": 55}}, request=request)

    repository = WaqiStationRepository(
        token="token",
        base_url="https://api.waqi.info",
        bounds="0,0,1,1",
        timeout_seconds=1,
        transport=httpx.MockTransport(handler),
    )

    stations = repository.list_stations()

    assert stations[0].external_id == "123"
    assert stations[0].aqi is None
    assert not stations[0].data_available
    assert stations[1].external_id == "456"
    assert stations[1].aqi == 55
    assert stations[1].data_available


def test_waqi_station_repository_cache_avoids_repeated_requests() -> None:
    clear_waqi_station_cache()
    request_count = 0

    def handler(request: httpx.Request) -> httpx.Response:
        nonlocal request_count
        request_count += 1
        if request.url.path == "/v2/map/bounds/":
            return httpx.Response(
                200,
                json={"status": "ok", "data": [{"uid": 123, "lat": -34.6, "lon": -58.4}]},
                request=request,
            )
        return httpx.Response(200, json={"status": "ok", "data": {"aqi": 45}}, request=request)

    repository = WaqiStationRepository(
        token="token",
        base_url="https://api.waqi.info",
        bounds="0,0,1,1",
        timeout_seconds=1,
        transport=httpx.MockTransport(handler),
    )

    assert repository.list_stations()[0].aqi == 45
    assert repository.list_stations()[0].aqi == 45
    assert request_count == 2


def test_stations_endpoint_returns_normalized_waqi_data() -> None:
    class StubStationRepository(StationRepository):
        def list_stations(
            self,
            limit: int = 100,
            offset: int = 0,
            region_id: str | None = None,
            bounds: str | None = None,
        ) -> tuple[Station, ...]:
            return parse_waqi_map_bounds_response(
                {
                    "status": "ok",
                    "data": [
                        {
                            "uid": 123,
                            "lat": -34.6,
                            "lon": -58.4,
                            "aqi": 45,
                            "pol": "pm25",
                            "utime": "2026-07-29T10:00:00Z",
                            "station": {"name": "Buenos Aires"},
                        }
                    ],
                }
            )

    def override_station_repository() -> Generator[StationRepository]:
        yield StubStationRepository()

    app = create_app()
    app.dependency_overrides[get_station_repository] = override_station_repository
    try:
        response = TestClient(app).get("/stations")
    finally:
        app.dependency_overrides.clear()

    assert response.status_code == 200
    assert response.json() == [
        {
            "uid": 123,
            "name": "Buenos Aires",
            "lat": -34.6,
            "lon": -58.4,
            "aqi": 45,
            "dominant_variable": "pm25",
            "time": "2026-07-29T10:00:00+00:00",
            "source": "waqi",
            "measured_at": "2026-07-29T10:00:00+00:00",
            "data_available": True,
            "iaqi": {"pm25": None, "pm10": None, "no2": None, "o3": None, "so2": None, "co": None},
            "region_id": None,
            "region_name": None,
        }
    ]


def test_waqi_error_does_not_return_seed_or_mock_stations() -> None:
    class FailingStationRepository(StationRepository):
        def list_stations(
            self,
            limit: int = 100,
            offset: int = 0,
            region_id: str | None = None,
            bounds: str | None = None,
        ) -> tuple[Station, ...]:
            raise SourceUnavailableError("WAQI request failed")

    def override_station_repository() -> Generator[StationRepository]:
        yield FailingStationRepository()

    app = create_app()
    app.dependency_overrides[get_station_repository] = override_station_repository
    try:
        response = TestClient(app).get("/stations")
    finally:
        app.dependency_overrides.clear()

    assert response.status_code == 503
    assert response.json()["error"]["code"] == "SOURCE_UNAVAILABLE"


@pytest.mark.waqi_real
@pytest.mark.skipif(os.getenv("RUN_WAQI_REAL") != "1", reason="manual WAQI integration")
def test_manual_real_waqi_station_repository() -> None:
    token = os.getenv("WAQI_API_TOKEN") or os.getenv("WAQI_TOKEN")
    if not token:
        pytest.skip("WAQI token is not configured")

    repository = WaqiStationRepository(
        token=token,
        base_url=os.getenv("WAQI_BASE_URL", "https://api.waqi.info"),
        bounds="-35.0,-59.0,-34.3,-58.0",
        timeout_seconds=5,
    )

    stations = repository.list_stations(limit=5)

    assert stations
    assert all(station.source_id == "waqi" for station in stations)


def test_regions_endpoint_lists_argentina_and_operational_regions() -> None:
    response = TestClient(create_app()).get("/regions")

    assert response.status_code == 200
    region_ids = [item["id"] for item in response.json()]
    assert region_ids[0] == "argentina"
    assert "amba" in region_ids
    assert "patagonia-sur" in region_ids


def test_stations_rejects_unknown_region() -> None:
    response = TestClient(create_app()).get("/stations", params={"region": "inventada"})

    assert response.status_code == 404


def test_stations_rejects_invalid_bounds() -> None:
    response = TestClient(create_app()).get("/stations", params={"bounds": "-34,-58,-35,-57"})

    assert response.status_code == 422


def test_stations_rejects_excessive_bounds() -> None:
    response = TestClient(create_app()).get("/stations", params={"bounds": "-55,-74,-21,-53"})

    assert response.status_code == 422


def test_stations_default_route_remains_compatible() -> None:
    class FakeRepository(StationRepository):
        def list_stations(
            self,
            limit: int = 100,
            offset: int = 0,
            region_id: str | None = None,
            bounds: str | None = None,
        ) -> tuple[Station, ...]:
            assert region_id is None
            assert bounds is None
            return (
                Station(
                    id="waqi:1",
                    source_id="waqi",
                    external_id="1",
                    name="Station",
                    lat=-34.6,
                    lon=-58.4,
                ),
            )

    def override() -> Generator[StationRepository]:
        yield FakeRepository()

    app = create_app()
    app.dependency_overrides[get_station_repository] = override
    try:
        response = TestClient(app).get("/stations")
    finally:
        app.dependency_overrides.clear()

    assert response.status_code == 200
    assert response.json()[0]["uid"] == 1


def test_waqi_repository_deduplicates_national_regions() -> None:
    clear_waqi_station_cache()
    map_requests = 0

    def handler(request: httpx.Request) -> httpx.Response:
        nonlocal map_requests
        if request.url.path == "/v2/map/bounds/":
            map_requests += 1
            return httpx.Response(
                200,
                json={"status": "ok", "data": [{"uid": 123, "lat": -34.6, "lon": -58.4}]},
                request=request,
            )
        return httpx.Response(
            200,
            json={
                "status": "ok",
                "data": {
                    "iaqi": {"pm10": {"v": 21}},
                    "time": {"iso": "2026-07-29T10:00:00Z"},
                },
            },
            request=request,
        )

    repository = WaqiStationRepository(
        token="token",
        base_url="https://api.waqi.info",
        bounds="0,0,1,1",
        timeout_seconds=1,
        transport=httpx.MockTransport(handler),
    )

    stations = repository.list_stations(region_id="argentina")
    metadata = repository.last_metadata("argentina")

    assert len(stations) == 1
    assert map_requests == 7
    assert metadata is not None
    assert metadata["stations_deduplicated"] == 6


def test_waqi_repository_cache_is_independent_by_region() -> None:
    clear_waqi_station_cache()
    requested_bounds: list[str] = []

    def handler(request: httpx.Request) -> httpx.Response:
        if request.url.path == "/v2/map/bounds/":
            requested_bounds.append(str(request.url.params.get("latlng")))
            uid = 1 if len(requested_bounds) == 1 else 2
            return httpx.Response(
                200,
                json={"status": "ok", "data": [{"uid": uid, "lat": -34.6, "lon": -58.4}]},
                request=request,
            )
        return httpx.Response(200, json={"status": "ok", "data": {"iaqi": {}}}, request=request)

    repository = WaqiStationRepository(
        token="token",
        base_url="https://api.waqi.info",
        bounds="0,0,1,1",
        timeout_seconds=1,
        transport=httpx.MockTransport(handler),
    )

    repository.list_stations(region_id="amba")
    repository.list_stations(region_id="centro")
    repository.list_stations(region_id="amba")

    assert len(requested_bounds) == 2


def test_waqi_repository_keeps_national_response_on_partial_region_failure() -> None:
    clear_waqi_station_cache()
    map_requests = 0

    def handler(request: httpx.Request) -> httpx.Response:
        nonlocal map_requests
        if request.url.path == "/v2/map/bounds/":
            map_requests += 1
            if map_requests == 2:
                return httpx.Response(503, request=request)
            return httpx.Response(
                200,
                json={"status": "ok", "data": [{"uid": map_requests, "lat": -34.6, "lon": -58.4}]},
                request=request,
            )
        return httpx.Response(
            200,
            json={"status": "ok", "data": {"iaqi": {"pm10": {"v": 10}}}},
            request=request,
        )

    repository = WaqiStationRepository(
        token="token",
        base_url="https://api.waqi.info",
        bounds="0,0,1,1",
        timeout_seconds=1,
        transport=httpx.MockTransport(handler),
    )

    stations = repository.list_stations(region_id="argentina")
    metadata = repository.last_metadata("argentina")

    assert len(stations) == 6
    assert metadata is not None
    assert metadata["coverage_partial"] is True
    assert metadata["unavailable_regions"] == ["centro"]
