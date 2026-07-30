from app.gis.repositories import InMemoryGeometryRepository
from app.infrastructure.seed_data import ZONES


def test_geometry_repository_exposes_zone_geometry_and_srid() -> None:
    repository = InMemoryGeometryRepository(ZONES)

    record = repository.get_geometry("zone", ZONES[0].id)

    assert record is not None
    assert record.srid == 4326
    assert record.format == "geojson"
    assert repository.bounding_box("zone", ZONES[0].id) is not None


def test_geometry_repository_contains_intersects_distance_and_buffer() -> None:
    repository = InMemoryGeometryRepository(ZONES)
    zone = ZONES[0]

    assert repository.contains_point("zone", zone.id, zone.centroid_lat, zone.centroid_lon)
    assert repository.intersects_polygon("zone", zone.id, zone.polygon)
    assert repository.distance_between_points((0, 0), (0, 0)) == 0
    assert len(repository.buffer_point((0, 0), 1)) == 4


def test_geometry_repository_can_query_zone_candidates() -> None:
    repository = InMemoryGeometryRepository(ZONES)
    zone = ZONES[0]

    assert zone in repository.zones_containing_point(zone.centroid_lat, zone.centroid_lon)
    assert zone in repository.zones_intersecting_polygon(zone.polygon)


def test_domain_does_not_import_spatial_infrastructure() -> None:
    import app.domain.models as domain_models

    names = set(domain_models.__dict__)

    assert "sqlalchemy" not in names
    assert "geoalchemy2" not in names
