from __future__ import annotations

from sqlalchemy import create_engine, text
from sqlalchemy.orm import Session

from app.core.config import get_settings


def seed_postgis(session: Session) -> None:
    session.execute(text("CREATE EXTENSION IF NOT EXISTS postgis"))
    session.execute(
        text(
            """
            INSERT INTO countries (id, iso_code, name, default_timezone, created_at)
            VALUES ('ar', 'AR', 'Argentina', 'America/Argentina/Buenos_Aires', NOW())
            ON CONFLICT (id) DO NOTHING
            """
        )
    )
    session.execute(
        text(
            """
            INSERT INTO provinces (id, country_id, name, timezone, metadata_json, created_at)
            VALUES ('ar-c', 'ar', 'Ciudad Autonoma de Buenos Aires',
                    'America/Argentina/Buenos_Aires', '{}'::json, NOW())
            ON CONFLICT (id) DO NOTHING
            """
        )
    )
    session.execute(
        text(
            """
            INSERT INTO municipalities (
                id, country_id, province_id, administrative_area_id, name,
                timezone, metadata_json, created_at
            )
            VALUES ('mun-caba', 'ar', 'ar-c', NULL, 'Ciudad Autonoma de Buenos Aires',
                    'America/Argentina/Buenos_Aires', '{}'::json, NOW())
            ON CONFLICT (id) DO NOTHING
            """
        )
    )
    session.execute(
        text(
            """
            INSERT INTO sources (
                id, name, provider, reliability_tier, status, metadata_json, created_at
            )
            VALUES ('seed', 'Spatial seed', 'internal', 'seed', 'ok', '{}'::json, NOW())
            ON CONFLICT (id) DO NOTHING
            """
        )
    )
    session.execute(
        text(
            """
            INSERT INTO zones (
                id, country_id, province_id, municipality_id, type, name,
                centroid_lat, centroid_lon, geometry, geometry_wkt, geometry_srid,
                geometry_bbox, timezone, metadata_json, active, created_at, geom
            )
            VALUES (
                'postgis-zone-1', 'ar', 'ar-c', 'mun-caba', 'environmental_area',
                'PostGIS Test Zone', -34.6, -58.4,
                '{"type":"Polygon","coordinates":[[[-58.5,-34.7],[-58.3,-34.7],[-58.3,-34.5],[-58.5,-34.5],[-58.5,-34.7]]]}'::json,
                'POLYGON((-58.5 -34.7, -58.3 -34.7, -58.3 -34.5, -58.5 -34.5, -58.5 -34.7))',
                4326,
                '{"min_lat":-34.7,"min_lon":-58.5,"max_lat":-34.5,"max_lon":-58.3}'::json,
                'America/Argentina/Buenos_Aires', '{"seed_scope":"postgis_validation"}'::json,
                true, NOW(),
                ST_Multi(ST_GeomFromText(
                    'POLYGON((-58.5 -34.7, -58.3 -34.7, -58.3 -34.5, -58.5 -34.5, -58.5 -34.7))',
                    4326
                ))
            )
            ON CONFLICT (id) DO UPDATE SET geom = EXCLUDED.geom
            """
        )
    )
    session.execute(
        text(
            """
            INSERT INTO stations (
                id, source_id, external_id, name, lat, lon, geometry_wkt, geometry_srid,
                country_id, province_id, municipality_id, timezone, metadata_json,
                active, created_at, geom
            )
            VALUES
            ('postgis-station-1', 'seed', '9001', 'PostGIS Station 1', -34.6, -58.4,
             'POINT(-58.4 -34.6)', 4326, 'ar', 'ar-c', 'mun-caba',
             'America/Argentina/Buenos_Aires', '{"seed_scope":"postgis_validation"}'::json,
             true, NOW(), ST_SetSRID(ST_MakePoint(-58.4, -34.6), 4326)),
            ('postgis-station-2', 'seed', '9002', 'PostGIS Station 2', -34.61, -58.41,
             'POINT(-58.41 -34.61)', 4326, 'ar', 'ar-c', 'mun-caba',
             'America/Argentina/Buenos_Aires', '{"seed_scope":"postgis_validation"}'::json,
             true, NOW(), ST_SetSRID(ST_MakePoint(-58.41, -34.61), 4326))
            ON CONFLICT (id) DO UPDATE SET geom = EXCLUDED.geom
            """
        )
    )
    session.execute(
        text(
            """
            INSERT INTO geometries (
                id, owner_type, owner_id, format, srid, geometry_json, geometry_wkt,
                geometry_wkb_hex, bbox, metadata_json, created_at, geom
            )
            SELECT 'zone:' || id, 'zone', id, 'geojson', 4326,
                   ST_AsGeoJSON(geom)::json, ST_AsText(geom), encode(ST_AsBinary(geom), 'hex'),
                   '{"min_lat":-34.7,"min_lon":-58.5,"max_lat":-34.5,"max_lon":-58.3}'::json,
                   metadata_json, NOW(), geom
            FROM zones WHERE id = 'postgis-zone-1'
            UNION ALL
            SELECT 'station:' || id, 'station', id, 'geojson', 4326,
                   ST_AsGeoJSON(geom)::json, ST_AsText(geom), encode(ST_AsBinary(geom), 'hex'),
                   '{}'::json, metadata_json, NOW(), geom
            FROM stations WHERE id IN ('postgis-station-1', 'postgis-station-2')
            ON CONFLICT (id) DO UPDATE SET
                geometry_json = EXCLUDED.geometry_json,
                geometry_wkt = EXCLUDED.geometry_wkt,
                geometry_wkb_hex = EXCLUDED.geometry_wkb_hex,
                bbox = EXCLUDED.bbox,
                metadata_json = EXCLUDED.metadata_json,
                geom = EXCLUDED.geom
            """
        )
    )


def main() -> None:
    engine = create_engine(get_settings().database_url, pool_pre_ping=True)
    with Session(engine) as session:
        seed_postgis(session)
        session.commit()


if __name__ == "__main__":
    main()
