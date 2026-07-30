from typing import cast
from uuid import uuid4

from fastapi import Request
from fastapi.responses import JSONResponse

from app.domain.errors import AppError, ErrorCode

ERROR_STATUS = {
    ErrorCode.ZONE_NOT_FOUND: 404,
    ErrorCode.SOURCE_UNAVAILABLE: 503,
    ErrorCode.INVALID_SOURCE_PAYLOAD: 502,
    ErrorCode.NO_RECENT_DATA: 503,
    ErrorCode.CONFIGURATION_ERROR: 500,
    ErrorCode.GEOMETRY_NOT_FOUND: 404,
    ErrorCode.INVALID_GEOMETRY: 400,
    ErrorCode.INVALID_COORDINATES: 400,
    ErrorCode.INVALID_RADIUS: 400,
    ErrorCode.SPATIAL_BACKEND_UNAVAILABLE: 503,
}


async def app_error_handler(request: Request, exc: Exception) -> JSONResponse:
    app_error = cast(AppError, exc)
    request_id = getattr(request.state, "request_id", str(uuid4()))
    return JSONResponse(
        status_code=ERROR_STATUS.get(app_error.code, 500),
        content={
            "error": {
                "code": app_error.code.value,
                "message": app_error.message,
                "details": app_error.details or {},
                "request_id": request_id,
            }
        },
        headers={"X-Request-ID": request_id},
    )
