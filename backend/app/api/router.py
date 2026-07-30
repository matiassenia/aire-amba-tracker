from datetime import datetime
from typing import Annotated

from fastapi import APIRouter, Depends, Query

from app.analytics.service import distance_km
from app.api.dependencies import (
    get_current_zone_snapshot,
    get_geometry_repository,
    get_get_zone,
    get_list_environmental_variables,
    get_list_measurements,
    get_list_stations,
    get_list_zone_snapshots,
    get_list_zones,
    get_measurements_for_station,
    get_source_statuses,
    get_spatial_seed_stations,
    get_spatial_service,
)
from app.api.schemas import (
    BoundingBoxDto,
    ContainsResultDto,
    EnvironmentalVariableDto,
    GeometryDto,
    HealthResponse,
    IntersectsResultDto,
    MeasurementDto,
    NearestStationDto,
    NearestStationResultDto,
    SourceStatusDto,
    StationDto,
    ZoneCurrentDto,
    ZoneDto,
    ZoneSnapshotHistoryDto,
)
from app.application.ports import GeometryRepository
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
from app.domain.errors import GeometryNotFoundError, InvalidCoordinatesError, InvalidRadiusError
from app.domain.models import (
    GeometryFormat,
    GeometryRecord,
    Measurement,
    Station,
    TimeWindow,
    Zone,
    ZoneSnapshot,
)
from app.gis.services import SpatialService

api_router = APIRouter()

ListZonesDep = Annotated[ListZones, Depends(get_list_zones)]
GetZoneDep = Annotated[GetZone, Depends(get_get_zone)]
ListStationsDep = Annotated[ListStations, Depends(get_list_stations)]
GetCurrentSnapshotDep = Annotated[GetCurrentZoneSnapshot, Depends(get_current_zone_snapshot)]
GetSourceStatusesDep = Annotated[GetSourceStatuses, Depends(get_source_statuses)]
ListVariablesDep = Annotated[ListEnvironmentalVariables, Depends(get_list_environmental_variables)]
ListMeasurementsDep = Annotated[ListMeasurements, Depends(get_list_measurements)]
StationMeasurementsDep = Annotated[GetMeasurementsForStation, Depends(get_measurements_for_station)]
ListZoneSnapshotsDep = Annotated[ListZoneSnapshots, Depends(get_list_zone_snapshots)]
GeometryRepositoryDep = Annotated[GeometryRepository, Depends(get_geometry_repository)]
SpatialServiceDep = Annotated[SpatialService, Depends(get_spatial_service)]
SpatialStationsDep = Annotated[tuple[Station, ...], Depends(get_spatial_seed_stations)]


def _time_window(start: datetime | None, end: datetime | None) -> TimeWindow | None:
    if start is None or end is None:
        return None
    return TimeWindow(start=start, end=end)


def _zone_dto(zone: Zone) -> ZoneDto:
    return ZoneDto(
        id=zone.id,
        name=zone.name,
        country_id=zone.country_id,
        province_id=zone.province_id,
        municipality_id=zone.municipality_id,
        type=zone.type.value,
        centroid={"lat": zone.centroid_lat, "lon": zone.centroid_lon},
        polygon=list(zone.polygon),
        timezone=zone.timezone,
        metadata=zone.metadata,
    )


def _station_dto(station: Station) -> StationDto:
    return StationDto(
        uid=int(station.external_id),
        name=station.name,
        lat=station.lat,
        lon=station.lon,
    )


def _bbox_dto(bbox: tuple[float, float, float, float] | None) -> BoundingBoxDto | None:
    if bbox is None:
        return None
    min_lat, min_lon, max_lat, max_lon = bbox
    return BoundingBoxDto(min_lat=min_lat, min_lon=min_lon, max_lat=max_lat, max_lon=max_lon)


def _geometry_dto(record: GeometryRecord) -> GeometryDto:
    geometry = record.geometry if not isinstance(record.geometry, bytes) else None
    return GeometryDto(
        id=record.id,
        owner_type=record.owner_type,
        owner_id=record.owner_id,
        format=record.format.value,
        srid=record.srid,
        geometry=geometry,
        bbox=_bbox_dto(record.bbox),
        metadata=record.metadata,
    )


def _parse_polygon(raw: str) -> tuple[tuple[float, float], ...]:
    points = []
    for item in raw.split(";"):
        lat_text, lon_text = item.split(",", maxsplit=1)
        points.append((float(lat_text), float(lon_text)))
    if len(points) < 3:
        raise ValueError("polygon must contain at least three points")
    return tuple(points)


def _validate_point(lat: float, lon: float) -> None:
    if not (-90 <= lat <= 90 and -180 <= lon <= 180):
        raise InvalidCoordinatesError()


def _validate_radius(radius_km: float) -> None:
    if radius_km <= 0:
        raise InvalidRadiusError()


def _measurement_dto(measurement: Measurement) -> MeasurementDto:
    return MeasurementDto(
        id=measurement.id,
        source_id=measurement.source_id,
        station_id=measurement.station_id,
        environmental_variable_id=measurement.environmental_variable_id,
        measured_at=measurement.measured_at.isoformat(),
        received_at=measurement.received_at.isoformat(),
        value=measurement.value,
        unit=measurement.unit,
        normalized_value=measurement.normalized_value,
        normalized_unit=measurement.normalized_unit,
        lat=measurement.lat,
        lon=measurement.lon,
        zone_id=measurement.zone_id,
        quality_flags=list(measurement.quality_flags),
        confidence=measurement.confidence,
        metadata=measurement.metadata,
    )


def _snapshot_history_dto(snapshot: ZoneSnapshot) -> ZoneSnapshotHistoryDto:
    return ZoneSnapshotHistoryDto(
        zone_id=snapshot.zone_id,
        zone_name=snapshot.zone_name,
        calculated_at=snapshot.calculated_at.isoformat(),
        valid_from=snapshot.valid_from.isoformat(),
        valid_to=snapshot.valid_to.isoformat(),
        aggregation_period=snapshot.aggregation_period.value,
        calculation_version=snapshot.calculation_version,
        aqi=snapshot.aqi,
        method=snapshot.method.value,
        confidence=snapshot.confidence,
        freshness_minutes=snapshot.freshness_minutes,
        dominant_variable=snapshot.dominant_variable_code,
        source=snapshot.primary_source_id,
        quality_flags=list(snapshot.quality_flags),
        quality_metadata=snapshot.quality_metadata,
    )


@api_router.get("/health", response_model=HealthResponse)
async def health() -> HealthResponse:
    return HealthResponse(status="ok", version=get_settings().app_version)


@api_router.get("/zones", response_model=list[ZoneDto])
async def list_zones(use_case: ListZonesDep) -> list[ZoneDto]:
    return [_zone_dto(zone) for zone in use_case.execute()]


@api_router.get("/zones/contains", response_model=ContainsResultDto)
async def zones_contains(
    spatial: SpatialServiceDep,
    zones: ListZonesDep,
    lat: float,
    lon: float,
) -> ContainsResultDto:
    _validate_point(lat, lon)
    matches = spatial.get_zones_containing_point(lat, lon, zones.execute())
    return ContainsResultDto(lat=lat, lon=lon, zones=[_zone_dto(zone) for zone in matches])


@api_router.get("/zones/intersects", response_model=IntersectsResultDto)
async def zones_intersects(
    spatial: SpatialServiceDep,
    zones: ListZonesDep,
    polygon: str,
) -> IntersectsResultDto:
    matches = spatial.get_zones_intersecting(_parse_polygon(polygon), zones.execute())
    return IntersectsResultDto(zones=[_zone_dto(zone) for zone in matches])


@api_router.get("/zones/{zone_id}", response_model=ZoneDto)
async def get_zone(zone_id: str, use_case: GetZoneDep) -> ZoneDto:
    zone = use_case.execute(zone_id)
    return _zone_dto(zone)


@api_router.get("/zones/{zone_id}/current", response_model=ZoneCurrentDto)
async def get_zone_current(
    zone_id: str,
    use_case: GetCurrentSnapshotDep,
) -> ZoneCurrentDto:
    snapshot = await use_case.execute(zone_id)
    if snapshot.confidence >= 0.8:
        confidence = "high"
    elif snapshot.confidence >= 0.5:
        confidence = "medium"
    else:
        confidence = "low"

    return ZoneCurrentDto(
        zone_id=snapshot.zone_id,
        zone_name=snapshot.zone_name,
        aqi=snapshot.aqi,
        source=snapshot.primary_source_id,
        confidence=confidence,
        nearest_stations=[
            NearestStationDto(
                uid=int(station.external_id),
                name=station.name,
                lat=station.lat,
                lon=station.lon,
                distance_km=round(
                    distance_km(
                        snapshot.centroid_lat,
                        snapshot.centroid_lon,
                        station.lat,
                        station.lon,
                    ),
                    2,
                ),
            )
            for station in snapshot.nearest_stations
        ],
        dominant_variable=snapshot.dominant_variable_code,
        last_updated=snapshot.calculated_at.isoformat(),
        method=snapshot.method.value,
        freshness_minutes=snapshot.freshness_minutes,
        quality_flags=list(snapshot.quality_flags),
    )


@api_router.get("/stations", response_model=list[StationDto])
async def list_stations(
    use_case: ListStationsDep,
    limit: int = Query(default=100, ge=1, le=1000),
    offset: int = Query(default=0, ge=0),
) -> list[StationDto]:
    return [_station_dto(station) for station in use_case.execute(limit=limit, offset=offset)]


@api_router.get("/stations/near", response_model=list[NearestStationResultDto])
async def stations_near(
    spatial: SpatialServiceDep,
    stations: SpatialStationsDep,
    lat: float,
    lon: float,
    radius_km: float = Query(default=10, gt=0),
    limit: int = Query(default=5, ge=1, le=50),
) -> list[NearestStationResultDto]:
    _validate_point(lat, lon)
    _validate_radius(radius_km)
    persisted = spatial.nearest_station_results(lat, lon, radius_km, limit)
    if get_settings().spatial_backend == "postgis":
        return [
            NearestStationResultDto(station=_station_dto(station), distance_km=round(distance, 3))
            for station, distance in persisted
        ]
    if persisted:
        return [
            NearestStationResultDto(station=_station_dto(station), distance_km=round(distance, 3))
            for station, distance in persisted
        ]

    nearest = spatial.get_nearest_stations(lat, lon, stations, limit, radius_km=radius_km)
    return [
        NearestStationResultDto(
            station=_station_dto(station),
            distance_km=round(spatial.distance((lat, lon), (station.lat, station.lon)), 3),
        )
        for station in nearest
        if spatial.distance((lat, lon), (station.lat, station.lon)) <= radius_km
    ]


@api_router.get("/zones/{zone_id}/geometry", response_model=GeometryDto)
async def zone_geometry(zone_id: str, geometries: GeometryRepositoryDep) -> GeometryDto:
    record = geometries.get_geometry("zone", zone_id)
    if record is None:
        raise GeometryNotFoundError("zone", zone_id)
    return _geometry_dto(record)


@api_router.get("/stations/{station_id}/geometry", response_model=GeometryDto)
async def station_geometry(
    station_id: str,
    geometries: GeometryRepositoryDep,
    stations: SpatialStationsDep,
) -> GeometryDto:
    record = geometries.get_geometry("station", station_id)
    if record is not None:
        return _geometry_dto(record)
    if get_settings().spatial_backend == "postgis":
        raise GeometryNotFoundError("station", station_id)

    station = next((item for item in stations if item.id == station_id), None)
    if station is None:
        raise GeometryNotFoundError("station", station_id)
    geometry: dict[str, object] = {"type": "Point", "coordinates": [station.lon, station.lat]}
    return _geometry_dto(
        GeometryRecord(
            id=f"station:{station_id}",
            owner_type="station",
            owner_id=station_id,
            format=GeometryFormat.GEOJSON,
            srid=4326,
            geometry=geometry,
        )
    )


@api_router.get("/variables", response_model=list[EnvironmentalVariableDto])
async def list_variables(use_case: ListVariablesDep) -> list[EnvironmentalVariableDto]:
    return [
        EnvironmentalVariableDto(
            id=variable.id,
            code=variable.code,
            name=variable.name,
            category=variable.category.value,
            default_unit=variable.default_unit,
            metadata=variable.metadata,
        )
        for variable in use_case.execute()
    ]


@api_router.get("/measurements", response_model=list[MeasurementDto])
async def list_measurements(
    use_case: ListMeasurementsDep,
    station_id: str | None = None,
    zone_id: str | None = None,
    variable_code: str | None = None,
    start: datetime | None = None,
    end: datetime | None = None,
    limit: int = Query(default=100, ge=1, le=1000),
    offset: int = Query(default=0, ge=0),
) -> list[MeasurementDto]:
    return [
        _measurement_dto(measurement)
        for measurement in use_case.execute(
            station_id=station_id,
            zone_id=zone_id,
            variable_code=variable_code,
            window=_time_window(start, end),
            limit=limit,
            offset=offset,
        )
    ]


@api_router.get("/measurements/{station_id}", response_model=list[MeasurementDto])
async def list_measurements_for_station(
    station_id: str,
    use_case: StationMeasurementsDep,
    start: datetime,
    end: datetime,
    limit: int = Query(default=100, ge=1, le=1000),
    offset: int = Query(default=0, ge=0),
) -> list[MeasurementDto]:
    return [
        _measurement_dto(measurement)
        for measurement in use_case.execute(
            station_id=station_id,
            window=TimeWindow(start=start, end=end),
            limit=limit,
            offset=offset,
        )
    ]


@api_router.get("/history", response_model=list[MeasurementDto])
async def list_history(
    use_case: ListMeasurementsDep,
    start: datetime | None = None,
    end: datetime | None = None,
    limit: int = Query(default=100, ge=1, le=1000),
    offset: int = Query(default=0, ge=0),
) -> list[MeasurementDto]:
    return [
        _measurement_dto(measurement)
        for measurement in use_case.execute(
            window=_time_window(start, end),
            limit=limit,
            offset=offset,
        )
    ]


@api_router.get("/zones/{zone_id}/history", response_model=list[ZoneSnapshotHistoryDto])
async def list_zone_history(
    zone_id: str,
    use_case: ListZoneSnapshotsDep,
    start: datetime | None = None,
    end: datetime | None = None,
    limit: int = Query(default=100, ge=1, le=1000),
    cursor: str | None = None,
) -> list[ZoneSnapshotHistoryDto]:
    return [
        _snapshot_history_dto(snapshot)
        for snapshot in use_case.execute(
            zone_id=zone_id,
            window=_time_window(start, end),
            limit=limit,
            cursor=cursor,
        )
    ]


@api_router.get("/stations/{station_id}/history", response_model=list[MeasurementDto])
async def list_station_history(
    station_id: str,
    use_case: StationMeasurementsDep,
    start: datetime,
    end: datetime,
    limit: int = Query(default=100, ge=1, le=1000),
    offset: int = Query(default=0, ge=0),
) -> list[MeasurementDto]:
    return [
        _measurement_dto(measurement)
        for measurement in use_case.execute(
            station_id=station_id,
            window=TimeWindow(start=start, end=end),
            limit=limit,
            offset=offset,
        )
    ]


@api_router.get("/sources/status", response_model=list[SourceStatusDto])
async def sources_status(
    use_case: GetSourceStatusesDep,
) -> list[SourceStatusDto]:
    return [
        SourceStatusDto(
            id=source.id,
            name=source.name,
            provider=source.provider,
            status=source.status.value,
            reliability_tier=source.reliability_tier,
        )
        for source in use_case.execute()
    ]
