from datetime import UTC, datetime

from app.domain.models import Measurement, Station, Zone, ZoneType
from app.gis.repositories import InMemoryGeometryRepository
from app.gis.services import SpatialService


def test_spatial_service_finds_stations_and_measurements() -> None:
    zone = Zone(
        id="zone",
        name="Zone",
        country_id="ar",
        province_id="ar-c",
        municipality_id="mun-caba",
        type=ZoneType.ENVIRONMENTAL_AREA,
        centroid_lat=-34.6,
        centroid_lon=-58.4,
        polygon=((-34.7, -58.5), (-34.7, -58.3), (-34.5, -58.3), (-34.5, -58.5)),
        timezone="America/Argentina/Buenos_Aires",
    )
    service = SpatialService(InMemoryGeometryRepository((zone,)))
    stations = (
        Station("s1", "demo", "1", "Inside", -34.6, -58.4),
        Station("s2", "demo", "2", "Outside", -35.0, -59.0),
    )
    measurements = (
        Measurement(
            id="m1",
            source_id="demo",
            station_id="s1",
            environmental_variable_id="aqi",
            measured_at=datetime.now(UTC),
            received_at=datetime.now(UTC),
            value=50,
            unit="AQI",
            normalized_value=50,
            normalized_unit="AQI",
            lat=-34.6,
            lon=-58.4,
        ),
    )

    assert service.contains("zone", zone.id, -34.6, -58.4)
    nearest_station_ids = [
        station.id for station in service.get_nearest_stations(-34.6, -58.4, stations, 1)
    ]

    assert nearest_station_ids == ["s1"]
    assert measurements[0].lat == -34.6


def test_spatial_service_uses_bbox_intersection_for_zone_candidates() -> None:
    zone = Zone(
        id="zone",
        name="Zone",
        country_id="ar",
        province_id="ar-c",
        municipality_id="mun-caba",
        type=ZoneType.ENVIRONMENTAL_AREA,
        centroid_lat=0,
        centroid_lon=0,
        polygon=((0, 0), (0, 1), (1, 1), (1, 0)),
        timezone="UTC",
    )
    service = SpatialService(InMemoryGeometryRepository((zone,)))

    assert service.get_zones_intersecting(((0.5, 0.5), (0.5, 2), (2, 2), (2, 0.5)), (zone,)) == (
        zone,
    )
