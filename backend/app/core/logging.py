import json
import logging
import re
from typing import Any

_SECRET_QUERY_PARAM_PATTERN = re.compile(
    r"([?&](?:token|api_key|apikey|key)=)[^&\s\"]+",
    re.IGNORECASE,
)


def sanitize_log_message(message: str) -> str:
    return _SECRET_QUERY_PARAM_PATTERN.sub(r"\1***", message)


class JsonFormatter(logging.Formatter):
    def format(self, record: logging.LogRecord) -> str:
        payload: dict[str, Any] = {
            "level": record.levelname,
            "logger": record.name,
            "message": sanitize_log_message(record.getMessage()),
        }
        for key in ("request_id", "method", "path", "status_code", "duration_ms", "source_id"):
            value = getattr(record, key, None)
            if value is not None:
                payload[key] = value
        if record.exc_info:
            payload["exception"] = self.formatException(record.exc_info)
        return json.dumps(payload, ensure_ascii=False)


def configure_logging(level: str) -> None:
    handler = logging.StreamHandler()
    handler.setFormatter(JsonFormatter())
    root = logging.getLogger()
    root.handlers.clear()
    root.addHandler(handler)
    root.setLevel(level.upper())
    logging.getLogger("httpx").setLevel(logging.WARNING)
    logging.getLogger("httpcore").setLevel(logging.WARNING)
