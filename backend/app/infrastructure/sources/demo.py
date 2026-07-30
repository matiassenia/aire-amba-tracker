from datetime import UTC, datetime

from app.application.ports import SourceConnector
from app.domain.models import (
    NormalizedMeasurement,
    RawIngestionRecord,
    RawIngestionStatus,
    Source,
    SourceStatusValue,
)

DEMO_SOURCE = Source(
    id="demo",
    name="Demo data",
    provider="AireBA",
    reliability_tier="demo",
    status=SourceStatusValue.DEGRADED,
)


class DemoConnector(SourceConnector):
    def source(self) -> Source:
        return DEMO_SOURCE

    async def fetch_raw(self) -> RawIngestionRecord:
        return RawIngestionRecord(
            source_id=DEMO_SOURCE.id,
            connector_name="demo",
            fetched_at=datetime.now(UTC),
            status=RawIngestionStatus.SUCCESS,
            payload=[{"demo": True}],
            payload_hash=None,
            metadata={"mode": "explicit_demo"},
        )

    def parse(self, raw: RawIngestionRecord) -> tuple[NormalizedMeasurement, ...]:
        measured_at = raw.fetched_at
        return (
            self._measurement("1001", "Palermo, Buenos Aires", -34.5803, -58.4207, 42, measured_at),
            self._measurement("1004", "La Boca, Buenos Aires", -34.6345, -58.3631, 68, measured_at),
            self._measurement(
                "2001", "Avellaneda, Buenos Aires", -34.6621, -58.3656, 72, measured_at
            ),
            self._measurement(
                "2008", "La Matanza - San Justo", -34.6854, -58.5591, 82, measured_at
            ),
        )

    def _measurement(
        self,
        external_id: str,
        name: str,
        lat: float,
        lon: float,
        value: float,
        measured_at: datetime,
    ) -> NormalizedMeasurement:
        return NormalizedMeasurement(
            source_id=DEMO_SOURCE.id,
            station_external_id=external_id,
            station_name=name,
            lat=lat,
            lon=lon,
            environmental_variable_code="aqi",
            measured_at=measured_at,
            original_value=value,
            original_unit="AQI",
            normalized_value=value,
            normalized_unit="AQI",
            quality_flags=("demo_data",),
            confidence=0.35,
            external_metadata={"source": "demo"},
        )
