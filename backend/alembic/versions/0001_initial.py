"""initial schema

Revision ID: 0001_initial
Revises:
Create Date: 2026-07-29
"""

from collections.abc import Sequence

import sqlalchemy as sa

from alembic import op

revision: str = "0001_initial"
down_revision: str | None = None
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.create_table(
        "countries",
        sa.Column("id", sa.String(), nullable=False),
        sa.Column("iso_code", sa.String(), nullable=False),
        sa.Column("name", sa.String(), nullable=False),
        sa.Column("default_timezone", sa.String(), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.PrimaryKeyConstraint("id"),
    )
    # op.create_index("ix_countries_iso_code", "countries", ["iso_code"], unique=True)

    op.create_table(
        "sources",
        sa.Column("id", sa.String(), nullable=False),
        sa.Column("name", sa.String(), nullable=False),
        sa.Column("provider", sa.String(), nullable=False),
        sa.Column("reliability_tier", sa.String(), nullable=False),
        sa.Column("status", sa.String(), nullable=False),
        sa.Column("last_error", sa.String(), nullable=True),
        sa.Column("last_success_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("last_failure_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("metadata_json", sa.JSON(), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.PrimaryKeyConstraint("id"),
    )

    op.create_table(
        "environmental_variables",
        sa.Column("id", sa.String(), nullable=False),
        sa.Column("code", sa.String(), nullable=False),
        sa.Column("name", sa.String(), nullable=False),
        sa.Column("category", sa.String(), nullable=False),
        sa.Column("default_unit", sa.String(), nullable=False),
        sa.Column("metadata_json", sa.JSON(), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(
        "ix_environmental_variables_category",
        "environmental_variables",
        ["category"],
        unique=False,
    )
    op.create_index(
        "ix_environmental_variables_code",
        "environmental_variables",
        ["code"],
        unique=True,
    )

    op.create_table(
        "provinces",
        sa.Column("id", sa.String(), nullable=False),
        sa.Column("country_id", sa.String(), nullable=False),
        sa.Column("name", sa.String(), nullable=False),
        sa.Column("timezone", sa.String(), nullable=False),
        sa.Column("metadata_json", sa.JSON(), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.ForeignKeyConstraint(["country_id"], ["countries.id"]),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("ix_provinces_country_id", "provinces", ["country_id"], unique=False)
    op.create_index("ix_provinces_name", "provinces", ["name"], unique=False)

    op.create_table(
        "administrative_areas",
        sa.Column("id", sa.String(), nullable=False),
        sa.Column("country_id", sa.String(), nullable=False),
        sa.Column("province_id", sa.String(), nullable=True),
        sa.Column("parent_id", sa.String(), nullable=True),
        sa.Column("type", sa.String(), nullable=False),
        sa.Column("name", sa.String(), nullable=False),
        sa.Column("metadata_json", sa.JSON(), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.ForeignKeyConstraint(["country_id"], ["countries.id"]),
        sa.ForeignKeyConstraint(["parent_id"], ["administrative_areas.id"]),
        sa.ForeignKeyConstraint(["province_id"], ["provinces.id"]),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(
        "ix_administrative_areas_country_id",
        "administrative_areas",
        ["country_id"],
        unique=False,
    )
    op.create_index(
        "ix_administrative_areas_name", "administrative_areas", ["name"], unique=False
    )
    op.create_index(
        "ix_administrative_areas_type", "administrative_areas", ["type"], unique=False
    )

    op.create_table(
        "municipalities",
        sa.Column("id", sa.String(), nullable=False),
        sa.Column("country_id", sa.String(), nullable=False),
        sa.Column("province_id", sa.String(), nullable=False),
        sa.Column("administrative_area_id", sa.String(), nullable=True),
        sa.Column("name", sa.String(), nullable=False),
        sa.Column("timezone", sa.String(), nullable=False),
        sa.Column("metadata_json", sa.JSON(), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.ForeignKeyConstraint(["administrative_area_id"], ["administrative_areas.id"]),
        sa.ForeignKeyConstraint(["country_id"], ["countries.id"]),
        sa.ForeignKeyConstraint(["province_id"], ["provinces.id"]),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(
        "ix_municipalities_country_id", "municipalities", ["country_id"], unique=False
    )
    op.create_index("ix_municipalities_name", "municipalities", ["name"], unique=False)
    op.create_index(
        "ix_municipalities_province_id", "municipalities", ["province_id"], unique=False
    )

    op.create_table(
        "zones",
        sa.Column("id", sa.String(), nullable=False),
        sa.Column("country_id", sa.String(), nullable=False),
        sa.Column("province_id", sa.String(), nullable=False),
        sa.Column("municipality_id", sa.String(), nullable=False),
        sa.Column("type", sa.String(), nullable=False),
        sa.Column("name", sa.String(), nullable=False),
        sa.Column("centroid_lat", sa.Float(), nullable=False),
        sa.Column("centroid_lon", sa.Float(), nullable=False),
        sa.Column("geometry", sa.JSON(), nullable=False),
        sa.Column("timezone", sa.String(), nullable=False),
        sa.Column("metadata_json", sa.JSON(), nullable=False),
        sa.Column("active", sa.Boolean(), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.ForeignKeyConstraint(["country_id"], ["countries.id"]),
        sa.ForeignKeyConstraint(["municipality_id"], ["municipalities.id"]),
        sa.ForeignKeyConstraint(["province_id"], ["provinces.id"]),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("ix_zones_country_id", "zones", ["country_id"], unique=False)
    op.create_index("ix_zones_municipality_id", "zones", ["municipality_id"], unique=False)
    op.create_index("ix_zones_name", "zones", ["name"], unique=False)
    op.create_index("ix_zones_province_id", "zones", ["province_id"], unique=False)
    op.create_index("ix_zones_type", "zones", ["type"], unique=False)

    op.create_table(
        "stations",
        sa.Column("id", sa.String(), nullable=False),
        sa.Column("source_id", sa.String(), nullable=False),
        sa.Column("external_id", sa.String(), nullable=False),
        sa.Column("name", sa.String(), nullable=False),
        sa.Column("lat", sa.Float(), nullable=False),
        sa.Column("lon", sa.Float(), nullable=False),
        sa.Column("country_id", sa.String(), nullable=True),
        sa.Column("province_id", sa.String(), nullable=True),
        sa.Column("municipality_id", sa.String(), nullable=True),
        sa.Column("timezone", sa.String(), nullable=True),
        sa.Column("metadata_json", sa.JSON(), nullable=False),
        sa.Column("active", sa.Boolean(), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.ForeignKeyConstraint(["country_id"], ["countries.id"]),
        sa.ForeignKeyConstraint(["municipality_id"], ["municipalities.id"]),
        sa.ForeignKeyConstraint(["province_id"], ["provinces.id"]),
        sa.ForeignKeyConstraint(["source_id"], ["sources.id"]),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("ix_stations_external_id", "stations", ["external_id"], unique=False)
    op.create_index("ix_stations_source_id", "stations", ["source_id"], unique=False)

    op.create_table(
        "raw_ingestion_records",
        sa.Column("id", sa.Integer(), autoincrement=True, nullable=False),
        sa.Column("source_id", sa.String(), nullable=False),
        sa.Column("connector_name", sa.String(), nullable=False),
        sa.Column("fetched_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("status", sa.String(), nullable=False),
        sa.Column("payload", sa.JSON(), nullable=True),
        sa.Column("payload_hash", sa.String(), nullable=True),
        sa.Column("error_message", sa.String(), nullable=True),
        sa.Column("metadata_json", sa.JSON(), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.ForeignKeyConstraint(["source_id"], ["sources.id"]),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(
        "ix_raw_ingestion_records_connector_name",
        "raw_ingestion_records",
        ["connector_name"],
        unique=False,
    )
    op.create_index(
        "ix_raw_ingestion_records_fetched_at",
        "raw_ingestion_records",
        ["fetched_at"],
        unique=False,
    )
    op.create_index(
        "ix_raw_ingestion_records_source_id",
        "raw_ingestion_records",
        ["source_id"],
        unique=False,
    )
    op.create_index(
        "ix_raw_ingestion_records_status",
        "raw_ingestion_records",
        ["status"],
        unique=False,
    )

    op.create_table(
        "measurements",
        sa.Column("id", sa.Integer(), autoincrement=True, nullable=False),
        sa.Column("source_id", sa.String(), nullable=False),
        sa.Column("station_id", sa.String(), nullable=False),
        sa.Column("environmental_variable_id", sa.String(), nullable=False),
        sa.Column("raw_ingestion_id", sa.Integer(), nullable=True),
        sa.Column("measured_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("received_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("value", sa.Float(), nullable=False),
        sa.Column("unit", sa.String(), nullable=False),
        sa.Column("normalized_value", sa.Float(), nullable=False),
        sa.Column("normalized_unit", sa.String(), nullable=False),
        sa.Column("quality_flags", sa.JSON(), nullable=False),
        sa.Column("confidence", sa.Float(), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.ForeignKeyConstraint(
            ["environmental_variable_id"], ["environmental_variables.id"]
        ),
        sa.ForeignKeyConstraint(["raw_ingestion_id"], ["raw_ingestion_records.id"]),
        sa.ForeignKeyConstraint(["source_id"], ["sources.id"]),
        sa.ForeignKeyConstraint(["station_id"], ["stations.id"]),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(
        "ix_measurements_environmental_variable_id",
        "measurements",
        ["environmental_variable_id"],
        unique=False,
    )
    op.create_index(
        "ix_measurements_measured_at", "measurements", ["measured_at"], unique=False
    )
    op.create_index("ix_measurements_source_id", "measurements", ["source_id"], unique=False)
    op.create_index("ix_measurements_station_id", "measurements", ["station_id"], unique=False)

    op.create_table(
        "zone_snapshots",
        sa.Column("id", sa.Integer(), autoincrement=True, nullable=False),
        sa.Column("zone_id", sa.String(), nullable=False),
        sa.Column("calculated_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("aqi", sa.Integer(), nullable=False),
        sa.Column("method", sa.String(), nullable=False),
        sa.Column("confidence", sa.Float(), nullable=False),
        sa.Column("freshness_minutes", sa.Integer(), nullable=False),
        sa.Column("dominant_variable_id", sa.String(), nullable=True),
        sa.Column("quality_flags", sa.JSON(), nullable=False),
        sa.Column("source_summary", sa.JSON(), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.ForeignKeyConstraint(
            ["dominant_variable_id"], ["environmental_variables.id"]
        ),
        sa.ForeignKeyConstraint(["zone_id"], ["zones.id"]),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(
        "ix_zone_snapshots_calculated_at",
        "zone_snapshots",
        ["calculated_at"],
        unique=False,
    )
    op.create_index("ix_zone_snapshots_zone_id", "zone_snapshots", ["zone_id"], unique=False)


def downgrade() -> None:
    op.drop_index("ix_zone_snapshots_zone_id", table_name="zone_snapshots")
    op.drop_index("ix_zone_snapshots_calculated_at", table_name="zone_snapshots")
    op.drop_table("zone_snapshots")
    op.drop_index("ix_measurements_station_id", table_name="measurements")
    op.drop_index("ix_measurements_source_id", table_name="measurements")
    op.drop_index("ix_measurements_measured_at", table_name="measurements")
    op.drop_index("ix_measurements_environmental_variable_id", table_name="measurements")
    op.drop_table("measurements")
    op.drop_index("ix_raw_ingestion_records_status", table_name="raw_ingestion_records")
    op.drop_index("ix_raw_ingestion_records_source_id", table_name="raw_ingestion_records")
    op.drop_index("ix_raw_ingestion_records_fetched_at", table_name="raw_ingestion_records")
    op.drop_index(
        "ix_raw_ingestion_records_connector_name", table_name="raw_ingestion_records"
    )
    op.drop_table("raw_ingestion_records")
    op.drop_index("ix_stations_source_id", table_name="stations")
    op.drop_index("ix_stations_external_id", table_name="stations")
    op.drop_table("stations")
    op.drop_index("ix_zones_type", table_name="zones")
    op.drop_index("ix_zones_province_id", table_name="zones")
    op.drop_index("ix_zones_name", table_name="zones")
    op.drop_index("ix_zones_municipality_id", table_name="zones")
    op.drop_index("ix_zones_country_id", table_name="zones")
    op.drop_table("zones")
    op.drop_index("ix_municipalities_province_id", table_name="municipalities")
    op.drop_index("ix_municipalities_name", table_name="municipalities")
    op.drop_index("ix_municipalities_country_id", table_name="municipalities")
    op.drop_table("municipalities")
    op.drop_index("ix_administrative_areas_type", table_name="administrative_areas")
    op.drop_index("ix_administrative_areas_name", table_name="administrative_areas")
    op.drop_index("ix_administrative_areas_country_id", table_name="administrative_areas")
    op.drop_table("administrative_areas")
    op.drop_index("ix_provinces_name", table_name="provinces")
    op.drop_index("ix_provinces_country_id", table_name="provinces")
    op.drop_table("provinces")
    op.drop_index("ix_environmental_variables_code", table_name="environmental_variables")
    op.drop_index("ix_environmental_variables_category", table_name="environmental_variables")
    op.drop_table("environmental_variables")
    op.drop_table("sources")
    op.drop_index("ix_countries_iso_code", table_name="countries")
    op.drop_table("countries")
