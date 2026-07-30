import json
from typing import Any

from sqlalchemy import text
from sqlalchemy.engine import Result
from sqlalchemy.exc import SQLAlchemyError
from sqlalchemy.orm import Session

from app.application.ports import GeometryRepository
from app.domain.errors import (
    GeometryNotFoundError,
    InvalidCoordinatesError,
    InvalidGeometryError,
    InvalidRadiusError,
    SpatialBackendUnavailableError,
)
from app.domain.models import CursorPage, GeometryFormat, GeometryRecord, Station, Zone, ZoneType

SRID = 4326


def postgis_geometry_type(geometry_type: str, srid: int = SRID) -> Any:
    try:
        from geoalchemy2 import Geometry as GeoAlchemyGeometry
    except ImportError as exc:
        raise RuntimeError("GeoAlchemy2 is required for PostGIS geometry columns") from exc
    return GeoAlchemyGeometry(geometry_type=geometry_type, srid=srid)


def _validate_coordinates(lat: float, lon: float) -> None:
    if not (-90 <= lat <= 90 and -180 <= lon <= 180):
        raise InvalidCoordinatesError()


def _validate_radius(radius_km: float) -> None:
    if radius_km <= 0:
        raise InvalidRadiusError()


def _polygon_geojson(polygon: tuple[tuple[float, float], ...]) -> str:
    if len(polygon) < 3:
        raise InvalidGeometryError("Polygon must include at least three points")
    return json.dumps(
        {"type": "Polygon", "coordinates": [[[lon, lat] for lat, lon in polygon]]}
    )


class PostGISGeometryRepository(GeometryRepository):
    """PostGIS-backed spatial repository.

    Distances and radius checks use PostGIS geography casts, so public distances
    are returned in kilometers while SQL distance calculations happen in meters.
    """

    def __init__(self, session: Session) -> None:
        self._session = session
        self._assert_postgis_available()

    def get_geometry(self, owner_type: str, owner_id: str) -> GeometryRecord | None:
        result = self._execute(
            text(
                """
                SELECT id, owner_type, owner_id, format, srid,
                       ST_AsGeoJSON(geom)::text AS geojson,
                       ST_XMin(ST_Envelope(geom)) AS min_lon,
                       ST_YMin(ST_Envelope(geom)) AS min_lat,
                       ST_XMax(ST_Envelope(geom)) AS max_lon,
                       ST_YMax(ST_Envelope(geom)) AS max_lat,
                       metadata_json
                FROM geometries
                WHERE owner_type = :owner_type AND owner_id = :owner_id AND geom IS NOT NULL
                LIMIT 1
                """
            ),
            {"owner_type": owner_type, "owner_id": owner_id},
        )
        row = result.mappings().first()
        return self._geometry_record(row) if row else None

    def list_geometries(
        self,
        owner_type: str | None = None,
        page: CursorPage | None = None,
    ) -> tuple[GeometryRecord, ...]:
        limit = page.limit if page else 100
        offset = int(page.cursor) if page and page.cursor else 0
        result = self._execute(
            text(
                """
                SELECT id, owner_type, owner_id, format, srid,
                       ST_AsGeoJSON(geom)::text AS geojson,
                       ST_XMin(ST_Envelope(geom)) AS min_lon,
                       ST_YMin(ST_Envelope(geom)) AS min_lat,
                       ST_XMax(ST_Envelope(geom)) AS max_lon,
                       ST_YMax(ST_Envelope(geom)) AS max_lat,
                       metadata_json
                FROM geometries
                WHERE (:owner_type IS NULL OR owner_type = :owner_type) AND geom IS NOT NULL
                ORDER BY owner_type, owner_id
                LIMIT :limit OFFSET :offset
                """
            ),
            {"owner_type": owner_type, "limit": limit, "offset": offset},
        )
        return tuple(self._geometry_record(row) for row in result.mappings())

    def contains_point(self, owner_type: str, owner_id: str, lat: float, lon: float) -> bool:
        _validate_coordinates(lat, lon)
        result = self._execute(
            text(
                """
                SELECT ST_Covers(geom, ST_SetSRID(ST_MakePoint(:lon, :lat), 4326)) AS contains
                FROM geometries
                WHERE owner_type = :owner_type AND owner_id = :owner_id AND geom IS NOT NULL
                LIMIT 1
                """
            ),
            {"owner_type": owner_type, "owner_id": owner_id, "lat": lat, "lon": lon},
        )
        value = result.scalar_one_or_none()
        if value is None:
            raise GeometryNotFoundError(owner_type, owner_id)
        return bool(value)

    def intersects_polygon(
        self,
        owner_type: str,
        owner_id: str,
        polygon: tuple[tuple[float, float], ...],
    ) -> bool:
        result = self._execute(
            text(
                """
                SELECT ST_Intersects(
                    geom,
                    ST_SetSRID(ST_GeomFromGeoJSON(:geojson), 4326)
                ) AS intersects
                FROM geometries
                WHERE owner_type = :owner_type AND owner_id = :owner_id AND geom IS NOT NULL
                LIMIT 1
                """
            ),
            {"owner_type": owner_type, "owner_id": owner_id, "geojson": _polygon_geojson(polygon)},
        )
        value = result.scalar_one_or_none()
        if value is None:
            raise GeometryNotFoundError(owner_type, owner_id)
        return bool(value)

    def distance_between_points(
        self,
        first: tuple[float, float],
        second: tuple[float, float],
    ) -> float:
        _validate_coordinates(*first)
        _validate_coordinates(*second)
        result = self._execute(
            text(
                """
                SELECT ST_Distance(
                    ST_SetSRID(ST_MakePoint(:first_lon, :first_lat), 4326)::geography,
                    ST_SetSRID(ST_MakePoint(:second_lon, :second_lat), 4326)::geography
                ) / 1000.0 AS distance_km
                """
            ),
            {
                "first_lat": first[0],
                "first_lon": first[1],
                "second_lat": second[0],
                "second_lon": second[1],
            },
        )
        return float(result.scalar_one())

    def buffer_point(
        self,
        point: tuple[float, float],
        radius_km: float,
    ) -> tuple[float, float, float, float]:
        _validate_coordinates(*point)
        _validate_radius(radius_km)
        result = self._execute(
            text(
                """
                SELECT ST_XMin(env) AS min_lon, ST_YMin(env) AS min_lat,
                       ST_XMax(env) AS max_lon, ST_YMax(env) AS max_lat
                FROM (
                    SELECT ST_Envelope(
                        ST_Buffer(
                            ST_SetSRID(ST_MakePoint(:lon, :lat), 4326)::geography,
                            :radius_meters
                        )::geometry
                    ) AS env
                ) AS buffered
                """
            ),
            {"lat": point[0], "lon": point[1], "radius_meters": radius_km * 1000},
        )
        row = result.mappings().one()
        return self._bbox(row)

    def bounding_box(
        self,
        owner_type: str,
        owner_id: str,
    ) -> tuple[float, float, float, float] | None:
        result = self._execute(
            text(
                """
                SELECT ST_XMin(ST_Envelope(geom)) AS min_lon,
                       ST_YMin(ST_Envelope(geom)) AS min_lat,
                       ST_XMax(ST_Envelope(geom)) AS max_lon,
                       ST_YMax(ST_Envelope(geom)) AS max_lat
                FROM geometries
                WHERE owner_type = :owner_type AND owner_id = :owner_id AND geom IS NOT NULL
                LIMIT 1
                """
            ),
            {"owner_type": owner_type, "owner_id": owner_id},
        )
        row = result.mappings().first()
        return self._bbox(row) if row else None

    def nearest_stations(
        self,
        lat: float,
        lon: float,
        radius_km: float,
        limit: int,
    ) -> tuple[tuple[Station, float], ...]:
        _validate_coordinates(lat, lon)
        _validate_radius(radius_km)
        result = self._execute(
            text(
                """
                SELECT id, source_id, external_id, name, lat, lon, country_id, province_id,
                       municipality_id, timezone, metadata_json,
                       ST_Distance(
                           geom::geography,
                           ST_SetSRID(ST_MakePoint(:lon, :lat), 4326)::geography
                       ) / 1000.0 AS distance_km
                FROM stations
                WHERE geom IS NOT NULL
                  AND ST_DWithin(
                      geom::geography,
                      ST_SetSRID(ST_MakePoint(:lon, :lat), 4326)::geography,
                      :radius_meters
                  )
                ORDER BY distance_km ASC
                LIMIT :limit
                """
            ),
            {"lat": lat, "lon": lon, "radius_meters": radius_km * 1000, "limit": limit},
        )
        return tuple((self._station(row), float(row["distance_km"])) for row in result.mappings())

    def zones_containing_point(self, lat: float, lon: float) -> tuple[Zone, ...]:
        _validate_coordinates(lat, lon)
        result = self._execute(
            text(
                """
                SELECT id, name, country_id, province_id, municipality_id, type,
                       centroid_lat, centroid_lon, timezone, metadata_json,
                       ST_AsGeoJSON(geom)::text AS geojson
                FROM zones
                WHERE geom IS NOT NULL
                  AND ST_Covers(geom, ST_SetSRID(ST_MakePoint(:lon, :lat), 4326))
                ORDER BY id
                """
            ),
            {"lat": lat, "lon": lon},
        )
        return tuple(self._zone(row) for row in result.mappings())

    def zones_intersecting_polygon(
        self,
        polygon: tuple[tuple[float, float], ...],
    ) -> tuple[Zone, ...]:
        result = self._execute(
            text(
                """
                SELECT id, name, country_id, province_id, municipality_id, type,
                       centroid_lat, centroid_lon, timezone, metadata_json,
                       ST_AsGeoJSON(geom)::text AS geojson
                FROM zones
                WHERE geom IS NOT NULL
                  AND ST_Intersects(geom, ST_SetSRID(ST_GeomFromGeoJSON(:geojson), 4326))
                ORDER BY id
                """
            ),
            {"geojson": _polygon_geojson(polygon)},
        )
        return tuple(self._zone(row) for row in result.mappings())

    def _assert_postgis_available(self) -> None:
        try:
            available = self._session.execute(
                text("SELECT EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'postgis')")
            ).scalar_one()
        except SQLAlchemyError as exc:
            raise SpatialBackendUnavailableError("PostGIS availability check failed") from exc
        if not available:
            raise SpatialBackendUnavailableError("PostGIS extension is not enabled")

    def _execute(self, statement: Any, parameters: dict[str, object]) -> Result[Any]:
        try:
            return self._session.execute(statement, parameters)
        except SQLAlchemyError as exc:
            raise SpatialBackendUnavailableError("PostGIS query failed") from exc

    def _geometry_record(self, row: Any) -> GeometryRecord:
        srid = int(row["srid"])
        if srid != SRID:
            raise InvalidGeometryError(f"Unsupported SRID {srid}; expected {SRID}")
        return GeometryRecord(
            id=row["id"],
            owner_type=row["owner_type"],
            owner_id=row["owner_id"],
            format=GeometryFormat.GEOJSON,
            srid=srid,
            geometry=json.loads(row["geojson"]),
            bbox=self._bbox(row),
            metadata=row["metadata_json"] or {},
        )

    def _station(self, row: Any) -> Station:
        return Station(
            id=row["id"],
            source_id=row["source_id"],
            external_id=row["external_id"],
            name=row["name"],
            lat=float(row["lat"]),
            lon=float(row["lon"]),
            country_id=row["country_id"],
            province_id=row["province_id"],
            municipality_id=row["municipality_id"],
            timezone=row["timezone"],
            metadata=row["metadata_json"] or {},
        )

    def _zone(self, row: Any) -> Zone:
        geometry = json.loads(row["geojson"])
        polygon = _polygon_from_geojson(geometry)
        return Zone(
            id=row["id"],
            name=row["name"],
            country_id=row["country_id"],
            province_id=row["province_id"],
            municipality_id=row["municipality_id"],
            type=ZoneType(row["type"]),
            centroid_lat=float(row["centroid_lat"]),
            centroid_lon=float(row["centroid_lon"]),
            polygon=polygon,
            timezone=row["timezone"],
            metadata=row["metadata_json"] or {},
        )

    def _bbox(self, row: Any) -> tuple[float, float, float, float]:
        return (
            float(row["min_lat"]),
            float(row["min_lon"]),
            float(row["max_lat"]),
            float(row["max_lon"]),
        )


def _polygon_from_geojson(geometry: dict[str, Any]) -> tuple[tuple[float, float], ...]:
    coordinates = geometry.get("coordinates")
    geometry_type = geometry.get("type")
    if geometry_type == "Polygon" and isinstance(coordinates, list) and coordinates:
        return tuple((float(point[1]), float(point[0])) for point in coordinates[0])
    if geometry_type == "MultiPolygon" and isinstance(coordinates, list) and coordinates:
        first_polygon = coordinates[0]
        if isinstance(first_polygon, list) and first_polygon:
            return tuple((float(point[1]), float(point[0])) for point in first_polygon[0])
    raise InvalidGeometryError("Unsupported zone geometry type")
