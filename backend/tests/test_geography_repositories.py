from app.domain.models import EnvironmentalVariableCategory
from app.infrastructure.repositories import (
    InMemoryEnvironmentalVariableRepository,
    InMemoryMunicipalityRepository,
    InMemoryProvinceRepository,
    InMemoryZoneRepository,
)


def test_seed_zones_belong_to_province_and_municipality() -> None:
    zones = InMemoryZoneRepository().list_zones()

    assert zones
    assert all(zone.country_id == "ar" for zone in zones)
    assert all(zone.province_id for zone in zones)
    assert all(zone.municipality_id for zone in zones)
    assert all(zone.timezone for zone in zones)


def test_province_and_municipality_repositories_can_filter() -> None:
    provinces = InMemoryProvinceRepository().list_provinces(country_id="ar")
    municipalities = InMemoryMunicipalityRepository().list_municipalities(province_id="ar-s")

    assert {province.name for province in provinces} >= {"Buenos Aires", "Cordoba"}
    assert [municipality.name for municipality in municipalities] == ["Rosario"]


def test_environmental_variable_repository_is_multi_variable_ready() -> None:
    repository = InMemoryEnvironmentalVariableRepository()

    variables = repository.list_variables()

    aqi = repository.get_variable("aqi")

    assert repository.get_variable("PM25") is not None
    assert {variable.code for variable in variables} >= {"aqi", "pm25", "uv", "noise", "fire"}
    assert aqi is not None
    assert aqi.category == EnvironmentalVariableCategory.AIR_QUALITY
