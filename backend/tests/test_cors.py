import pytest
from fastapi.testclient import TestClient

from app.core.config import get_settings
from app.main import create_app

VERCEL_ORIGIN = "https://aire-ba.vercel.app"
ALLOWED_ORIGINS = {
    "http://localhost:5173",
    "http://127.0.0.1:5173",
    VERCEL_ORIGIN,
}


@pytest.fixture(autouse=True)
def hermetic_cors_origins(monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.setenv("CORS_ORIGINS", ",".join(ALLOWED_ORIGINS))
    get_settings.cache_clear()


def _client_with_cors(monkeypatch: pytest.MonkeyPatch, raw: str) -> TestClient:
    monkeypatch.setenv("CORS_ORIGINS", raw)
    get_settings.cache_clear()
    return TestClient(create_app())


def test_local_and_vercel_origins_are_allowed() -> None:
    client = TestClient(create_app())

    for origin in ALLOWED_ORIGINS:
        response = client.get("/health", headers={"Origin": origin})

        assert response.status_code == 200
        assert response.headers["access-control-allow-origin"] == origin


def test_cors_preflight_from_vercel_is_allowed() -> None:
    client = TestClient(create_app())

    response = client.options(
        "/health",
        headers={
            "Origin": VERCEL_ORIGIN,
            "Access-Control-Request-Method": "GET",
        },
    )

    assert response.status_code == 200
    assert response.headers["access-control-allow-origin"] == VERCEL_ORIGIN
    assert "GET" in response.headers["access-control-allow-methods"]


def test_cors_get_from_vercel_is_allowed() -> None:
    client = TestClient(create_app())

    response = client.get("/health", headers={"Origin": VERCEL_ORIGIN})

    assert response.status_code == 200
    assert response.headers["access-control-allow-origin"] == VERCEL_ORIGIN


def test_cors_unauthorized_origin_gets_no_allow_origin_header() -> None:
    client = TestClient(create_app())

    response = client.get("/health", headers={"Origin": "https://evil.example.com"})

    assert response.status_code == 200
    assert "access-control-allow-origin" not in response.headers


def test_cors_origins_env_accepts_comma_separated_value(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    client = _client_with_cors(
        monkeypatch,
        "https://api-a.example.com, https://api-b.example.com",
    )

    allowed = client.get("/health", headers={"Origin": "https://api-b.example.com"})
    blocked = client.get("/health", headers={"Origin": VERCEL_ORIGIN})

    assert allowed.headers["access-control-allow-origin"] == "https://api-b.example.com"
    assert "access-control-allow-origin" not in blocked.headers


def test_cors_origins_env_accepts_json_list_value(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    client = _client_with_cors(
        monkeypatch,
        '["https://api-a.example.com", "https://api-b.example.com"]',
    )

    response = client.get("/health", headers={"Origin": "https://api-a.example.com"})

    assert response.headers["access-control-allow-origin"] == "https://api-a.example.com"
