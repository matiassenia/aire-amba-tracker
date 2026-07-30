from app.domain.models import (
    AdministrativeArea,
    Country,
    EnvironmentalVariable,
    EnvironmentalVariableCategory,
    Municipality,
    Province,
    Station,
    Zone,
    ZoneType,
)

ARGENTINA = Country(
    id="ar",
    iso_code="AR",
    name="Argentina",
    default_timezone="America/Argentina/Buenos_Aires",
)

PROVINCES: tuple[Province, ...] = (
    Province(
        id="ar-b",
        country_id=ARGENTINA.id,
        name="Buenos Aires",
        timezone="America/Argentina/Buenos_Aires",
    ),
    Province(
        id="ar-c",
        country_id=ARGENTINA.id,
        name="Ciudad Autonoma de Buenos Aires",
        timezone="America/Argentina/Buenos_Aires",
    ),
    Province(
        id="ar-x",
        country_id=ARGENTINA.id,
        name="Cordoba",
        timezone="America/Argentina/Cordoba",
    ),
    Province(
        id="ar-s",
        country_id=ARGENTINA.id,
        name="Santa Fe",
        timezone="America/Argentina/Cordoba",
    ),
    Province(
        id="ar-m",
        country_id=ARGENTINA.id,
        name="Mendoza",
        timezone="America/Argentina/Mendoza",
    ),
    Province(
        id="ar-q",
        country_id=ARGENTINA.id,
        name="Neuquen",
        timezone="America/Argentina/Salta",
    ),
)

ADMINISTRATIVE_AREAS: tuple[AdministrativeArea, ...] = (
    AdministrativeArea(
        id="admin-caba",
        country_id=ARGENTINA.id,
        province_id="ar-c",
        name="Ciudad Autonoma de Buenos Aires",
        type="autonomous_city",
    ),
    AdministrativeArea(
        id="admin-ba-gba-sur",
        country_id=ARGENTINA.id,
        province_id="ar-b",
        name="Gran Buenos Aires Sur",
        type="planning_region",
    ),
    AdministrativeArea(
        id="admin-sf-rosario",
        country_id=ARGENTINA.id,
        province_id="ar-s",
        name="Rosario Region",
        type="planning_region",
    ),
)

MUNICIPALITIES: tuple[Municipality, ...] = (
    Municipality(
        id="mun-caba",
        country_id=ARGENTINA.id,
        province_id="ar-c",
        name="Ciudad Autonoma de Buenos Aires",
        timezone="America/Argentina/Buenos_Aires",
        administrative_area_id="admin-caba",
    ),
    Municipality(
        id="mun-avellaneda",
        country_id=ARGENTINA.id,
        province_id="ar-b",
        name="Avellaneda",
        timezone="America/Argentina/Buenos_Aires",
        administrative_area_id="admin-ba-gba-sur",
    ),
    Municipality(
        id="mun-la-matanza",
        country_id=ARGENTINA.id,
        province_id="ar-b",
        name="La Matanza",
        timezone="America/Argentina/Buenos_Aires",
    ),
    Municipality(
        id="mun-cordoba",
        country_id=ARGENTINA.id,
        province_id="ar-x",
        name="Cordoba",
        timezone="America/Argentina/Cordoba",
    ),
    Municipality(
        id="mun-rosario",
        country_id=ARGENTINA.id,
        province_id="ar-s",
        name="Rosario",
        timezone="America/Argentina/Cordoba",
        administrative_area_id="admin-sf-rosario",
    ),
)

# Provisional seed data. Geometries are simplified placeholders for architecture
# validation only. They are not official administrative boundaries.
ZONES: tuple[Zone, ...] = (
    Zone(
        id="caba-comuna-1",
        name="Comuna 1",
        country_id=ARGENTINA.id,
        province_id="ar-c",
        municipality_id="mun-caba",
        type=ZoneType.COMMUNE,
        centroid_lat=-34.6083,
        centroid_lon=-58.3712,
        polygon=((-34.595, -58.385), (-34.595, -58.355), (-34.625, -58.355), (-34.625, -58.385)),
        timezone="America/Argentina/Buenos_Aires",
        metadata={"boundary_status": "placeholder"},
    ),
    Zone(
        id="caba-comuna-14",
        name="Comuna 14",
        country_id=ARGENTINA.id,
        province_id="ar-c",
        municipality_id="mun-caba",
        type=ZoneType.COMMUNE,
        centroid_lat=-34.575,
        centroid_lon=-58.425,
        polygon=((-34.555, -58.445), (-34.555, -58.405), (-34.595, -58.405), (-34.595, -58.445)),
        timezone="America/Argentina/Buenos_Aires",
        metadata={"boundary_status": "placeholder"},
    ),
    Zone(
        id="avellaneda-central",
        name="Avellaneda Central",
        country_id=ARGENTINA.id,
        province_id="ar-b",
        municipality_id="mun-avellaneda",
        type=ZoneType.ENVIRONMENTAL_AREA,
        centroid_lat=-34.6621,
        centroid_lon=-58.3656,
        polygon=((-34.64, -58.39), (-34.64, -58.34), (-34.685, -58.34), (-34.685, -58.39)),
        timezone="America/Argentina/Buenos_Aires",
        metadata={"boundary_status": "placeholder"},
    ),
    Zone(
        id="la-matanza-san-justo",
        name="La Matanza - San Justo",
        country_id=ARGENTINA.id,
        province_id="ar-b",
        municipality_id="mun-la-matanza",
        type=ZoneType.ENVIRONMENTAL_AREA,
        centroid_lat=-34.6854,
        centroid_lon=-58.5591,
        polygon=((-34.65, -58.62), (-34.65, -58.5), (-34.72, -58.5), (-34.72, -58.62)),
        timezone="America/Argentina/Buenos_Aires",
        metadata={"boundary_status": "placeholder"},
    ),
    Zone(
        id="cordoba-centro",
        name="Cordoba Centro",
        country_id=ARGENTINA.id,
        province_id="ar-x",
        municipality_id="mun-cordoba",
        type=ZoneType.ENVIRONMENTAL_AREA,
        centroid_lat=-31.4167,
        centroid_lon=-64.1833,
        polygon=((-31.39, -64.21), (-31.39, -64.16), (-31.44, -64.16), (-31.44, -64.21)),
        timezone="America/Argentina/Cordoba",
        metadata={"boundary_status": "placeholder"},
    ),
    Zone(
        id="rosario-centro",
        name="Rosario Centro",
        country_id=ARGENTINA.id,
        province_id="ar-s",
        municipality_id="mun-rosario",
        type=ZoneType.ENVIRONMENTAL_AREA,
        centroid_lat=-32.9442,
        centroid_lon=-60.6505,
        polygon=((-32.92, -60.68), (-32.92, -60.62), (-32.97, -60.62), (-32.97, -60.68)),
        timezone="America/Argentina/Cordoba",
        metadata={"boundary_status": "placeholder"},
    ),
)

def _variable(
    code: str,
    name: str,
    category: EnvironmentalVariableCategory,
    unit: str,
) -> EnvironmentalVariable:
    return EnvironmentalVariable(code, code, name, category, unit)


ENVIRONMENTAL_VARIABLES: tuple[EnvironmentalVariable, ...] = (
    _variable("aqi", "Air Quality Index", EnvironmentalVariableCategory.AIR_QUALITY, "AQI"),
    _variable(
        "pm25",
        "Fine particulate matter",
        EnvironmentalVariableCategory.AIR_QUALITY,
        "ug/m3",
    ),
    _variable(
        "pm10",
        "Coarse particulate matter",
        EnvironmentalVariableCategory.AIR_QUALITY,
        "ug/m3",
    ),
    _variable("no2", "Nitrogen dioxide", EnvironmentalVariableCategory.AIR_QUALITY, "ppb"),
    _variable("so2", "Sulfur dioxide", EnvironmentalVariableCategory.AIR_QUALITY, "ppb"),
    _variable("co", "Carbon monoxide", EnvironmentalVariableCategory.AIR_QUALITY, "ppm"),
    _variable("o3", "Ozone", EnvironmentalVariableCategory.AIR_QUALITY, "ppb"),
    _variable("uv", "Ultraviolet index", EnvironmentalVariableCategory.WEATHER, "index"),
    _variable("temperature", "Temperature", EnvironmentalVariableCategory.WEATHER, "celsius"),
    _variable("humidity", "Humidity", EnvironmentalVariableCategory.WEATHER, "percent"),
    _variable("wind", "Wind", EnvironmentalVariableCategory.WEATHER, "m/s"),
    _variable("pressure", "Pressure", EnvironmentalVariableCategory.WEATHER, "hPa"),
    _variable("noise", "Environmental noise", EnvironmentalVariableCategory.NOISE, "dB"),
    _variable(
        "water_quality",
        "Water quality",
        EnvironmentalVariableCategory.WATER_QUALITY,
        "index",
    ),
    _variable("fire", "Fire signal", EnvironmentalVariableCategory.FIRE, "index"),
    _variable("smoke", "Smoke signal", EnvironmentalVariableCategory.SMOKE, "index"),
)

SPATIAL_STATIONS: tuple[Station, ...] = (
    Station(
        id="spatial-station-palermo",
        source_id="seed",
        external_id="1001",
        name="Spatial seed Palermo",
        lat=-34.5803,
        lon=-58.4207,
        country_id=ARGENTINA.id,
        province_id="ar-c",
        municipality_id="mun-caba",
        timezone="America/Argentina/Buenos_Aires",
        metadata={"seed_scope": "spatial_validation"},
    ),
    Station(
        id="spatial-station-avellaneda",
        source_id="seed",
        external_id="2001",
        name="Spatial seed Avellaneda",
        lat=-34.6621,
        lon=-58.3656,
        country_id=ARGENTINA.id,
        province_id="ar-b",
        municipality_id="mun-avellaneda",
        timezone="America/Argentina/Buenos_Aires",
        metadata={"seed_scope": "spatial_validation"},
    ),
)
