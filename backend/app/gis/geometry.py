from collections.abc import Iterable
from math import cos, radians, sqrt

Point = tuple[float, float]
Polygon = tuple[Point, ...]
BoundingBox = tuple[float, float, float, float]


def bounding_box(points: Iterable[Point]) -> BoundingBox:
    values = tuple(points)
    if not values:
        raise ValueError("cannot calculate a bounding box for an empty polygon")

    lats = [lat for lat, _ in values]
    lons = [lon for _, lon in values]
    return min(lats), min(lons), max(lats), max(lons)


def centroid(points: Iterable[Point]) -> Point:
    values = tuple(points)
    if not values:
        raise ValueError("cannot calculate a centroid for an empty polygon")

    lat = sum(point[0] for point in values) / len(values)
    lon = sum(point[1] for point in values) / len(values)
    return lat, lon


def contains_valid_coordinates(points: Iterable[Point]) -> bool:
    return all(-90 <= lat <= 90 and -180 <= lon <= 180 for lat, lon in points)


def distance_km(a: Point, b: Point) -> float:
    d_lat = (a[0] - b[0]) * 111
    d_lon = (a[1] - b[1]) * 111 * cos(radians(a[0]))
    return sqrt(d_lat * d_lat + d_lon * d_lon)


def point_in_polygon(point: Point, polygon: Polygon) -> bool:
    if len(polygon) < 3:
        return False

    lat, lon = point
    inside = False
    previous_lat, previous_lon = polygon[-1]
    for current_lat, current_lon in polygon:
        intersects = (current_lon > lon) != (previous_lon > lon) and lat < (
            (previous_lat - current_lat) * (lon - current_lon) / (previous_lon - current_lon)
            + current_lat
        )
        if intersects:
            inside = not inside
        previous_lat, previous_lon = current_lat, current_lon
    return inside


def bounding_boxes_intersect(first: BoundingBox, second: BoundingBox) -> bool:
    first_min_lat, first_min_lon, first_max_lat, first_max_lon = first
    second_min_lat, second_min_lon, second_max_lat, second_max_lon = second
    return not (
        first_max_lat < second_min_lat
        or second_max_lat < first_min_lat
        or first_max_lon < second_min_lon
        or second_max_lon < first_min_lon
    )


def buffer_bbox(point: Point, radius_km: float) -> BoundingBox:
    lat, lon = point
    delta_lat = radius_km / 111
    delta_lon = radius_km / max(111 * cos(radians(lat)), 0.000001)
    return lat - delta_lat, lon - delta_lon, lat + delta_lat, lon + delta_lon
