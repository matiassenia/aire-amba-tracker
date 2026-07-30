from datetime import UTC, datetime
from math import cos, radians, sqrt

from app.domain.models import (
    MeasurementMethod,
    NormalizedMeasurement,
    SnapshotAggregationPeriod,
    Source,
    Station,
    Zone,
    ZoneSnapshot,
)


def distance_km(a_lat: float, a_lon: float, b_lat: float, b_lon: float) -> float:
    d_lat = (a_lat - b_lat) * 111
    d_lon = (a_lon - b_lon) * 111 * cos(radians(a_lat))
    return sqrt(d_lat * d_lat + d_lon * d_lon)


class SnapshotService:
    def calculate(
        self,
        zone: Zone,
        measurements: tuple[NormalizedMeasurement, ...],
        sources: tuple[Source, ...],
    ) -> ZoneSnapshot:
        sorted_measurements = sorted(
            measurements,
            key=lambda item: distance_km(zone.centroid_lat, zone.centroid_lon, item.lat, item.lon),
        )
        nearest = sorted_measurements[:3]
        aqi = round(sum(item.normalized_value for item in nearest) / len(nearest)) if nearest else 0
        average_confidence = (
            sum(item.confidence for item in nearest) / len(nearest) if nearest else 0.0
        )
        confidence = min(average_confidence, 1.0)
        latest = max((item.measured_at for item in nearest), default=datetime.now(UTC))
        freshness = round((datetime.now(UTC) - latest).total_seconds() / 60)
        flags = tuple(sorted({flag for item in nearest for flag in item.quality_flags}))

        stations = tuple(
            Station(
                id=f"{item.source_id}:{item.station_external_id}",
                source_id=item.source_id,
                external_id=item.station_external_id,
                name=item.station_name,
                lat=item.lat,
                lon=item.lon,
            )
            for item in nearest
        )

        calculated_at = datetime.now(UTC)
        return ZoneSnapshot(
            zone_id=zone.id,
            zone_name=zone.name,
            centroid_lat=zone.centroid_lat,
            centroid_lon=zone.centroid_lon,
            calculated_at=calculated_at,
            valid_from=latest,
            valid_to=calculated_at,
            aggregation_period=SnapshotAggregationPeriod.INSTANT,
            calculation_version="nearest-station-average-v1",
            aqi=aqi,
            method=MeasurementMethod.NEAREST_STATION_AVERAGE,
            confidence=confidence,
            freshness_minutes=max(freshness, 0),
            dominant_variable_code="aqi",
            primary_source_id=nearest[0].source_id if nearest else "none",
            quality_flags=flags,
            quality_metadata={"method_note": "nearest station average, not interpolation"},
            nearest_stations=stations,
            source_summary=sources,
        )
