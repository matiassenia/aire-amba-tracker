from app.application.ports import MeasurementProvider, SourceConnector, SourceStatusRepository
from app.domain.errors import AppError, NoRecentDataError
from app.domain.models import NormalizedMeasurement, SourceStatusValue, Station


class ConnectorMeasurementProvider(MeasurementProvider):
    def __init__(
        self,
        connector: SourceConnector,
        source_statuses: SourceStatusRepository,
    ) -> None:
        self._connector = connector
        self._source_statuses = source_statuses
        self._source_statuses.update_source(connector.source())

    async def latest_measurements(self) -> tuple[NormalizedMeasurement, ...]:
        try:
            raw = await self._connector.fetch_raw()
            measurements = self._connector.parse(raw)
            self._source_statuses.update_source(self._connector.source())
            return measurements
        except AppError as exc:
            source = self._connector.source()
            self._source_statuses.update_source(
                type(source)(
                    id=source.id,
                    name=source.name,
                    provider=source.provider,
                    reliability_tier=source.reliability_tier,
                    status=SourceStatusValue.UNAVAILABLE,
                    last_error=exc.message,
                    last_failure_at=source.last_failure_at,
                )
            )
            raise NoRecentDataError() from exc

    async def latest_stations(self) -> tuple[Station, ...]:
        measurements = await self.latest_measurements()
        return tuple(
            Station(
                id=f"{measurement.source_id}:{measurement.station_external_id}",
                source_id=measurement.source_id,
                external_id=measurement.station_external_id,
                name=measurement.station_name,
                lat=measurement.lat,
                lon=measurement.lon,
            )
            for measurement in measurements
        )
