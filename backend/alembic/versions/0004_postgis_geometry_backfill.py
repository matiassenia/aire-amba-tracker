"""postgis geometry backfill

Revision ID: 0004_postgis_geometry_backfill
Revises: 0003_postgis_indexes
Create Date: 2026-07-29
"""

from collections.abc import Sequence

from alembic import op

revision: str = "0004_postgis_geometry_backfill"
down_revision: str | None = "0003_postgis_indexes"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    bind = op.get_bind()
    if bind.dialect.name != "postgresql":
        return

    op.execute("CREATE EXTENSION IF NOT EXISTS postgis")
    op.execute("ALTER TABLE zones ADD COLUMN IF NOT EXISTS geom geometry(MultiPolygon, 4326)")
    op.execute("ALTER TABLE stations ADD COLUMN IF NOT EXISTS geom geometry(Point, 4326)")
    op.execute("ALTER TABLE geometries ADD COLUMN IF NOT EXISTS geom geometry(Geometry, 4326)")

    op.execute(
        """
        UPDATE zones
        SET geom = ST_Multi(ST_SetSRID(ST_GeomFromText(geometry_wkt), 4326))
        WHERE geom IS NULL AND geometry_wkt IS NOT NULL
        """
    )
    op.execute(
        """
        UPDATE stations
        SET geom = ST_SetSRID(ST_MakePoint(lon, lat), 4326)
        WHERE geom IS NULL AND lat IS NOT NULL AND lon IS NOT NULL
        """
    )
    op.execute(
        """
        UPDATE zones
        SET geom = ST_Multi(ST_MakeValid(geom))
        WHERE geom IS NOT NULL AND NOT ST_IsValid(geom)
        """
    )
    op.execute(
        """
        INSERT INTO geometries (
            id, owner_type, owner_id, format, srid, geometry_json, geometry_wkt,
            geometry_wkb_hex, bbox, metadata_json, created_at, geom
        )
        SELECT 'zone:' || id, 'zone', id, 'geojson', 4326,
               ST_AsGeoJSON(geom)::json, ST_AsText(geom), encode(ST_AsBinary(geom), 'hex'),
               json_build_object(
                   'min_lat', ST_YMin(ST_Envelope(geom)),
                   'min_lon', ST_XMin(ST_Envelope(geom)),
                   'max_lat', ST_YMax(ST_Envelope(geom)),
                   'max_lon', ST_XMax(ST_Envelope(geom))
               ),
               metadata_json, NOW(), geom
        FROM zones
        WHERE geom IS NOT NULL
        ON CONFLICT (id) DO UPDATE SET
            geometry_json = EXCLUDED.geometry_json,
            geometry_wkt = EXCLUDED.geometry_wkt,
            geometry_wkb_hex = EXCLUDED.geometry_wkb_hex,
            bbox = EXCLUDED.bbox,
            geom = EXCLUDED.geom
        """
    )
    op.execute(
        """
        INSERT INTO geometries (
            id, owner_type, owner_id, format, srid, geometry_json, geometry_wkt,
            geometry_wkb_hex, bbox, metadata_json, created_at, geom
        )
        SELECT 'station:' || id, 'station', id, 'geojson', 4326,
               ST_AsGeoJSON(geom)::json, ST_AsText(geom), encode(ST_AsBinary(geom), 'hex'),
               json_build_object(
                   'min_lat', ST_YMin(ST_Envelope(geom)),
                   'min_lon', ST_XMin(ST_Envelope(geom)),
                   'max_lat', ST_YMax(ST_Envelope(geom)),
                   'max_lon', ST_XMax(ST_Envelope(geom))
               ),
               metadata_json, NOW(), geom
        FROM stations
        WHERE geom IS NOT NULL
        ON CONFLICT (id) DO UPDATE SET
            geometry_json = EXCLUDED.geometry_json,
            geometry_wkt = EXCLUDED.geometry_wkt,
            geometry_wkb_hex = EXCLUDED.geometry_wkb_hex,
            bbox = EXCLUDED.bbox,
            geom = EXCLUDED.geom
        """
    )
    op.execute("CREATE INDEX IF NOT EXISTS ix_zones_geom_gist ON zones USING GIST (geom)")
    op.execute("CREATE INDEX IF NOT EXISTS ix_stations_geom_gist ON stations USING GIST (geom)")
    op.execute("CREATE INDEX IF NOT EXISTS ix_geometries_geom_gist ON geometries USING GIST (geom)")


def downgrade() -> None:
    bind = op.get_bind()
    if bind.dialect.name != "postgresql":
        return

    op.execute("DELETE FROM geometries WHERE owner_type IN ('zone', 'station')")
