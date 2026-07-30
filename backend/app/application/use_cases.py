from app.application.ports import (
    EnvironmentalVariableRepository,
    MeasurementProvider,
    MeasurementRepository,
    SnapshotCalculator,
    SourceStatusRepository,
    StationRepository,
    TimeSeriesRepository,
    ZoneRepository,
    ZoneSnapshotRepository,
)
from app.domain.errors import NoRecentDataError, ZoneNotFoundError
from app.domain.models import (
    CursorPage,
    EnvironmentalVariable,
    Measurement,
    MeasurementFilter,
    Page,
    Source,
    Station,
    TimeWindow,
    Zone,
    ZoneSnapshot,
)


class ListZones:
    def __init__(self, zones: ZoneRepository) -> None:
        self._zones = zones

    def execute(self) -> tuple[Zone, ...]:
        return self._zones.list_zones()


class GetZone:
    def __init__(self, zones: ZoneRepository) -> None:
        self._zones = zones

    def execute(self, zone_id: str) -> Zone:
        zone = self._zones.get_zone(zone_id)
        if zone is None:
            raise ZoneNotFoundError(zone_id)
        return zone


class ListStations:
    def __init__(self, stations: StationRepository) -> None:
        self._stations = stations

    def execute(
        self,
        limit: int = 100,
        offset: int = 0,
        region_id: str | None = None,
        bounds: str | None = None,
    ) -> tuple[Station, ...]:
        return self._stations.list_stations(
            limit=limit,
            offset=offset,
            region_id=region_id,
            bounds=bounds,
        )


class ListEnvironmentalVariables:
    def __init__(self, variables: EnvironmentalVariableRepository) -> None:
        self._variables = variables

    def execute(self) -> tuple[EnvironmentalVariable, ...]:
        return self._variables.list_variables()


class ListMeasurements:
    def __init__(self, measurements: MeasurementRepository) -> None:
        self._measurements = measurements

    def execute(
        self,
        station_id: str | None = None,
        zone_id: str | None = None,
        variable_code: str | None = None,
        window: TimeWindow | None = None,
        limit: int = 100,
        offset: int = 0,
    ) -> tuple[Measurement, ...]:
        return self._measurements.list_measurements(
            MeasurementFilter(
                station_id=station_id,
                zone_id=zone_id,
                variable_code=variable_code,
                time_window=window,
                page=Page(limit=limit, offset=offset),
            )
        )


class GetMeasurementsForStation:
    def __init__(self, time_series: TimeSeriesRepository) -> None:
        self._time_series = time_series

    def execute(
        self,
        station_id: str,
        window: TimeWindow,
        limit: int = 100,
        offset: int = 0,
    ) -> tuple[Measurement, ...]:
        return self._time_series.list_measurements_for_window(
            window,
            MeasurementFilter(station_id=station_id, page=Page(limit=limit, offset=offset)),
        )


class ListZoneSnapshots:
    def __init__(self, snapshots: ZoneSnapshotRepository) -> None:
        self._snapshots = snapshots

    def execute(
        self,
        zone_id: str | None,
        window: TimeWindow | None,
        limit: int = 100,
        cursor: str | None = None,
    ) -> tuple[ZoneSnapshot, ...]:
        return self._snapshots.list_snapshots(
            zone_id=zone_id,
            window=window,
            page=CursorPage(limit=limit, cursor=cursor),
        )


class GetCurrentZoneSnapshot:
    def __init__(
        self,
        zones: ZoneRepository,
        measurements: MeasurementProvider,
        source_statuses: SourceStatusRepository,
        snapshots: SnapshotCalculator,
    ) -> None:
        self._zones = zones
        self._measurements = measurements
        self._source_statuses = source_statuses
        self._snapshots = snapshots

    async def execute(self, zone_id: str) -> ZoneSnapshot:
        zone = self._zones.get_zone(zone_id)
        if zone is None:
            raise ZoneNotFoundError(zone_id)
        measurements = await self._measurements.latest_measurements()
        if not measurements:
            raise NoRecentDataError()
        return self._snapshots.calculate(zone, measurements, self._source_statuses.list_sources())


class GetSourceStatuses:
    def __init__(self, source_statuses: SourceStatusRepository) -> None:
        self._source_statuses = source_statuses

    def execute(self) -> tuple[Source, ...]:
        return self._source_statuses.list_sources()
