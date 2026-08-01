from datetime import UTC, datetime, timedelta

from app.domain.models import Station
from app.domain.station_coverage import (
    CONFIDENCE_HIGH_MAX_KM,
    CONFIDENCE_LOW_MAX_KM,
    CONFIDENCE_MEDIUM_MAX_KM,
    coverage_confidence,
    deduplicate_stations,
    haversine_km,
    nearest_station_to,
    stations_within_radius,
)


def make_station(
    external_id: str,
    lat: float,
    lon: float,
    *,
    source_id: str = "waqi",
    name: str | None = None,
    data_available: bool = True,
    measured_at: datetime | None = None,
) -> Station:
    return Station(
        id=f"{source_id}:{external_id}",
        source_id=source_id,
        external_id=external_id,
        name=name or f"Station {external_id}",
        lat=lat,
        lon=lon,
        data_available=data_available,
        measured_at=measured_at,
    )


def test_haversine_distance_is_zero_for_same_point() -> None:
    assert haversine_km(-34.6, -58.4, -34.6, -58.4) == 0


def test_haversine_matches_known_buenos_aires_cordoba_distance() -> None:
    distance = haversine_km(-34.6037, -58.3816, -31.4201, -64.1888)
    assert 630 < distance < 660


def test_haversine_is_symmetric() -> None:
    a_to_b = haversine_km(-34.6, -58.4, -34.7, -58.5)
    b_to_a = haversine_km(-34.7, -58.5, -34.6, -58.4)
    assert a_to_b == b_to_a


def test_san_miguel_has_no_close_station_in_amba() -> None:
    stations = (
        make_station("1", -34.6345, -58.3631, name="La Boca"),
        make_station("2", -34.5996, -58.3905, name="Recoleta"),
    )
    san_miguel = (-34.537, -58.715)

    result = nearest_station_to(*san_miguel, stations)
    assert result is not None
    nearest, distance = result

    assert nearest.external_id in ("1", "2")
    assert 15 < distance < 50


def test_nearest_station_prefers_closest_point() -> None:
    stations = (
        make_station("far", -34.9, -58.8),
        make_station("near", -34.62, -58.42),
        make_station("mid", -34.7, -58.5),
    )

    result = nearest_station_to(-34.6, -58.4, stations)
    assert result is not None
    nearest, _ = result

    assert nearest.external_id == "near"


def test_stations_within_radius_filters_by_distance() -> None:
    stations = (
        make_station("near", -34.605, -58.405),
        make_station("mid", -34.66, -58.46),
        make_station("far", -35.0, -58.6),
    )

    inside = stations_within_radius(-34.6, -58.4, stations, 10.0)

    assert {station.external_id for station in inside} == {"near", "mid"}


def test_deduplication_removes_exact_source_duplicates() -> None:
    stations = (
        make_station("123", -34.6, -58.4),
        make_station("123", -34.6, -58.4),
    )

    result = deduplicate_stations(stations)

    assert len(result.kept) == 1
    assert result.duplicates_removed == 1


def test_deduplication_merges_cross_source_stations_nearby_with_same_name() -> None:
    stations = (
        make_station("1", -34.6, -58.4, source_id="waqi", name="Buenos Aires"),
        make_station("2", -34.6001, -58.4002, source_id="openaq", name="buenos aires"),
    )

    result = deduplicate_stations(stations)

    assert len(result.kept) == 1
    assert result.duplicates_removed == 1


def test_deduplication_keeps_nearby_stations_with_different_names() -> None:
    stations = (
        make_station("1", -34.6, -58.4, source_id="waqi", name="La Boca"),
        make_station("2", -34.6001, -58.4002, source_id="openaq", name="Caminito"),
    )

    result = deduplicate_stations(stations)

    assert len(result.kept) == 2
    assert result.duplicates_removed == 0


def test_deduplication_keeps_stations_far_apart_even_with_same_name() -> None:
    stations = (
        make_station("1", -34.6, -58.4, source_id="waqi", name="Buenos Aires"),
        make_station("2", -31.4, -64.2, source_id="openaq", name="Buenos Aires"),
    )

    result = deduplicate_stations(stations)

    assert len(result.kept) == 2


def test_deduplication_keeps_entry_with_data_on_conflict() -> None:
    stations = (
        make_station(
            "1",
            -34.6,
            -58.4,
            source_id="waqi",
            name="Estación Central",
            data_available=False,
        ),
        make_station(
            "2",
            -34.6,
            -58.4,
            source_id="openaq",
            name="estacion central",
            data_available=True,
        ),
    )

    result = deduplicate_stations(stations)

    assert len(result.kept) == 1
    assert result.kept[0].source_id == "openaq"


def test_deduplication_merges_real_waqi_and_openaq_la_boca() -> None:
    stations = (
        make_station(
            "8398",
            -34.6345,
            -58.3631,
            source_id="waqi",
            name="La boca, Buenos Aires, Argentina",
        ),
        make_station("5240", -34.6253, -58.3656, source_id="openaq", name="LA BOCA"),
    )

    result = deduplicate_stations(stations)

    assert len(result.kept) == 1
    assert result.duplicates_removed == 1


def test_deduplication_merges_real_waqi_and_openaq_cordoba() -> None:
    stations = (
        make_station(
            "8400",
            -34.5996,
            -58.3916,
            source_id="waqi",
            name="Cordoba, Buenos Aires, Argentina",
        ),
        make_station("5241", -34.6044, -58.3916, source_id="openaq", name="CORDOBA"),
    )

    result = deduplicate_stations(stations)

    assert len(result.kept) == 1
    assert result.duplicates_removed == 1


def test_deduplication_keeps_same_named_stations_at_different_locations() -> None:
    stations = (
        make_station("8399", -34.6356, -58.5519, source_id="waqi", name="Centenario"),
        make_station("5242", -34.6064, -58.4319, source_id="openaq", name="CENTENARIO"),
    )

    result = deduplicate_stations(stations)

    assert len(result.kept) == 2
    assert result.duplicates_removed == 0


def test_deduplication_merges_repeated_same_source_entries_with_drifting_ids() -> None:
    stations = (
        make_station("14", -34.56, -58.506, source_id="openaq", name="SPARTAN - CITEDEF"),
        make_station("1285340", -34.5554, -58.5064, source_id="openaq", name="SPARTAN - CITEDEF"),
    )

    result = deduplicate_stations(stations)

    assert len(result.kept) == 1
    assert result.duplicates_removed == 1


def test_coverage_confidence_high_within_5_km_and_fresh() -> None:
    now = datetime.now(UTC)
    assert (
        coverage_confidence(
            3.0, True, now - timedelta(hours=1), now=now
        )
        == "high"
    )


def test_coverage_confidence_medium_between_5_and_20_km() -> None:
    now = datetime.now(UTC)
    assert (
        coverage_confidence(
            10.0, True, now - timedelta(hours=1), now=now
        )
        == "medium"
    )
    assert coverage_confidence(CONFIDENCE_HIGH_MAX_KM, True, now, now=now) == "medium"


def test_coverage_confidence_low_between_20_and_50_km() -> None:
    now = datetime.now(UTC)
    assert (
        coverage_confidence(
            30.0, True, now - timedelta(hours=1), now=now
        )
        == "low"
    )
    assert coverage_confidence(CONFIDENCE_MEDIUM_MAX_KM, True, now, now=now) == "low"


def test_coverage_confidence_none_beyond_50_km() -> None:
    now = datetime.now(UTC)
    assert coverage_confidence(100.0, True, now, now=now) == "none"
    assert coverage_confidence(CONFIDENCE_LOW_MAX_KM, True, now, now=now) == "none"


def test_coverage_confidence_none_when_measurement_is_stale() -> None:
    now = datetime.now(UTC)
    assert (
        coverage_confidence(1.0, True, now - timedelta(hours=25), now=now)
        == "none"
    )


def test_coverage_confidence_none_without_data_or_timestamp() -> None:
    now = datetime.now(UTC)
    assert coverage_confidence(1.0, False, now, now=now) == "none"
    assert coverage_confidence(1.0, True, None, now=now) == "none"


def test_coverage_confidence_accepts_naive_timestamps() -> None:
    naive = datetime.now() - timedelta(hours=1)
    assert coverage_confidence(3.0, True, naive) == "high"
