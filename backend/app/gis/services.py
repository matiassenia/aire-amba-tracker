from app.application.ports import GeometryRepository
from app.domain.models import Station, Zone


class SpatialService:
    def __init__(self, geometries: GeometryRepository) -> None:
        self._geometries = geometries

    def contains(self, owner_type: str, owner_id: str, lat: float, lon: float) -> bool:
        return self._geometries.contains_point(owner_type, owner_id, lat, lon)

    def intersects(
        self,
        owner_type: str,
        owner_id: str,
        polygon: tuple[tuple[float, float], ...],
    ) -> bool:
        return self._geometries.intersects_polygon(owner_type, owner_id, polygon)

    def distance(self, first: tuple[float, float], second: tuple[float, float]) -> float:
        return self._geometries.distance_between_points(first, second)

    def buffer(
        self,
        point: tuple[float, float],
        radius_km: float,
    ) -> tuple[float, float, float, float]:
        return self._geometries.buffer_point(point, radius_km)

    def bounding_box(
        self,
        owner_type: str,
        owner_id: str,
    ) -> tuple[float, float, float, float] | None:
        return self._geometries.bounding_box(owner_type, owner_id)

    def get_nearest_stations(
        self,
        lat: float,
        lon: float,
        stations: tuple[Station, ...],
        limit: int,
        radius_km: float | None = None,
    ) -> tuple[Station, ...]:
        sorted_stations = sorted(
            stations,
            key=lambda station: self.distance((lat, lon), (station.lat, station.lon)),
        )
        return tuple(sorted_stations[:limit])

    def get_zones_containing_point(
        self,
        lat: float,
        lon: float,
        zones: tuple[Zone, ...],
    ) -> tuple[Zone, ...]:
        return self._geometries.zones_containing_point(lat, lon)

    def get_zones_intersecting(
        self,
        polygon: tuple[tuple[float, float], ...],
        zones: tuple[Zone, ...],
    ) -> tuple[Zone, ...]:
        return self._geometries.zones_intersecting_polygon(polygon)

    def nearest_station_results(
        self,
        lat: float,
        lon: float,
        radius_km: float,
        limit: int,
    ) -> tuple[tuple[Station, float], ...]:
        return self._geometries.nearest_stations(lat, lon, radius_km, limit)
