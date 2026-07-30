from dataclasses import dataclass
from enum import StrEnum


class ErrorCode(StrEnum):
    ZONE_NOT_FOUND = "ZONE_NOT_FOUND"
    SOURCE_UNAVAILABLE = "SOURCE_UNAVAILABLE"
    INVALID_SOURCE_PAYLOAD = "INVALID_SOURCE_PAYLOAD"
    NO_RECENT_DATA = "NO_RECENT_DATA"
    CONFIGURATION_ERROR = "CONFIGURATION_ERROR"
    GEOMETRY_NOT_FOUND = "GEOMETRY_NOT_FOUND"
    INVALID_GEOMETRY = "INVALID_GEOMETRY"
    INVALID_COORDINATES = "INVALID_COORDINATES"
    INVALID_RADIUS = "INVALID_RADIUS"
    SPATIAL_BACKEND_UNAVAILABLE = "SPATIAL_BACKEND_UNAVAILABLE"


@dataclass(frozen=True)
class AppError(Exception):
    code: ErrorCode
    message: str
    details: dict[str, object] | None = None


class ZoneNotFoundError(AppError):
    def __init__(self, zone_id: str) -> None:
        super().__init__(
            code=ErrorCode.ZONE_NOT_FOUND,
            message="Zone was not found",
            details={"zone_id": zone_id},
        )


class SourceUnavailableError(AppError):
    def __init__(
        self,
        message: str = "Source is unavailable",
        details: dict[str, object] | None = None,
    ) -> None:
        super().__init__(code=ErrorCode.SOURCE_UNAVAILABLE, message=message, details=details)


class InvalidSourcePayloadError(AppError):
    def __init__(self, message: str = "External source payload is invalid") -> None:
        super().__init__(code=ErrorCode.INVALID_SOURCE_PAYLOAD, message=message)


class NoRecentDataError(AppError):
    def __init__(self) -> None:
        super().__init__(code=ErrorCode.NO_RECENT_DATA, message="No recent data is available")


class ConfigurationError(AppError):
    def __init__(self, message: str) -> None:
        super().__init__(code=ErrorCode.CONFIGURATION_ERROR, message=message)


class GeometryNotFoundError(AppError):
    def __init__(self, owner_type: str, owner_id: str) -> None:
        super().__init__(
            code=ErrorCode.GEOMETRY_NOT_FOUND,
            message="Geometry was not found",
            details={"owner_type": owner_type, "owner_id": owner_id},
        )


class InvalidGeometryError(AppError):
    def __init__(self, message: str = "Geometry is invalid") -> None:
        super().__init__(code=ErrorCode.INVALID_GEOMETRY, message=message)


class InvalidCoordinatesError(AppError):
    def __init__(self) -> None:
        super().__init__(code=ErrorCode.INVALID_COORDINATES, message="Coordinates are out of range")


class InvalidRadiusError(AppError):
    def __init__(self) -> None:
        super().__init__(code=ErrorCode.INVALID_RADIUS, message="Radius must be greater than zero")


class SpatialBackendUnavailableError(AppError):
    def __init__(self, message: str = "Spatial backend is unavailable") -> None:
        super().__init__(code=ErrorCode.SPATIAL_BACKEND_UNAVAILABLE, message=message)
