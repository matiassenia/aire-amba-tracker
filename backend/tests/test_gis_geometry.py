import pytest

from app.gis.geometry import bounding_box, centroid, contains_valid_coordinates
from app.gis.utils import point_to_wkt, polygon_to_wkt


def test_gis_utilities_calculate_bbox_and_centroid() -> None:
    polygon = ((-34.0, -58.0), (-35.0, -57.0), (-33.0, -59.0))

    assert bounding_box(polygon) == (-35.0, -59.0, -33.0, -57.0)
    assert centroid(polygon) == (-34.0, -58.0)
    assert contains_valid_coordinates(polygon)


def test_gis_utilities_reject_empty_geometry() -> None:
    with pytest.raises(ValueError):
        bounding_box(())


def test_wkt_helpers_use_srid_4326_coordinate_order() -> None:
    assert point_to_wkt((-34.6, -58.4)) == "POINT(-58.4 -34.6)"
    assert polygon_to_wkt(((0, 1), (2, 3), (0, 1))) == "POLYGON((1 0, 3 2, 1 0))"
