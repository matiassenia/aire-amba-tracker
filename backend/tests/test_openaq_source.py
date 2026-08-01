import httpx
import pytest

from app.domain.errors import ConfigurationError, InvalidSourcePayloadError, SourceUnavailableError
from app.domain.models import SourceStatusValue
from app.infrastructure.sources.openaq import (
    OPENAQ_SOURCE_ID,
    OpenAQConnector,
    OpenAQLocation,
    parse_locations_payload,
)

FIXTURE_LOCATIONS = {
    "results": [
        {
            "id": 123,
            "name": "San Miguel de Tucumán",
            "locality": "San Miguel de Tucumán",
            "country": {"code": "AR", "name": "Argentina"},
            "provider": {"id": 65, "name": "Secretaría de Ambiente"},
            "isMonitor": True,
            "coordinates": {"latitude": -26.8241, "longitude": -65.2226},
            "sensors": [
                {
                    "id": 1,
                    "name": "PM2.5",
                    "parameter": {"id": 1, "name": "pm25", "units": "µg/m³"},
                },
                {"id": 2, "name": "PM10", "parameter": {"id": 2, "name": "pm10", "units": "µg/m³"}},
            ],
        },
        {
            "id": 456,
            "name": "Bahía Blanca",
            "country": {"code": "AR", "name": "Argentina"},
            "provider": {"id": 162, "name": "Buenos Aires"},
            "isMonitor": True,
            "coordinates": {"latitude": -38.7196, "longitude": -62.2724},
            "sensors": [
                {"id": 3, "name": "NO2", "parameter": {"id": 3, "name": "no2", "units": "µg/m³"}}
            ],
        },
    ],
    "meta": {"limit": 100, "found": 2},
}


def test_openaq_connector_reports_not_configured_without_key() -> None:
    connector = OpenAQConnector(api_key=None)

    source = connector.source()

    assert source.id == OPENAQ_SOURCE_ID
    assert source.status == SourceStatusValue.NOT_CONFIGURED
    assert not connector.is_configured


def test_openaq_connector_reports_ok_with_key() -> None:
    connector = OpenAQConnector(api_key="secret")

    assert connector.is_configured
    assert connector.source().status == SourceStatusValue.OK


def test_openaq_fetch_raw_is_blocked_without_key() -> None:
    connector = OpenAQConnector(api_key=None)

    with pytest.raises(ConfigurationError):
        import asyncio

        asyncio.run(connector.fetch_raw())


def test_openaq_parse_maps_locations_payload() -> None:
    locations = parse_locations_payload(FIXTURE_LOCATIONS)

    assert len(locations) == 2
    first = locations[0]
    assert isinstance(first, OpenAQLocation)
    assert first.id == 123
    assert first.name == "San Miguel de Tucumán"
    assert first.lat == -26.8241
    assert first.lon == -65.2226
    assert first.country_code == "AR"
    assert first.is_monitor
    assert first.parameters == ("pm10", "pm25")
    assert first.units_by_parameter["pm25"] == "µg/m³"
    assert locations[1].locality is None


def test_openaq_parse_accepts_provider_as_object_and_string() -> None:
    object_provider = parse_locations_payload(
        {
            "results": [
                {
                    "id": 1,
                    "name": "Con provider objeto",
                    "coordinates": {"latitude": -34.6, "longitude": -58.4},
                    "provider": {"id": 65, "name": "ACUMAR"},
                }
            ]
        }
    )
    string_provider = parse_locations_payload(
        {
            "results": [
                {
                    "id": 2,
                    "name": "Con provider string",
                    "coordinates": {"latitude": -34.6, "longitude": -58.4},
                    "provider": "SPARTAN",
                }
            ]
        }
    )

    assert object_provider[0].provider == "ACUMAR"
    assert string_provider[0].provider == "SPARTAN"


def test_openaq_parse_rejects_invalid_payload() -> None:
    with pytest.raises(InvalidSourcePayloadError):
        parse_locations_payload({"results": [{"id": "not-an-int"}]})


def test_openaq_parse_skips_locations_without_coordinates() -> None:
    payload = {
        "results": [
            {"id": 1, "name": "Sin coordenadas", "coordinates": None},
            {
                "id": 2,
                "name": "Con coordenadas",
                "coordinates": {"latitude": -34.6, "longitude": -58.4},
            },
        ]
    }

    locations = parse_locations_payload(payload)

    assert [location.id for location in locations] == [2]


def test_openaq_fetch_raw_sends_api_key_header_when_configured() -> None:
    captured_headers: dict[str, str] = {}

    def handler(request: httpx.Request) -> httpx.Response:
        captured_headers.update(request.headers)
        assert str(request.url.path).endswith("/locations")
        assert "iso" in request.url.params
        return httpx.Response(200, json=FIXTURE_LOCATIONS, request=request)

    connector = OpenAQConnector(
        api_key="test-key",
        base_url="https://api.openaq.org/v3",
        timeout_seconds=1,
        transport=httpx.MockTransport(handler),
    )

    import asyncio

    raw = asyncio.run(connector.fetch_raw())

    assert raw.source_id == OPENAQ_SOURCE_ID
    assert captured_headers.get("x-api-key") == "test-key"
    locations = connector.parse_locations(raw)
    assert len(locations) == 2


def test_openaq_fetch_raw_raises_source_error_on_http_failure() -> None:
    connector = OpenAQConnector(
        api_key="test-key",
        base_url="https://api.openaq.org/v3",
        timeout_seconds=1,
        transport=httpx.MockTransport(lambda request: httpx.Response(502, request=request)),
    )

    import asyncio

    with pytest.raises(SourceUnavailableError):
        asyncio.run(connector.fetch_raw())
