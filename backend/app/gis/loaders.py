from pathlib import Path
from typing import Any

from app.domain.models import GeometryFormat, GeometryRecord
from app.gis.geometry import bounding_box

GIS_ROOT = Path(__file__).resolve().parents[3] / "gis"


def official_geojson_path(*parts: str) -> Path:
    return GIS_ROOT.joinpath(*parts)


def geometry_record_from_geojson_feature(
    feature: dict[str, Any],
    owner_type: str,
    owner_id: str,
    srid: int = 4326,
) -> GeometryRecord:
    geometry = feature.get("geometry")
    if not isinstance(geometry, dict):
        raise ValueError("GeoJSON feature must include a geometry object")

    bbox = _geojson_bbox(geometry)

    return GeometryRecord(
        id=f"{owner_type}:{owner_id}",
        owner_type=owner_type,
        owner_id=owner_id,
        format=GeometryFormat.GEOJSON,
        srid=srid,
        geometry=geometry,
        bbox=bbox,
    )


def _geojson_bbox(geometry: dict[str, Any]) -> tuple[float, float, float, float] | None:
    coordinates = geometry.get("coordinates")
    geometry_type = geometry.get("type")
    if geometry_type == "Point" and isinstance(coordinates, list) and len(coordinates) >= 2:
        lon, lat = coordinates[:2]
        lat_float = float(lat)
        lon_float = float(lon)
        return lat_float, lon_float, lat_float, lon_float
    if geometry_type == "Polygon" and isinstance(coordinates, list) and coordinates:
        return _ring_bbox(coordinates[0])
    if geometry_type == "MultiPolygon" and isinstance(coordinates, list) and coordinates:
        points: list[tuple[float, float]] = []
        for polygon in coordinates:
            if isinstance(polygon, list) and polygon:
                ring_bbox = _ring_bbox(polygon[0])
                if ring_bbox is not None:
                    min_lat, min_lon, max_lat, max_lon = ring_bbox
                    points.extend(((min_lat, min_lon), (max_lat, max_lon)))
        return bounding_box(tuple(points)) if points else None
    return None


def _ring_bbox(ring: object) -> tuple[float, float, float, float] | None:
    if not isinstance(ring, list):
        return None
    points = tuple((float(point[1]), float(point[0])) for point in ring)
    return bounding_box(points)


def load_shapefile_placeholder(path: Path) -> tuple[GeometryRecord, ...]:
    if path.suffix.lower() != ".shp":
        raise ValueError("expected a .shp file path")
    return ()
