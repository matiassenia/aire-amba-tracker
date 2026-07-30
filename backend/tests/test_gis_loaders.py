from pathlib import Path

import pytest

from app.domain.models import GeometryFormat
from app.gis.formats import geometry_format_from_suffix
from app.gis.loaders import geometry_record_from_geojson_feature, load_shapefile_placeholder


def test_geojson_loader_creates_geometry_record() -> None:
    feature = {
        "type": "Feature",
        "geometry": {
            "type": "Polygon",
            "coordinates": [[[0, 0], [1, 0], [1, 1], [0, 0]]],
        },
    }

    record = geometry_record_from_geojson_feature(feature, "zone", "z1")

    assert record.format == GeometryFormat.GEOJSON
    assert record.owner_id == "z1"
    assert record.bbox == (0.0, 0.0, 1.0, 1.0)


def test_geojson_loader_accepts_point_and_multipolygon() -> None:
    point = {"type": "Feature", "geometry": {"type": "Point", "coordinates": [-58.4, -34.6]}}
    multipolygon = {
        "type": "Feature",
        "geometry": {
            "type": "MultiPolygon",
            "coordinates": [[[[0, 0], [1, 0], [1, 1], [0, 0]]]],
        },
    }

    assert geometry_record_from_geojson_feature(point, "station", "s1").bbox == (
        -34.6,
        -58.4,
        -34.6,
        -58.4,
    )
    assert geometry_record_from_geojson_feature(multipolygon, "zone", "z1").bbox == (
        0.0,
        0.0,
        1.0,
        1.0,
    )


def test_format_detection_and_shapefile_placeholder() -> None:
    assert geometry_format_from_suffix(".wkt") == GeometryFormat.WKT
    assert load_shapefile_placeholder(Path("future.shp")) == ()
    with pytest.raises(ValueError):
        load_shapefile_placeholder(Path("future.geojson"))
