from datetime import UTC, datetime, timedelta

import pytest

from app.domain.models import Measurement, MeasurementFilter, Page, TimeWindow
from app.infrastructure.repositories import (
    InMemoryMeasurementRepository,
    InMemoryTimeSeriesRepository,
)


def _measurement(id_: str, station_id: str, measured_at: datetime) -> Measurement:
    return Measurement(
        id=id_,
        source_id="demo",
        station_id=station_id,
        environmental_variable_id="aqi",
        measured_at=measured_at,
        received_at=measured_at,
        value=50,
        unit="AQI",
        normalized_value=50,
        normalized_unit="AQI",
        zone_id="zone",
    )


def test_measurement_repository_filters_and_paginates_history() -> None:
    now = datetime(2026, 7, 29, 12, tzinfo=UTC)
    repository = InMemoryMeasurementRepository(
        (_measurement("old", "s1", now - timedelta(days=2)), _measurement("new", "s1", now))
    )

    results = repository.list_measurements(
        MeasurementFilter(
            station_id="s1",
            time_window=TimeWindow(now - timedelta(hours=1), now + timedelta(hours=1)),
            page=Page(limit=10, offset=0),
        )
    )

    assert [measurement.id for measurement in results] == ["new"]


def test_time_series_repository_applies_window() -> None:
    now = datetime(2026, 7, 29, 12, tzinfo=UTC)
    measurements = InMemoryMeasurementRepository((_measurement("new", "s1", now),))
    repository = InMemoryTimeSeriesRepository(measurements)

    results = repository.list_measurements_for_window(
        TimeWindow(now - timedelta(hours=1), now + timedelta(hours=1)),
        MeasurementFilter(station_id="s1"),
    )

    assert len(results) == 1


def test_page_rejects_unbounded_queries() -> None:
    with pytest.raises(ValueError):
        Page(limit=5000)
