from abc import ABC, abstractmethod
from typing import Protocol

from app.domain.models import (
    Country,
    CursorPage,
    EnvironmentalVariable,
    GeometryRecord,
    Measurement,
    MeasurementFilter,
    Municipality,
    NormalizedMeasurement,
    Province,
    RawIngestionRecord,
    Source,
    Station,
    TimeWindow,
    Zone,
    ZoneSnapshot,
)


class CountryRepository(ABC):
    @abstractmethod
    def list_countries(self) -> tuple[Country, ...]:
        raise NotImplementedError


class ProvinceRepository(ABC):
    @abstractmethod
    def list_provinces(self, country_id: str | None = None) -> tuple[Province, ...]:
        raise NotImplementedError


class MunicipalityRepository(ABC):
    @abstractmethod
    def list_municipalities(
        self,
        province_id: str | None = None,
    ) -> tuple[Municipality, ...]:
        raise NotImplementedError


class ZoneRepository(ABC):
    @abstractmethod
    def list_zones(self) -> tuple[Zone, ...]:
        raise NotImplementedError

    @abstractmethod
    def get_zone(self, zone_id: str) -> Zone | None:
        raise NotImplementedError


class StationRepository(ABC):
    @abstractmethod
    def list_stations(self, limit: int = 100, offset: int = 0) -> tuple[Station, ...]:
        raise NotImplementedError


class GeometryRepository(ABC):
    @abstractmethod
    def get_geometry(self, owner_type: str, owner_id: str) -> GeometryRecord | None:
        raise NotImplementedError

    @abstractmethod
    def list_geometries(
        self,
        owner_type: str | None = None,
        page: CursorPage | None = None,
    ) -> tuple[GeometryRecord, ...]:
        raise NotImplementedError

    @abstractmethod
    def contains_point(self, owner_type: str, owner_id: str, lat: float, lon: float) -> bool:
        raise NotImplementedError

    @abstractmethod
    def intersects_polygon(
        self,
        owner_type: str,
        owner_id: str,
        polygon: tuple[tuple[float, float], ...],
    ) -> bool:
        raise NotImplementedError

    @abstractmethod
    def distance_between_points(
        self,
        first: tuple[float, float],
        second: tuple[float, float],
    ) -> float:
        raise NotImplementedError

    @abstractmethod
    def buffer_point(
        self,
        point: tuple[float, float],
        radius_km: float,
    ) -> tuple[float, float, float, float]:
        raise NotImplementedError

    @abstractmethod
    def bounding_box(
        self,
        owner_type: str,
        owner_id: str,
    ) -> tuple[float, float, float, float] | None:
        raise NotImplementedError

    @abstractmethod
    def nearest_stations(
        self,
        lat: float,
        lon: float,
        radius_km: float,
        limit: int,
    ) -> tuple[tuple[Station, float], ...]:
        raise NotImplementedError

    @abstractmethod
    def zones_containing_point(self, lat: float, lon: float) -> tuple[Zone, ...]:
        raise NotImplementedError

    @abstractmethod
    def zones_intersecting_polygon(
        self,
        polygon: tuple[tuple[float, float], ...],
    ) -> tuple[Zone, ...]:
        raise NotImplementedError


class EnvironmentalVariableRepository(ABC):
    @abstractmethod
    def list_variables(self) -> tuple[EnvironmentalVariable, ...]:
        raise NotImplementedError

    @abstractmethod
    def get_variable(self, code: str) -> EnvironmentalVariable | None:
        raise NotImplementedError


class MeasurementRepository(ABC):
    @abstractmethod
    def list_measurements(self, filters: MeasurementFilter) -> tuple[Measurement, ...]:
        raise NotImplementedError

    @abstractmethod
    def stream_measurements(self, filters: MeasurementFilter) -> tuple[Measurement, ...]:
        raise NotImplementedError


class TimeSeriesRepository(ABC):
    @abstractmethod
    def list_measurements_for_window(
        self,
        window: TimeWindow,
        filters: MeasurementFilter,
    ) -> tuple[Measurement, ...]:
        raise NotImplementedError


class ZoneSnapshotRepository(ABC):
    @abstractmethod
    def list_snapshots(
        self,
        zone_id: str | None,
        window: TimeWindow | None,
        page: CursorPage,
    ) -> tuple[ZoneSnapshot, ...]:
        raise NotImplementedError


class SourceStatusRepository(ABC):
    @abstractmethod
    def list_sources(self) -> tuple[Source, ...]:
        raise NotImplementedError

    @abstractmethod
    def update_source(self, source: Source) -> None:
        raise NotImplementedError


class SourceConnector(ABC):
    @abstractmethod
    def source(self) -> Source:
        raise NotImplementedError

    @abstractmethod
    async def fetch_raw(self) -> RawIngestionRecord:
        raise NotImplementedError

    @abstractmethod
    def parse(self, raw: RawIngestionRecord) -> tuple[NormalizedMeasurement, ...]:
        raise NotImplementedError


class MeasurementProvider(ABC):
    @abstractmethod
    async def latest_measurements(self) -> tuple[NormalizedMeasurement, ...]:
        raise NotImplementedError

    @abstractmethod
    async def latest_stations(self) -> tuple[Station, ...]:
        raise NotImplementedError


class SnapshotCalculator(Protocol):
    def calculate(
        self,
        zone: Zone,
        measurements: tuple[NormalizedMeasurement, ...],
        sources: tuple[Source, ...],
    ) -> ZoneSnapshot:
        pass


class SpatialQueryService(Protocol):
    def get_stations_inside_zone(
        self,
        zone: Zone,
        stations: tuple[Station, ...],
    ) -> tuple[Station, ...]:
        pass

    def get_nearest_stations(
        self,
        lat: float,
        lon: float,
        stations: tuple[Station, ...],
        limit: int,
    ) -> tuple[Station, ...]:
        pass

    def get_zones_intersecting(
        self,
        polygon: tuple[tuple[float, float], ...],
        zones: tuple[Zone, ...],
    ) -> tuple[Zone, ...]:
        pass

    def get_measurements_inside_polygon(
        self,
        polygon: tuple[tuple[float, float], ...],
        measurements: tuple[Measurement, ...],
    ) -> tuple[Measurement, ...]:
        pass

    def get_measurements_near_point(
        self,
        lat: float,
        lon: float,
        radius_km: float,
        measurements: tuple[Measurement, ...],
    ) -> tuple[Measurement, ...]:
        pass
