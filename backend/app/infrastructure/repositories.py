from threading import Lock

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.application.ports import (
    CountryRepository,
    EnvironmentalVariableRepository,
    MeasurementRepository,
    MunicipalityRepository,
    ProvinceRepository,
    SourceStatusRepository,
    StationRepository,
    TimeSeriesRepository,
    ZoneRepository,
    ZoneSnapshotRepository,
)
from app.db.models import StationOrm
from app.domain.models import (
    Country,
    CursorPage,
    EnvironmentalVariable,
    Measurement,
    MeasurementFilter,
    Municipality,
    Province,
    Source,
    Station,
    TimeWindow,
    Zone,
    ZoneSnapshot,
)
from app.infrastructure.seed_data import (
    ARGENTINA,
    ENVIRONMENTAL_VARIABLES,
    MUNICIPALITIES,
    PROVINCES,
    SPATIAL_STATIONS,
    ZONES,
)


class InMemoryCountryRepository(CountryRepository):
    def __init__(self, countries: tuple[Country, ...] = (ARGENTINA,)) -> None:
        self._countries = countries

    def list_countries(self) -> tuple[Country, ...]:
        return self._countries


class InMemoryProvinceRepository(ProvinceRepository):
    def __init__(self, provinces: tuple[Province, ...] = PROVINCES) -> None:
        self._provinces = provinces

    def list_provinces(self, country_id: str | None = None) -> tuple[Province, ...]:
        if country_id is None:
            return self._provinces
        return tuple(province for province in self._provinces if province.country_id == country_id)


class InMemoryMunicipalityRepository(MunicipalityRepository):
    def __init__(self, municipalities: tuple[Municipality, ...] = MUNICIPALITIES) -> None:
        self._municipalities = municipalities

    def list_municipalities(
        self,
        province_id: str | None = None,
    ) -> tuple[Municipality, ...]:
        if province_id is None:
            return self._municipalities
        return tuple(
            municipality
            for municipality in self._municipalities
            if municipality.province_id == province_id
        )


class InMemoryZoneRepository(ZoneRepository):
    def __init__(self, zones: tuple[Zone, ...] = ZONES) -> None:
        self._zones = zones

    def list_zones(self) -> tuple[Zone, ...]:
        return self._zones

    def get_zone(self, zone_id: str) -> Zone | None:
        return next((zone for zone in self._zones if zone.id == zone_id), None)


class InMemoryStationRepository(StationRepository):
    def __init__(self, stations: tuple[Station, ...] = SPATIAL_STATIONS) -> None:
        self._stations = stations

    def list_stations(
        self,
        limit: int = 100,
        offset: int = 0,
        region_id: str | None = None,
        bounds: str | None = None,
    ) -> tuple[Station, ...]:
        active_stations = tuple(station for station in self._stations if station.active)
        return active_stations[offset : offset + limit]


class SQLAlchemyStationRepository(StationRepository):
    def __init__(self, session: Session) -> None:
        self._session = session

    def list_stations(
        self,
        limit: int = 100,
        offset: int = 0,
        region_id: str | None = None,
        bounds: str | None = None,
    ) -> tuple[Station, ...]:
        statement = (
            select(StationOrm)
            .where(StationOrm.active.is_(True))
            .order_by(StationOrm.id)
            .limit(limit)
            .offset(offset)
        )
        return tuple(self._station(row) for row in self._session.scalars(statement))

    def _station(self, row: StationOrm) -> Station:
        return Station(
            id=row.id,
            source_id=row.source_id,
            external_id=row.external_id,
            name=row.name,
            lat=row.lat,
            lon=row.lon,
            country_id=row.country_id,
            province_id=row.province_id,
            municipality_id=row.municipality_id,
            timezone=row.timezone,
            metadata={str(key): str(value) for key, value in row.metadata_json.items()},
            active=row.active,
        )


class InMemoryEnvironmentalVariableRepository(EnvironmentalVariableRepository):
    def __init__(
        self,
        variables: tuple[EnvironmentalVariable, ...] = ENVIRONMENTAL_VARIABLES,
    ) -> None:
        self._variables = variables

    def list_variables(self) -> tuple[EnvironmentalVariable, ...]:
        return self._variables

    def get_variable(self, code: str) -> EnvironmentalVariable | None:
        normalized_code = code.strip().lower()
        return next(
            (variable for variable in self._variables if variable.code == normalized_code),
            None,
        )


class InMemoryMeasurementRepository(MeasurementRepository):
    def __init__(self, measurements: tuple[Measurement, ...] = ()) -> None:
        self._measurements = measurements

    def list_measurements(self, filters: MeasurementFilter) -> tuple[Measurement, ...]:
        measurements = self._apply_filters(filters)
        offset = filters.page.offset
        return measurements[offset : offset + filters.page.limit]

    def stream_measurements(self, filters: MeasurementFilter) -> tuple[Measurement, ...]:
        return self.list_measurements(filters)

    def _apply_filters(self, filters: MeasurementFilter) -> tuple[Measurement, ...]:
        measurements = self._measurements
        if filters.station_id is not None:
            measurements = tuple(
                measurement
                for measurement in measurements
                if measurement.station_id == filters.station_id
            )
        if filters.zone_id is not None:
            measurements = tuple(
                measurement
                for measurement in measurements
                if measurement.zone_id == filters.zone_id
            )
        if filters.variable_code is not None:
            measurements = tuple(
                measurement
                for measurement in measurements
                if measurement.environmental_variable_id == filters.variable_code
            )
        if filters.time_window is not None:
            measurements = tuple(
                measurement
                for measurement in measurements
                if filters.time_window.start <= measurement.measured_at < filters.time_window.end
            )
        return tuple(
            sorted(measurements, key=lambda measurement: measurement.measured_at, reverse=True)
        )


class InMemoryTimeSeriesRepository(TimeSeriesRepository):
    def __init__(self, measurements: MeasurementRepository) -> None:
        self._measurements = measurements

    def list_measurements_for_window(
        self,
        window: TimeWindow,
        filters: MeasurementFilter,
    ) -> tuple[Measurement, ...]:
        scoped_filters = MeasurementFilter(
            station_id=filters.station_id,
            zone_id=filters.zone_id,
            variable_code=filters.variable_code,
            time_window=window,
            page=filters.page,
        )
        return self._measurements.list_measurements(scoped_filters)


class InMemoryZoneSnapshotRepository(ZoneSnapshotRepository):
    def __init__(self, snapshots: tuple[ZoneSnapshot, ...] = ()) -> None:
        self._snapshots = snapshots

    def list_snapshots(
        self,
        zone_id: str | None,
        window: TimeWindow | None,
        page: CursorPage,
    ) -> tuple[ZoneSnapshot, ...]:
        snapshots = self._snapshots
        if zone_id is not None:
            snapshots = tuple(snapshot for snapshot in snapshots if snapshot.zone_id == zone_id)
        if window is not None:
            snapshots = tuple(
                snapshot
                for snapshot in snapshots
                if window.start <= snapshot.calculated_at < window.end
            )
        offset = int(page.cursor) if page.cursor else 0
        return tuple(
            sorted(snapshots, key=lambda snapshot: snapshot.calculated_at, reverse=True)[
                offset : offset + page.limit
            ]
        )


class InMemorySourceStatusRepository(SourceStatusRepository):
    def __init__(self, initial_sources: tuple[Source, ...]) -> None:
        self._sources = {source.id: source for source in initial_sources}
        self._lock = Lock()

    def list_sources(self) -> tuple[Source, ...]:
        with self._lock:
            return tuple(self._sources.values())

    def update_source(self, source: Source) -> None:
        with self._lock:
            self._sources[source.id] = source
