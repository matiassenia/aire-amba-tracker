"""spatial engine postgis indexes

Revision ID: 0003_postgis_indexes
Revises: 0002_spatial_history_foundation
Create Date: 2026-07-29
"""

from collections.abc import Sequence

from alembic import op

revision: str = "0003_postgis_indexes"
down_revision: str | None = "0002_spatial_history_foundation"
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
    op.execute("CREATE INDEX IF NOT EXISTS ix_zones_geom_gist ON zones USING GIST (geom)")
    op.execute("CREATE INDEX IF NOT EXISTS ix_stations_geom_gist ON stations USING GIST (geom)")
    op.execute("CREATE INDEX IF NOT EXISTS ix_geometries_geom_gist ON geometries USING GIST (geom)")
    op.execute(
        "CREATE INDEX IF NOT EXISTS ix_geometries_geom_spgist "
        "ON geometries USING SPGIST (geom)"
    )


def downgrade() -> None:
    bind = op.get_bind()
    if bind.dialect.name != "postgresql":
        return

    op.execute("DROP INDEX IF EXISTS ix_geometries_geom_spgist")
    op.execute("DROP INDEX IF EXISTS ix_geometries_geom_gist")
    op.execute("DROP INDEX IF EXISTS ix_stations_geom_gist")
    op.execute("DROP INDEX IF EXISTS ix_zones_geom_gist")
    op.execute("ALTER TABLE geometries DROP COLUMN IF EXISTS geom")
    op.execute("ALTER TABLE stations DROP COLUMN IF EXISTS geom")
    op.execute("ALTER TABLE zones DROP COLUMN IF EXISTS geom")
