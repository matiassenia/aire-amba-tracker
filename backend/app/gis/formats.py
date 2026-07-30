from app.domain.models import GeometryFormat

SUPPORTED_GEOMETRY_FORMATS: tuple[GeometryFormat, ...] = (
    GeometryFormat.GEOJSON,
    GeometryFormat.WKT,
    GeometryFormat.WKB,
    GeometryFormat.SHAPEFILE,
    GeometryFormat.VECTOR_TILE,
)


def geometry_format_from_suffix(suffix: str) -> GeometryFormat | None:
    normalized = suffix.lower().lstrip(".")
    match normalized:
        case "geojson" | "json":
            return GeometryFormat.GEOJSON
        case "wkt":
            return GeometryFormat.WKT
        case "wkb":
            return GeometryFormat.WKB
        case "shp":
            return GeometryFormat.SHAPEFILE
        case "mvt" | "pbf":
            return GeometryFormat.VECTOR_TILE
        case _:
            return None
