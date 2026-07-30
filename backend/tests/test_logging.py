import logging

from app.core.logging import configure_logging, sanitize_log_message


def test_sanitize_log_message_redacts_token_query_param() -> None:
    message = "GET https://api.waqi.info/v2/map/bounds/?latlng=0,0,1,1&token=secret-value"

    assert sanitize_log_message(message) == (
        "GET https://api.waqi.info/v2/map/bounds/?latlng=0,0,1,1&token=***"
    )


def test_sanitize_log_message_redacts_token_at_start_of_query() -> None:
    message = "GET https://example.test/path?token=secret-value&latlng=0,0,1,1"

    assert sanitize_log_message(message) == "GET https://example.test/path?token=***&latlng=0,0,1,1"


def test_configure_logging_suppresses_http_client_info_logs() -> None:
    configure_logging("INFO")

    assert logging.getLogger("httpx").getEffectiveLevel() >= logging.WARNING
    assert logging.getLogger("httpcore").getEffectiveLevel() >= logging.WARNING
