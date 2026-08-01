import unicodedata
from dataclasses import dataclass
from datetime import UTC, datetime
from math import asin, cos, radians, sin, sqrt

from app.domain.models import Station

EARTH_RADIUS_KM = 6371.0

# Deduplication policy between sources (WAQI + OpenAQ):
# - Same (source_id, external_id): exact duplicate, keep the first.
# - Geo proximity below DEDUP_MAX_DISTANCE_KM AND normalized-name equality:
#   duplicate regardless of source, keep the entry with data (fallback: first).
# The 2 km threshold reflects real cross-source coordinate drift observed in
# the audit (e.g., WAQI "La Boca" vs OpenAQ "LA BOCA" differ by ~1 km); the
# name equality requirement still keeps genuinely distinct nearby stations.
DEDUP_MAX_DISTANCE_KM = 2.0

# Coverage confidence policy (distance from the requested point to the
# nearest station with data for the requested pollutant).
CONFIDENCE_HIGH_MAX_KM = 5.0
CONFIDENCE_MEDIUM_MAX_KM = 20.0
CONFIDENCE_LOW_MAX_KM = 50.0

# Frescura. Politica unica compartida con src/lib/stationFreshness.ts:
# - hasta RECENT_AFTER_SECONDS (6 h): dato reciente, plena confianza.
# - entre 6 h y STALE_AFTER_SECONDS (24 h): util pero envejeciendo.
# - mayor a STALE_AFTER_SECONDS: stale, no cuenta para cobertura.
# - sin timestamp: unknown, no cuenta para cobertura.
RECENT_AFTER_SECONDS = 6 * 3600
STALE_AFTER_SECONDS = 24 * 3600


def haversine_km(
    a_lat: float, a_lon: float, b_lat: float, b_lon: float
) -> float:
    """Great-circle distance in kilometers between two WGS84 points."""
    lat1, lon1, lat2, lon2 = map(radians, (a_lat, a_lon, b_lat, b_lon))
    d_lat = lat2 - lat1
    d_lon = lon2 - lon1
    h = sin(d_lat / 2) ** 2 + cos(lat1) * cos(lat2) * sin(d_lon / 2) ** 2
    return 2 * EARTH_RADIUS_KM * asin(sqrt(min(1.0, h)))


def _normalize_name(name: str) -> str:
    folded = unicodedata.normalize("NFKD", name)
    without_accents = "".join(ch for ch in folded if not unicodedata.combining(ch))
    return " ".join(without_accents.strip().lower().split())


def _primary_name(name: str) -> str:
    """Leading part of the name before the first comma.

    WAQI names carry a locality/country suffix ("La boca, Buenos Aires,
    Argentina") while OpenAQ uses the bare name ("LA BOCA"); comparing the
    primary part treats them as the same monitor. The geo threshold keeps
    same-name stations at different locations separate.
    """
    return _normalize_name(name.split(",", 1)[0])


def _name_matches(a: str, b: str) -> bool:
    if _normalize_name(a) == _normalize_name(b):
        return True
    primary_a = _primary_name(a)
    primary_b = _primary_name(b)
    if primary_a and primary_b:
        return primary_a == primary_b
    return False


@dataclass(frozen=True)
class DeduplicationDecision:
    kept: tuple[Station, ...]
    duplicates_removed: int


def deduplicate_stations(stations: tuple[Station, ...]) -> DeduplicationDecision:
    """Merge stations that represent the same physical monitor.

    A station is a duplicate of a kept one when they share the exact
    (source_id, external_id) or when they are less than
    DEDUP_MAX_DISTANCE_KM apart AND have the same normalized name (this also
    catches repeated entries from the same source with drifting ids). Between
    duplicates the entry that has data wins.
    """
    kept: list[Station] = []
    for station in stations:
        match = _find_duplicate(station, tuple(kept))
        if match is None:
            kept.append(station)
            continue
        if station.data_available and not match.data_available:
            kept[kept.index(match)] = station
    return DeduplicationDecision(kept=tuple(kept), duplicates_removed=len(stations) - len(kept))


def _find_duplicate(station: Station, candidates: tuple[Station, ...]) -> Station | None:
    for candidate in candidates:
        if (
            candidate.source_id == station.source_id
            and candidate.external_id == station.external_id
        ):
            return candidate
        if (
            haversine_km(candidate.lat, candidate.lon, station.lat, station.lon)
            < DEDUP_MAX_DISTANCE_KM
            and _name_matches(candidate.name, station.name)
        ):
            return candidate
    return None


@dataclass(frozen=True)
class CoverageResult:
    distance_km: float
    confidence: str
    has_data: bool
    fresh: bool


def coverage_confidence(
    distance_km: float,
    has_data: bool,
    measured_at: datetime | None,
    now: datetime | None = None,
) -> str:
    """Confidence level for a station at the given distance from a point.

    Agreed policy:
    - high: within 5 km, with data, and fresh.
    - medium: 5-20 km.
    - low: 20-50 km.
    - none: beyond 50 km, or the measurement is stale or has no data.
    """
    if not has_data or measured_at is None:
        return "none"
    if measured_at.tzinfo is None:
        measured_at = measured_at.replace(tzinfo=UTC)
    current = now or datetime.now(UTC)
    if (current - measured_at).total_seconds() > STALE_AFTER_SECONDS:
        return "none"

    if distance_km < CONFIDENCE_HIGH_MAX_KM:
        return "high"
    if distance_km < CONFIDENCE_MEDIUM_MAX_KM:
        return "medium"
    if distance_km < CONFIDENCE_LOW_MAX_KM:
        return "low"
    return "none"


def nearest_station_to(
    lat: float,
    lon: float,
    stations: tuple[Station, ...],
) -> tuple[Station, float] | None:
    """Nearest station to a point and its distance in kilometers."""
    nearest: tuple[Station, float] | None = None
    for station in stations:
        distance = haversine_km(lat, lon, station.lat, station.lon)
        if nearest is None or distance < nearest[1]:
            nearest = (station, distance)
    return nearest


def stations_within_radius(
    lat: float,
    lon: float,
    stations: tuple[Station, ...],
    radius_km: float,
) -> tuple[Station, ...]:
    return tuple(
        station
        for station in stations
        if haversine_km(lat, lon, station.lat, station.lon) <= radius_km
    )
