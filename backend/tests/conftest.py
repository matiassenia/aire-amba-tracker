import os
from collections.abc import Generator

import pytest

os.environ["DATABASE_URL"] = "sqlite:///./backend/dev.db"
os.environ["SPATIAL_BACKEND"] = "in_memory"
os.environ["STATION_DATA_SOURCE"] = "in_memory"


@pytest.fixture(autouse=True)
def isolate_api_settings(
    monkeypatch: pytest.MonkeyPatch,
    request: pytest.FixtureRequest,
) -> Generator[None]:
    from app.core.config import get_settings

    if request.node.get_closest_marker("postgis"):
        monkeypatch.setenv("SPATIAL_BACKEND", "postgis")
    else:
        monkeypatch.setenv("SPATIAL_BACKEND", "in_memory")
        monkeypatch.setenv("STATION_DATA_SOURCE", "in_memory")
    get_settings.cache_clear()
    yield
    get_settings.cache_clear()
