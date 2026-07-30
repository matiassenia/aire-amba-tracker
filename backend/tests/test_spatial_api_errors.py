from fastapi.testclient import TestClient

from app.main import create_app


def test_spatial_endpoints_validate_coordinates_and_missing_geometry() -> None:
    client = TestClient(create_app())

    invalid_point = client.get("/zones/contains", params={"lat": -100, "lon": -58})
    missing_zone = client.get("/zones/missing-zone/geometry")
    missing_station = client.get("/stations/missing-station/geometry")

    assert invalid_point.status_code == 400
    assert missing_zone.status_code == 404
    assert missing_station.status_code == 404
