from fastapi.testclient import TestClient

from app.main import create_app


def test_health_endpoint() -> None:
    client = TestClient(create_app())

    response = client.get("/health")

    assert response.status_code == 200
    assert response.json()["status"] == "ok"


def test_zones_endpoint_lists_seed_zones() -> None:
    client = TestClient(create_app())

    response = client.get("/zones")

    assert response.status_code == 200
    assert len(response.json()) >= 1


def test_unknown_zone_returns_typed_error() -> None:
    client = TestClient(create_app())

    response = client.get("/zones/unknown")

    assert response.status_code == 404
    assert response.json()["error"]["code"] == "ZONE_NOT_FOUND"


def test_variables_endpoint_lists_environmental_variables() -> None:
    client = TestClient(create_app())

    response = client.get("/variables")

    assert response.status_code == 200
    assert {variable["code"] for variable in response.json()} >= {"aqi", "pm25", "noise"}


def test_stations_endpoint_lists_repository_stations() -> None:
    client = TestClient(create_app())

    response = client.get("/stations")

    assert response.status_code == 200
    stations = response.json()
    assert len(stations) >= 1
    assert {"uid", "name", "lat", "lon", "aqi", "dominant_variable", "time"} <= set(
        stations[0]
    )


def test_history_endpoints_are_available_without_seeded_history() -> None:
    client = TestClient(create_app())
    start = "2026-07-29T00:00:00Z"
    end = "2026-07-30T00:00:00Z"

    assert client.get("/history", params={"start": start, "end": end}).json() == []
    assert client.get("/measurements", params={"limit": 10}).json() == []
    assert client.get(f"/stations/demo/history?start={start}&end={end}").json() == []
    assert client.get(f"/zones/caba-comuna-1/history?start={start}&end={end}").json() == []


def test_spatial_endpoints_are_available() -> None:
    client = TestClient(create_app())

    near = client.get("/stations/near", params={"lat": -34.58, "lon": -58.42, "limit": 1})
    contains = client.get("/zones/contains", params={"lat": -34.6083, "lon": -58.3712})
    intersects = client.get(
        "/zones/intersects",
        params={"polygon": "-34.595,-58.385;-34.595,-58.355;-34.625,-58.355"},
    )
    zone_geometry = client.get("/zones/caba-comuna-1/geometry")
    station_geometry = client.get("/stations/spatial-station-palermo/geometry")

    assert near.status_code == 200
    assert near.json()[0]["distance_km"] >= 0
    assert contains.status_code == 200
    assert contains.json()["zones"]
    assert intersects.status_code == 200
    assert zone_geometry.json()["srid"] == 4326
    assert station_geometry.json()["geometry"]["type"] == "Point"
