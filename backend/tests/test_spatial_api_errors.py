from fastapi.testclient import TestClient

from app.api.dependencies import get_spatial_service
from app.domain.errors import SpatialBackendUnavailableError
from app.main import create_app


class UnavailableSpatialService:
    def get_zones_intersecting(self, polygon: object, zones: object) -> None:
        raise SpatialBackendUnavailableError("PostGIS query failed")


def test_spatial_endpoints_validate_coordinates_and_missing_geometry() -> None:
    client = TestClient(create_app())

    invalid_point = client.get("/zones/contains", params={"lat": -100, "lon": -58})
    missing_zone = client.get("/zones/missing-zone/geometry")
    missing_station = client.get("/stations/missing-station/geometry")

    assert invalid_point.status_code == 400
    assert missing_zone.status_code == 404
    assert missing_station.status_code == 404


def test_spatial_backend_errors_still_return_503() -> None:
    app = create_app()
    app.dependency_overrides[get_spatial_service] = lambda: UnavailableSpatialService()
    try:
        response = TestClient(app).get(
            "/zones/intersects",
            params={"polygon": "-34.595,-58.385;-34.595,-58.355;-34.625,-58.355"},
        )
    finally:
        app.dependency_overrides.clear()

    assert response.status_code == 503
    assert response.json()["error"]["code"] == "SPATIAL_BACKEND_UNAVAILABLE"
