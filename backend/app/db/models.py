from datetime import datetime

from sqlalchemy import JSON, Boolean, DateTime, Float, ForeignKey, Index, Integer, String
from sqlalchemy.orm import Mapped, mapped_column

from app.db.base import Base


class CountryOrm(Base):
    __tablename__ = "countries"

    id: Mapped[str] = mapped_column(String, primary_key=True)
    iso_code: Mapped[str] = mapped_column(String, unique=True, index=True)
    name: Mapped[str] = mapped_column(String)
    default_timezone: Mapped[str] = mapped_column(String)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True))


class AdministrativeAreaOrm(Base):
    __tablename__ = "administrative_areas"

    id: Mapped[str] = mapped_column(String, primary_key=True)
    country_id: Mapped[str] = mapped_column(ForeignKey("countries.id"), index=True)
    province_id: Mapped[str | None] = mapped_column(ForeignKey("provinces.id"), nullable=True)
    parent_id: Mapped[str | None] = mapped_column(
        ForeignKey("administrative_areas.id"), nullable=True
    )
    type: Mapped[str] = mapped_column(String, index=True)
    name: Mapped[str] = mapped_column(String, index=True)
    metadata_json: Mapped[dict[str, object]] = mapped_column(JSON, default=dict)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True))


class ProvinceOrm(Base):
    __tablename__ = "provinces"

    id: Mapped[str] = mapped_column(String, primary_key=True)
    country_id: Mapped[str] = mapped_column(ForeignKey("countries.id"), index=True)
    name: Mapped[str] = mapped_column(String, index=True)
    timezone: Mapped[str] = mapped_column(String)
    metadata_json: Mapped[dict[str, object]] = mapped_column(JSON, default=dict)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True))


class MunicipalityOrm(Base):
    __tablename__ = "municipalities"

    id: Mapped[str] = mapped_column(String, primary_key=True)
    country_id: Mapped[str] = mapped_column(ForeignKey("countries.id"), index=True)
    province_id: Mapped[str] = mapped_column(ForeignKey("provinces.id"), index=True)
    administrative_area_id: Mapped[str | None] = mapped_column(
        ForeignKey("administrative_areas.id"), nullable=True
    )
    name: Mapped[str] = mapped_column(String, index=True)
    timezone: Mapped[str] = mapped_column(String)
    metadata_json: Mapped[dict[str, object]] = mapped_column(JSON, default=dict)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True))


class ZoneOrm(Base):
    __tablename__ = "zones"

    id: Mapped[str] = mapped_column(String, primary_key=True)
    country_id: Mapped[str] = mapped_column(ForeignKey("countries.id"), index=True)
    province_id: Mapped[str] = mapped_column(ForeignKey("provinces.id"), index=True)
    municipality_id: Mapped[str] = mapped_column(ForeignKey("municipalities.id"), index=True)
    type: Mapped[str] = mapped_column(String, index=True)
    name: Mapped[str] = mapped_column(String, index=True)
    centroid_lat: Mapped[float] = mapped_column(Float)
    centroid_lon: Mapped[float] = mapped_column(Float)
    geometry: Mapped[dict[str, object]] = mapped_column(JSON)
    geometry_wkt: Mapped[str | None] = mapped_column(String, nullable=True)
    geometry_srid: Mapped[int | None] = mapped_column(Integer, nullable=True)
    geometry_bbox: Mapped[dict[str, float] | None] = mapped_column(JSON, nullable=True)
    timezone: Mapped[str] = mapped_column(String)
    metadata_json: Mapped[dict[str, object]] = mapped_column(JSON, default=dict)
    active: Mapped[bool] = mapped_column(Boolean, default=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True))

    __table_args__ = (
        Index("ix_zones_geometry_bbox", "geometry_bbox"),
        Index("ix_zones_geometry_srid", "geometry_srid"),
    )


class SourceOrm(Base):
    __tablename__ = "sources"

    id: Mapped[str] = mapped_column(String, primary_key=True)
    name: Mapped[str] = mapped_column(String)
    provider: Mapped[str] = mapped_column(String)
    reliability_tier: Mapped[str] = mapped_column(String)
    status: Mapped[str] = mapped_column(String)
    last_error: Mapped[str | None] = mapped_column(String, nullable=True)
    last_success_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    last_failure_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    metadata_json: Mapped[dict[str, object]] = mapped_column(JSON, default=dict)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True))


class StationOrm(Base):
    __tablename__ = "stations"

    id: Mapped[str] = mapped_column(String, primary_key=True)
    source_id: Mapped[str] = mapped_column(ForeignKey("sources.id"), index=True)
    external_id: Mapped[str] = mapped_column(String, index=True)
    name: Mapped[str] = mapped_column(String)
    lat: Mapped[float] = mapped_column(Float)
    lon: Mapped[float] = mapped_column(Float)
    geometry_wkt: Mapped[str | None] = mapped_column(String, nullable=True)
    geometry_srid: Mapped[int | None] = mapped_column(Integer, nullable=True)
    country_id: Mapped[str | None] = mapped_column(ForeignKey("countries.id"), nullable=True)
    province_id: Mapped[str | None] = mapped_column(ForeignKey("provinces.id"), nullable=True)
    municipality_id: Mapped[str | None] = mapped_column(
        ForeignKey("municipalities.id"), nullable=True
    )
    timezone: Mapped[str | None] = mapped_column(String, nullable=True)
    metadata_json: Mapped[dict[str, object]] = mapped_column(JSON, default=dict)
    active: Mapped[bool] = mapped_column(Boolean, default=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True))

    __table_args__ = (Index("ix_stations_geometry_srid", "geometry_srid"),)


class EnvironmentalVariableOrm(Base):
    __tablename__ = "environmental_variables"

    id: Mapped[str] = mapped_column(String, primary_key=True)
    code: Mapped[str] = mapped_column(String, unique=True, index=True)
    name: Mapped[str] = mapped_column(String)
    category: Mapped[str] = mapped_column(String, index=True)
    default_unit: Mapped[str] = mapped_column(String)
    metadata_json: Mapped[dict[str, object]] = mapped_column(JSON, default=dict)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True))


class GeometryOrm(Base):
    __tablename__ = "geometries"

    id: Mapped[str] = mapped_column(String, primary_key=True)
    owner_type: Mapped[str] = mapped_column(String, index=True)
    owner_id: Mapped[str] = mapped_column(String, index=True)
    format: Mapped[str] = mapped_column(String, index=True)
    srid: Mapped[int] = mapped_column(Integer, index=True)
    geometry_json: Mapped[dict[str, object] | None] = mapped_column(JSON, nullable=True)
    geometry_wkt: Mapped[str | None] = mapped_column(String, nullable=True)
    geometry_wkb_hex: Mapped[str | None] = mapped_column(String, nullable=True)
    bbox: Mapped[dict[str, float] | None] = mapped_column(JSON, nullable=True)
    metadata_json: Mapped[dict[str, object]] = mapped_column(JSON, default=dict)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True))

    __table_args__ = (Index("ix_geometries_owner", "owner_type", "owner_id"),)


class RawIngestionRecordOrm(Base):
    __tablename__ = "raw_ingestion_records"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    source_id: Mapped[str] = mapped_column(ForeignKey("sources.id"), index=True)
    connector_name: Mapped[str] = mapped_column(String, index=True)
    fetched_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), index=True)
    status: Mapped[str] = mapped_column(String, index=True)
    payload: Mapped[dict[str, object] | list[object] | None] = mapped_column(JSON, nullable=True)
    payload_hash: Mapped[str | None] = mapped_column(String, nullable=True)
    error_message: Mapped[str | None] = mapped_column(String, nullable=True)
    metadata_json: Mapped[dict[str, object]] = mapped_column(JSON, default=dict)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True))


class MeasurementOrm(Base):
    __tablename__ = "measurements"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    source_id: Mapped[str] = mapped_column(ForeignKey("sources.id"), index=True)
    station_id: Mapped[str] = mapped_column(ForeignKey("stations.id"), index=True)
    environmental_variable_id: Mapped[str] = mapped_column(
        ForeignKey("environmental_variables.id"), index=True
    )
    raw_ingestion_id: Mapped[int | None] = mapped_column(
        ForeignKey("raw_ingestion_records.id"), nullable=True
    )
    measured_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), index=True)
    received_at: Mapped[datetime] = mapped_column(DateTime(timezone=True))
    value: Mapped[float] = mapped_column(Float)
    unit: Mapped[str] = mapped_column(String)
    normalized_value: Mapped[float] = mapped_column(Float)
    normalized_unit: Mapped[str] = mapped_column(String)
    lat: Mapped[float | None] = mapped_column(Float, nullable=True)
    lon: Mapped[float | None] = mapped_column(Float, nullable=True)
    zone_id: Mapped[str | None] = mapped_column(String, nullable=True)
    metadata_json: Mapped[dict[str, object] | None] = mapped_column(JSON, nullable=True)
    quality_flags: Mapped[list[str]] = mapped_column(JSON, default=list)
    confidence: Mapped[float] = mapped_column(Float)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True))

    __table_args__ = (
        Index(
            "ix_measurements_station_variable_time",
            "station_id",
            "environmental_variable_id",
            "measured_at",
        ),
        Index("ix_measurements_zone_time", "zone_id", "measured_at"),
    )


class ZoneSnapshotOrm(Base):
    __tablename__ = "zone_snapshots"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    zone_id: Mapped[str] = mapped_column(ForeignKey("zones.id"), index=True)
    calculated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), index=True)
    valid_from: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), index=True)
    valid_to: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), index=True)
    aggregation_period: Mapped[str | None] = mapped_column(String, index=True)
    calculation_version: Mapped[str | None] = mapped_column(String, nullable=True)
    aqi: Mapped[int] = mapped_column(Integer)
    method: Mapped[str] = mapped_column(String)
    confidence: Mapped[float] = mapped_column(Float)
    freshness_minutes: Mapped[int] = mapped_column(Integer)
    dominant_variable_id: Mapped[str | None] = mapped_column(
        ForeignKey("environmental_variables.id"), nullable=True
    )
    quality_flags: Mapped[list[str]] = mapped_column(JSON, default=list)
    quality_metadata: Mapped[dict[str, object] | None] = mapped_column(JSON, nullable=True)
    source_summary: Mapped[dict[str, object]] = mapped_column(JSON, default=dict)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True))

    __table_args__ = (
        Index(
            "ix_zone_snapshots_zone_period_time",
            "zone_id",
            "aggregation_period",
            "calculated_at",
        ),
    )
