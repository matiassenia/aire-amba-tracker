from fastapi.testclient import TestClient

from app.api.dependencies import _source_status_sources
from app.domain.models import SourceStatusValue
from app.infrastructure.sources.openaq import OPENAQ_SOURCE_ID
from app.main import create_app


def test_source_status_sources_omit_openaq_when_disabled() -> None:
    sources = _source_status_sources(openaq_enabled=False, openaq_api_key=None)

    assert {source.id for source in sources} == {"waqi", "demo"}


def test_source_status_sources_include_openaq_when_enabled() -> None:
    sources = _source_status_sources(openaq_enabled=True, openaq_api_key=None)

    assert {source.id for source in sources} == {"waqi", "demo", OPENAQ_SOURCE_ID}
    openaq = next(source for source in sources if source.id == OPENAQ_SOURCE_ID)
    assert openaq.status == SourceStatusValue.NOT_CONFIGURED


def test_source_status_sources_report_openaq_ok_with_key_when_enabled() -> None:
    sources = _source_status_sources(openaq_enabled=True, openaq_api_key="secret")

    openaq = next(source for source in sources if source.id == OPENAQ_SOURCE_ID)
    assert openaq.status == SourceStatusValue.OK


def test_sources_status_endpoint_excludes_openaq_by_default() -> None:
    response = TestClient(create_app()).get("/sources/status")

    assert response.status_code == 200
    source_ids = [item["id"] for item in response.json()]
    assert OPENAQ_SOURCE_ID not in source_ids
    assert "waqi" in source_ids
