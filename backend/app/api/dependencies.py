from collections.abc import Generator
from typing import Annotated

from fastapi import Depends

from app.analytics.service import SnapshotService
from app.application.ports import (
    EnvironmentalVariableRepository,
    GeometryRepository,
    MeasurementRepository,
    SourceConnector,
    SourceStatusRepository,
    StationRepository,
    TimeSeriesRepository,
    ZoneRepository,
    ZoneSnapshotRepository,
)
from app.application.use_cases import (
    GetCurrentZoneSnapshot,
    GetMeasurementsForStation,
    GetSourceStatuses,
    GetZone,
    ListEnvironmentalVariables,
    ListMeasurements,
    ListStations,
    ListZones,
    ListZoneSnapshots,
)
from app.core.config import get_settings
from app.db.session import SessionLocal, engine
from app.domain.errors import ConfigurationError
from app.domain.models import SourceStatusValue, Station
from app.gis.repositories import InMemoryGeometryRepository
from app.gis.services import SpatialService
from app.infrastructure.postgis_geometry import PostGISGeometryRepository
from app.infrastructure.repositories import (
    InMemoryEnvironmentalVariableRepository,
    InMemoryMeasurementRepository,
    InMemorySourceStatusRepository,
    InMemoryStationRepository,
    InMemoryTimeSeriesRepository,
    InMemoryZoneRepository,
    InMemoryZoneSnapshotRepository,
    SQLAlchemyStationRepository,
)
from app.infrastructure.seed_data import SPATIAL_STATIONS
from app.infrastructure.sources.demo import DEMO_SOURCE, DemoConnector
from app.infrastructure.sources.waqi import WaqiConnector, waqi_source
from app.measurements.service import ConnectorMeasurementProvider

_zone_repository = InMemoryZoneRepository()
_environmental_variable_repository = InMemoryEnvironmentalVariableRepository()
_measurement_repository = InMemoryMeasurementRepository()
_station_repository = InMemoryStationRepository()
_time_series_repository = InMemoryTimeSeriesRepository(_measurement_repository)
_zone_snapshot_repository = InMemoryZoneSnapshotRepository()
_source_status_repository = InMemorySourceStatusRepository(
    (waqi_source(status=SourceStatusValue.NOT_CONFIGURED), DEMO_SOURCE)
)


def get_zone_repository() -> ZoneRepository:
    return _zone_repository


def get_geometry_repository() -> Generator[GeometryRepository]:
    settings = get_settings()
    if settings.spatial_backend == "postgis":
        if engine.dialect.name != "postgresql":
            raise ConfigurationError("SPATIAL_BACKEND=postgis requires a PostgreSQL database URL")
        session = SessionLocal()
        try:
            yield PostGISGeometryRepository(session)
            session.commit()
        except Exception:
            session.rollback()
            raise
        finally:
            session.close()
        return
    if settings.environment == "production" and engine.dialect.name == "postgresql":
        raise ConfigurationError(
            "production PostgreSQL deployments must set SPATIAL_BACKEND=postgis"
        )
    yield InMemoryGeometryRepository(_zone_repository.list_zones())


def get_station_repository() -> Generator[StationRepository]:
    if engine.dialect.name == "postgresql":
        session = SessionLocal()
        try:
            yield SQLAlchemyStationRepository(session)
        except Exception:
            session.rollback()
            raise
        finally:
            session.close()
        return
    yield _station_repository


def get_spatial_service(
    geometry_repository: Annotated[GeometryRepository, Depends(get_geometry_repository)],
) -> SpatialService:
    return SpatialService(geometry_repository)


def get_spatial_seed_stations() -> tuple[Station, ...]:
    return SPATIAL_STATIONS


def get_source_status_repository() -> SourceStatusRepository:
    return _source_status_repository


def get_environmental_variable_repository() -> EnvironmentalVariableRepository:
    return _environmental_variable_repository


def get_measurement_repository() -> MeasurementRepository:
    return _measurement_repository


def get_time_series_repository() -> TimeSeriesRepository:
    return _time_series_repository


def get_zone_snapshot_repository() -> ZoneSnapshotRepository:
    return _zone_snapshot_repository


def get_source_connector() -> SourceConnector:
    settings = get_settings()
    if settings.demo_mode:
        if settings.environment == "production":
            raise ConfigurationError("demo mode cannot be enabled in production")
        return DemoConnector()
    return WaqiConnector(
        token=settings.waqi_token,
        bounds=settings.waqi_bounds,
        timeout_seconds=settings.waqi_timeout_seconds,
    )


def get_snapshot_calculator() -> SnapshotService:
    return SnapshotService()


def get_list_zones() -> ListZones:
    return ListZones(get_zone_repository())


def get_get_zone() -> GetZone:
    return GetZone(get_zone_repository())


def get_list_stations(
    station_repository: Annotated[StationRepository, Depends(get_station_repository)],
) -> ListStations:
    return ListStations(station_repository)


def get_current_zone_snapshot() -> GetCurrentZoneSnapshot:
    provider = ConnectorMeasurementProvider(get_source_connector(), get_source_status_repository())
    return GetCurrentZoneSnapshot(
        get_zone_repository(),
        provider,
        get_source_status_repository(),
        get_snapshot_calculator(),
    )


def get_source_statuses() -> GetSourceStatuses:
    return GetSourceStatuses(get_source_status_repository())


def get_list_environmental_variables() -> ListEnvironmentalVariables:
    return ListEnvironmentalVariables(get_environmental_variable_repository())


def get_list_measurements() -> ListMeasurements:
    return ListMeasurements(get_measurement_repository())


def get_measurements_for_station() -> GetMeasurementsForStation:
    return GetMeasurementsForStation(get_time_series_repository())


def get_list_zone_snapshots() -> ListZoneSnapshots:
    return ListZoneSnapshots(get_zone_snapshot_repository())
