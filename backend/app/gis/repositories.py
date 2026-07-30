from app.application.ports import GeometryRepository
from app.domain.models import CursorPage, GeometryFormat, GeometryRecord, Station, Zone
from app.gis.geometry import (
    bounding_box,
    bounding_boxes_intersect,
    buffer_bbox,
    distance_km,
    point_in_polygon,
)


def _geojson_polygon(points: tuple[tuple[float, float], ...]) -> dict[str, object]:
    return {"type": "Polygon", "coordinates": [list(points)]}


class InMemoryGeometryRepository(GeometryRepository):
    def __init__(self, zones: tuple[Zone, ...]) -> None:
        self._zones = {zone.id: zone for zone in zones}
        self._geometries = tuple(
            GeometryRecord(
                id=f"zone:{zone.id}",
                owner_type="zone",
                owner_id=zone.id,
                format=GeometryFormat.GEOJSON,
                srid=4326,
                geometry=_geojson_polygon(zone.polygon),
                bbox=bounding_box(zone.polygon),
                metadata=zone.metadata,
            )
            for zone in zones
        )

    def get_geometry(self, owner_type: str, owner_id: str) -> GeometryRecord | None:
        return next(
            (
                geometry
                for geometry in self._geometries
                if geometry.owner_type == owner_type and geometry.owner_id == owner_id
            ),
            None,
        )

    def list_geometries(
        self,
        owner_type: str | None = None,
        page: CursorPage | None = None,
    ) -> tuple[GeometryRecord, ...]:
        geometries = self._geometries
        if owner_type is not None:
            geometries = tuple(
                geometry for geometry in geometries if geometry.owner_type == owner_type
            )
        limit = page.limit if page else 100
        offset = int(page.cursor) if page and page.cursor else 0
        return geometries[offset : offset + limit]

    def contains_point(self, owner_type: str, owner_id: str, lat: float, lon: float) -> bool:
        if owner_type != "zone":
            return False
        zone = self._zones.get(owner_id)
        if zone is None:
            return False
        return point_in_polygon((lat, lon), zone.polygon)

    def intersects_polygon(
        self,
        owner_type: str,
        owner_id: str,
        polygon: tuple[tuple[float, float], ...],
    ) -> bool:
        if owner_type != "zone":
            return False
        zone = self._zones.get(owner_id)
        if zone is None:
            return False
        return bounding_boxes_intersect(bounding_box(zone.polygon), bounding_box(polygon))

    def distance_between_points(
        self,
        first: tuple[float, float],
        second: tuple[float, float],
    ) -> float:
        return distance_km(first, second)

    def buffer_point(
        self,
        point: tuple[float, float],
        radius_km: float,
    ) -> tuple[float, float, float, float]:
        return buffer_bbox(point, radius_km)

    def bounding_box(
        self,
        owner_type: str,
        owner_id: str,
    ) -> tuple[float, float, float, float] | None:
        geometry = self.get_geometry(owner_type, owner_id)
        return geometry.bbox if geometry else None

    def nearest_stations(
        self,
        lat: float,
        lon: float,
        radius_km: float,
        limit: int,
    ) -> tuple[tuple[Station, float], ...]:
        return ()

    def zones_containing_point(self, lat: float, lon: float) -> tuple[Zone, ...]:
        return tuple(
            zone for zone in self._zones.values() if point_in_polygon((lat, lon), zone.polygon)
        )

    def zones_intersecting_polygon(
        self,
        polygon: tuple[tuple[float, float], ...],
    ) -> tuple[Zone, ...]:
        polygon_bbox = bounding_box(polygon)
        return tuple(
            zone
            for zone in self._zones.values()
            if bounding_boxes_intersect(bounding_box(zone.polygon), polygon_bbox)
        )
