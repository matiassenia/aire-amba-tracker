from datetime import UTC, datetime

from app.analytics.service import SnapshotService
from app.domain.models import (
    MeasurementMethod,
    NormalizedMeasurement,
    Source,
    SourceStatusValue,
    Zone,
    ZoneType,
)


def test_snapshot_uses_nearest_measurements() -> None:
    zone = Zone(
        id="z1",
        name="Zone",
        country_id="ar",
        province_id="ar-c",
        municipality_id="mun-caba",
        type=ZoneType.COMMUNE,
        centroid_lat=-34.6,
        centroid_lon=-58.4,
        polygon=(),
        timezone="America/Argentina/Buenos_Aires",
    )
    measurements = (
        NormalizedMeasurement(
            source_id="s",
            station_external_id="1",
            station_name="A",
            lat=-34.6,
            lon=-58.4,
            environmental_variable_code="aqi",
            measured_at=datetime.now(UTC),
            original_value=40,
            original_unit="AQI",
            normalized_value=40,
            normalized_unit="AQI",
            quality_flags=(),
            confidence=1,
        ),
        NormalizedMeasurement(
            source_id="s",
            station_external_id="2",
            station_name="B",
            lat=-34.61,
            lon=-58.41,
            environmental_variable_code="aqi",
            measured_at=datetime.now(UTC),
            original_value=60,
            original_unit="AQI",
            normalized_value=60,
            normalized_unit="AQI",
            quality_flags=(),
            confidence=1,
        ),
        NormalizedMeasurement(
            source_id="s",
            station_external_id="3",
            station_name="C",
            lat=-35.0,
            lon=-59.0,
            environmental_variable_code="aqi",
            measured_at=datetime.now(UTC),
            original_value=200,
            original_unit="AQI",
            normalized_value=200,
            normalized_unit="AQI",
            quality_flags=(),
            confidence=1,
        ),
    )
    sources = (Source("s", "Source", "Provider", "tier", SourceStatusValue.OK),)

    snapshot = SnapshotService().calculate(zone, measurements, sources)

    assert snapshot.aqi < 120
    assert snapshot.method == MeasurementMethod.NEAREST_STATION_AVERAGE
    assert len(snapshot.nearest_stations) == 3
