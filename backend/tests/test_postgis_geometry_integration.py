import os
from collections.abc import Generator
from datetime import UTC, datetime

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine, text
from sqlalchemy.engine import Engine
from sqlalchemy.orm import Session

from app.api.dependencies import get_spatial_service
from app.gis.services import SpatialService
from app.infrastructure.postgis_geometry import PostGISGeometryRepository, _polygon_geojson
from app.main import create_app

pytestmark = pytest.mark.postgis


def _session() -> Session:
    url = os.getenv("POSTGIS_TEST_DATABASE_URL")
    if not url:
        pytest.skip("POSTGIS_TEST_DATABASE_URL is not configured")
    engine = create_engine(url, pool_pre_ping=True)
    with engine.begin() as connection:
        connection.execute(text("CREATE EXTENSION IF NOT EXISTS postgis"))
        connection.execute(
            text(
                """
                CREATE TABLE IF NOT EXISTS geometries (
                    id text PRIMARY KEY,
                    owner_type text NOT NULL,
                    owner_id text NOT NULL,
                    format text NOT NULL,
                    srid integer NOT NULL,
                    geometry_json jsonb,
                    geometry_wkt text,
                    geometry_wkb_hex text,
                    bbox jsonb,
                    metadata_json jsonb NOT NULL DEFAULT '{}'::jsonb,
                    created_at timestamptz NOT NULL,
                    geom geometry(Geometry, 4326)
                )
                """
            )
        )
        connection.execute(
            text(
                """
                CREATE TABLE IF NOT EXISTS zones (
                    id text PRIMARY KEY,
                    name text NOT NULL,
                    country_id text NOT NULL,
                    province_id text NOT NULL,
                    municipality_id text NOT NULL,
                    type text NOT NULL,
                    centroid_lat double precision NOT NULL,
                    centroid_lon double precision NOT NULL,
                    timezone text NOT NULL,
                    metadata_json jsonb NOT NULL DEFAULT '{}'::jsonb,
                    geom geometry(MultiPolygon, 4326)
                )
                """
            )
        )
        connection.execute(
            text(
                """
                CREATE TABLE IF NOT EXISTS stations (
                    id text PRIMARY KEY,
                    source_id text NOT NULL,
                    external_id text NOT NULL,
                    name text NOT NULL,
                    lat double precision NOT NULL,
                    lon double precision NOT NULL,
                    country_id text,
                    province_id text,
                    municipality_id text,
                    timezone text,
                    metadata_json jsonb NOT NULL DEFAULT '{}'::jsonb,
                    geom geometry(Point, 4326)
                )
                """
            )
        )
        connection.execute(text("TRUNCATE geometries, zones, stations"))
        connection.execute(
            text(
                "CREATE INDEX IF NOT EXISTS ix_test_geometries_geom "
                "ON geometries USING GIST (geom)"
            )
        )
        connection.execute(
            text(
                """
                INSERT INTO zones VALUES (
                    'z1', 'Zone 1', 'ar', 'ar-c', 'mun-caba', 'environmental_area',
                    -34.6, -58.4, 'America/Argentina/Buenos_Aires', '{}'::jsonb,
                    ST_Multi(ST_GeomFromText(
                        'POLYGON((-58.5 -34.7, -58.3 -34.7, -58.3 -34.5, '
                        '-58.5 -34.5, -58.5 -34.7))',
                        4326
                    ))
                )
                """
            )
        )
        connection.execute(
            text(
                """
                INSERT INTO stations VALUES
                ('s1', 'seed', '1001', 'A', -34.6, -58.4, 'ar', 'ar-c', 'mun-caba',
                 'America/Argentina/Buenos_Aires', '{}'::jsonb,
                 ST_SetSRID(ST_MakePoint(-58.4, -34.6), 4326)),
                ('s2', 'seed', '1002', 'B', -34.61, -58.41, 'ar', 'ar-c', 'mun-caba',
                 'America/Argentina/Buenos_Aires', '{}'::jsonb,
                 ST_SetSRID(ST_MakePoint(-58.41, -34.61), 4326))
                """
            )
        )
        connection.execute(
            text(
                """
                INSERT INTO geometries
                SELECT 'zone:' || id, 'zone', id, 'geojson', 4326, ST_AsGeoJSON(geom)::jsonb,
                       ST_AsText(geom), encode(ST_AsBinary(geom), 'hex'), '{}'::jsonb,
                       '{}'::jsonb, :created_at, geom
                FROM zones
                UNION ALL
                SELECT 'station:' || id, 'station', id, 'geojson', 4326, ST_AsGeoJSON(geom)::jsonb,
                       ST_AsText(geom), encode(ST_AsBinary(geom), 'hex'), '{}'::jsonb,
                       '{}'::jsonb, :created_at, geom
                FROM stations
                """
            ),
            {"created_at": datetime.now(UTC)},
        )
    return Session(engine)


def _close_session(session: Session) -> None:
    bind = session.get_bind()
    session.close()
    if isinstance(bind, Engine):
        bind.dispose()


def test_polygon_geojson_closes_open_linear_ring() -> None:
    geojson = _polygon_geojson(((-34.7, -58.5), (-34.7, -58.3), (-34.5, -58.3)))

    assert geojson == (
        '{"type": "Polygon", "coordinates": [[[-58.5, -34.7], [-58.3, -34.7], '
        '[-58.3, -34.5], [-58.5, -34.7]]]}'
    )


def test_polygon_geojson_preserves_closed_linear_ring() -> None:
    geojson = _polygon_geojson(
        ((-34.7, -58.5), (-34.7, -58.3), (-34.5, -58.3), (-34.7, -58.5))
    )

    assert geojson.count("[-58.5, -34.7]") == 2


def test_postgis_repository_executes_real_spatial_queries() -> None:
    session = _session()
    try:
        repository = PostGISGeometryRepository(session)

        assert repository.get_geometry("zone", "z1") is not None
        assert repository.contains_point("zone", "z1", -34.6, -58.4)
        assert repository.intersects_polygon(
            "zone",
            "z1",
            ((-34.7, -58.5), (-34.7, -58.3), (-34.5, -58.3), (-34.7, -58.5)),
        )
        assert repository.distance_between_points((-34.6, -58.4), (-34.6, -58.4)) == 0
        assert repository.buffer_point((-34.6, -58.4), 1)
        assert repository.bounding_box("zone", "z1") is not None
        assert [station.id for station, _ in repository.nearest_stations(-34.6, -58.4, 5, 2)] == [
            "s1",
            "s2",
        ]
        assert repository.zones_containing_point(-34.6, -58.4)[0].id == "z1"
        assert repository.zones_intersecting_polygon(
            ((-34.7, -58.5), (-34.7, -58.3), (-34.5, -58.3), (-34.7, -58.5))
        )[0].id == "z1"
        assert repository.zones_intersecting_polygon(
            ((-34.7, -58.5), (-34.7, -58.3), (-34.5, -58.3))
        )[0].id == "z1"
    finally:
        _close_session(session)


def test_postgis_repository_reports_missing_geometry() -> None:
    session = _session()
    try:
        repository = PostGISGeometryRepository(session)

        assert repository.get_geometry("zone", "missing") is None
    finally:
        _close_session(session)


def test_zones_intersects_endpoint_accepts_open_polygon_with_postgis() -> None:
    session = _session()

    def override_spatial_service() -> Generator[SpatialService]:
        yield SpatialService(PostGISGeometryRepository(session))

    app = create_app()
    app.dependency_overrides[get_spatial_service] = override_spatial_service
    try:
        response = TestClient(app).get(
            "/zones/intersects",
            params={"polygon": "-34.7,-58.5;-34.7,-58.3;-34.5,-58.3"},
        )

        assert response.status_code == 200
        assert response.json()["zones"][0]["id"] == "z1"
    finally:
        app.dependency_overrides.clear()
        _close_session(session)
