from datetime import UTC, datetime

from app.domain.argentina_boundary import (
    ARGENTINA_BOUNDARY,
    filter_argentina_stations,
    is_within_argentina,
)
from app.domain.models import Station

# Real stations observed in the 2026-08 audit: the Chilean ones must never
# appear in the Argentina view, and the Argentine ones must always be kept.
CHILEAN_REAL = [
    ("Colegio Pedro Vergara Keller", -22.4428, -68.9325),
    ("Club Deportivo 23 De Marzo", -22.4603, -68.9377),
    ("Nueva ChiuChiu", -22.3430, -68.6487),
    ("Puren", -36.6162, -72.0930),
    ("San Carlos", -36.4611, -71.9714),
    ("Laja", -37.2678, -72.7107),
    ("21 de mayo 2", -37.4712, -72.3615),
    ("Nielol", -38.7270, -72.5800),
    ("Club De Empleados", -37.5018, -72.6764),
    ("Los Angeles Oriente", -37.4630, -72.3246),
    ("Lautaro", -37.5089, -72.6561),
    ("Las Encinas Temuco", -38.7487, -72.6208),
    ("Vialidad", -45.4068, -72.6963),
    ("Punta Arenas", -53.1583, -70.9215),
    ("Cochrane", -47.2548, -72.5714),
    ("Coyhaique", -45.5800, -72.0611),
    ("Villarrica", -39.2905, -72.2221),
]

ARGENTINE_REAL = [
    ("La Boca", -34.6345, -58.3631),
    ("Centenario", -34.6356, -58.5519),
    ("Cordoba", -34.5996, -58.3916),
    ("Rosario", -33.2340, -60.3340),
    ("Bahia Blanca 2", -38.7822, -62.2662),
    ("Bahia Blanca 3", -38.6716, -62.3588),
    ("Villa Las Camelias", -36.6313, -64.3192),
    ("O'Higgins", -36.6240, -64.2820),
    ("J. B. Calo", -36.6479, -64.2768),
    ("Campus UNCo", -38.9400, -68.0580),
    ("General Galarza", -38.9480, -68.1080),
    ("SPARTAN CITEDEF", -34.5600, -58.5060),
    ("EMC Dock Sud", -34.6674, -58.3292),
    ("EMC La Matanza", -34.8832, -58.6825),
]


def make_station(external_id: str, lat: float, lon: float) -> Station:
    return Station(
        id=f"waqi:{external_id}",
        source_id="waqi",
        external_id=external_id,
        name=f"Station {external_id}",
        lat=lat,
        lon=lon,
        measured_at=datetime.now(UTC),
    )


def test_boundary_ring_is_non_empty_and_closed() -> None:
    assert len(ARGENTINA_BOUNDARY) >= 50
    first = ARGENTINA_BOUNDARY[0]
    last = ARGENTINA_BOUNDARY[-1]
    assert first == last


def test_real_chilean_stations_are_outside() -> None:
    for name, lat, lon in CHILEAN_REAL:
        assert not is_within_argentina(lat, lon), f"{name} should be excluded"


def test_real_argentine_stations_are_inside() -> None:
    for name, lat, lon in ARGENTINE_REAL:
        assert is_within_argentina(lat, lon), f"{name} should be kept"


def test_city_anchors_classify_correctly() -> None:
    inside = [
        ("CABA", -34.6037, -58.3816),
        ("San Miguel", -34.5370, -58.7150),
        ("La Plata", -34.9210, -57.9540),
        ("Cordoba city", -31.4201, -64.1888),
        ("Mendoza", -32.8908, -68.8272),
        ("San Juan", -31.5375, -68.5364),
        ("Bariloche", -41.1335, -71.3103),
        ("Ushuaia", -54.8019, -68.3030),
        ("Rio Grande", -53.7876, -67.6992),
        ("Iguazu", -25.6953, -54.4367),
        ("Neuquen", -38.9516, -68.0591),
    ]
    outside = [
        ("Santiago de Chile", -33.4489, -70.6693),
        ("Temuco ciudad", -38.7359, -72.5904),
        ("Valparaiso", -33.0472, -71.6127),
        ("Antofagasta", -23.6509, -70.3975),
        ("Montevideo", -34.9011, -56.1645),
    ]
    for name, lat, lon in inside:
        assert is_within_argentina(lat, lon), f"{name} should be inside"
    for name, lat, lon in outside:
        assert not is_within_argentina(lat, lon), f"{name} should be outside"


def test_filter_argentina_stations_returns_counts() -> None:
    stations = (
        make_station("1", -34.6345, -58.3631),
        make_station("2", -38.7487, -72.6208),
        make_station("3", -45.5800, -72.0611),
        make_station("4", -38.9400, -68.0580),
    )

    kept, foreign = filter_argentina_stations(stations)

    assert {station.external_id for station in kept} == {"1", "4"}
    assert {station.external_id for station in foreign} == {"2", "3"}
