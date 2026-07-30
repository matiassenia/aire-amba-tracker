from datetime import UTC

import pytest

from app.infrastructure.sources.waqi import WaqiConnector, WaqiMapItem


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
