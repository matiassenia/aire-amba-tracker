"""spatial and history foundation

Revision ID: 0002_spatial_history_foundation
Revises: 0001_initial
Create Date: 2026-07-29
"""

from collections.abc import Sequence

import sqlalchemy as sa

from alembic import op

revision: str = "0002_spatial_history_foundation"
down_revision: str | None = "0001_initial"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    bind = op.get_bind()
    if bind.dialect.name == "postgresql":
        op.execute("CREATE EXTENSION IF NOT EXISTS postgis")

    op.create_table(
        "geometries",
        sa.Column("id", sa.String(), nullable=False),
        sa.Column("owner_type", sa.String(), nullable=False),
        sa.Column("owner_id", sa.String(), nullable=False),
        sa.Column("format", sa.String(), nullable=False),
        sa.Column("srid", sa.Integer(), nullable=False),
        sa.Column("geometry_json", sa.JSON(), nullable=True),
        sa.Column("geometry_wkt", sa.String(), nullable=True),
        sa.Column("geometry_wkb_hex", sa.String(), nullable=True),
        sa.Column("bbox", sa.JSON(), nullable=True),
        sa.Column("metadata_json", sa.JSON(), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("ix_geometries_format", "geometries", ["format"], unique=False)
    op.create_index("ix_geometries_owner", "geometries", ["owner_type", "owner_id"], unique=False)
    op.create_index("ix_geometries_owner_id", "geometries", ["owner_id"], unique=False)
    op.create_index("ix_geometries_owner_type", "geometries", ["owner_type"], unique=False)
    op.create_index("ix_geometries_srid", "geometries", ["srid"], unique=False)

    op.add_column("zones", sa.Column("geometry_wkt", sa.String(), nullable=True))
    op.add_column("zones", sa.Column("geometry_srid", sa.Integer(), nullable=True))
    op.add_column("zones", sa.Column("geometry_bbox", sa.JSON(), nullable=True))
    op.create_index("ix_zones_geometry_srid", "zones", ["geometry_srid"], unique=False)

    op.add_column("stations", sa.Column("geometry_wkt", sa.String(), nullable=True))
    op.add_column("stations", sa.Column("geometry_srid", sa.Integer(), nullable=True))
    op.create_index("ix_stations_geometry_srid", "stations", ["geometry_srid"], unique=False)

    op.add_column("measurements", sa.Column("lat", sa.Float(), nullable=True))
    op.add_column("measurements", sa.Column("lon", sa.Float(), nullable=True))
    op.add_column("measurements", sa.Column("zone_id", sa.String(), nullable=True))
    op.add_column("measurements", sa.Column("metadata_json", sa.JSON(), nullable=True))
    op.create_index(
        "ix_measurements_station_variable_time",
        "measurements",
        ["station_id", "environmental_variable_id", "measured_at"],
        unique=False,
    )
    op.create_index(
        "ix_measurements_zone_time",
        "measurements",
        ["zone_id", "measured_at"],
        unique=False,
    )

    op.add_column(
        "zone_snapshots",
        sa.Column("valid_from", sa.DateTime(timezone=True), nullable=True),
    )
    op.add_column(
        "zone_snapshots",
        sa.Column("valid_to", sa.DateTime(timezone=True), nullable=True),
    )
    op.add_column("zone_snapshots", sa.Column("aggregation_period", sa.String(), nullable=True))
    op.add_column("zone_snapshots", sa.Column("calculation_version", sa.String(), nullable=True))
    op.add_column("zone_snapshots", sa.Column("quality_metadata", sa.JSON(), nullable=True))
    op.create_index(
        "ix_zone_snapshots_aggregation_period",
        "zone_snapshots",
        ["aggregation_period"],
        unique=False,
    )
    op.create_index("ix_zone_snapshots_valid_from", "zone_snapshots", ["valid_from"], unique=False)
    op.create_index("ix_zone_snapshots_valid_to", "zone_snapshots", ["valid_to"], unique=False)
    op.create_index(
        "ix_zone_snapshots_zone_period_time",
        "zone_snapshots",
        ["zone_id", "aggregation_period", "calculated_at"],
        unique=False,
    )


def downgrade() -> None:
    op.drop_index("ix_zone_snapshots_zone_period_time", table_name="zone_snapshots")
    op.drop_index("ix_zone_snapshots_valid_to", table_name="zone_snapshots")
    op.drop_index("ix_zone_snapshots_valid_from", table_name="zone_snapshots")
    op.drop_index("ix_zone_snapshots_aggregation_period", table_name="zone_snapshots")
    op.drop_column("zone_snapshots", "quality_metadata")
    op.drop_column("zone_snapshots", "calculation_version")
    op.drop_column("zone_snapshots", "aggregation_period")
    op.drop_column("zone_snapshots", "valid_to")
    op.drop_column("zone_snapshots", "valid_from")

    op.drop_index("ix_measurements_zone_time", table_name="measurements")
    op.drop_index("ix_measurements_station_variable_time", table_name="measurements")
    op.drop_column("measurements", "metadata_json")
    op.drop_column("measurements", "zone_id")
    op.drop_column("measurements", "lon")
    op.drop_column("measurements", "lat")

    op.drop_index("ix_stations_geometry_srid", table_name="stations")
    op.drop_column("stations", "geometry_srid")
    op.drop_column("stations", "geometry_wkt")

    op.drop_index("ix_zones_geometry_srid", table_name="zones")
    op.drop_column("zones", "geometry_bbox")
    op.drop_column("zones", "geometry_srid")
    op.drop_column("zones", "geometry_wkt")

    op.drop_index("ix_geometries_srid", table_name="geometries")
    op.drop_index("ix_geometries_owner_type", table_name="geometries")
    op.drop_index("ix_geometries_owner_id", table_name="geometries")
    op.drop_index("ix_geometries_owner", table_name="geometries")
    op.drop_index("ix_geometries_format", table_name="geometries")
    op.drop_table("geometries")
