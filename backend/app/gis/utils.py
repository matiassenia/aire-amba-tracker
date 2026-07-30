from app.domain.models import GeometryRecord

Point = tuple[float, float]


def point_to_wkt(point: Point) -> str:
    lat, lon = point
    return f"POINT({lon} {lat})"


def polygon_to_wkt(polygon: tuple[Point, ...]) -> str:
    pairs = ", ".join(f"{lon} {lat}" for lat, lon in polygon)
    return f"POLYGON(({pairs}))"


def record_supports_srid(record: GeometryRecord, srid: int = 4326) -> bool:
    return record.srid == srid
