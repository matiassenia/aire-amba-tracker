from functools import lru_cache

from pydantic import Field, field_validator
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    app_name: str = "Environmental Intelligence API"
    app_version: str = "0.1.0"
    environment: str = "local"
    log_level: str = "INFO"
    cors_origins: list[str] = Field(default_factory=lambda: ["http://127.0.0.1:8080"])
    database_url: str = "sqlite:///./backend/dev.db"
    spatial_backend: str = "in_memory"
    demo_mode: bool = False
    waqi_token: str | None = None
    waqi_timeout_seconds: float = 5.0
    waqi_bounds: str = "-35.0,-59.0,-34.3,-58.0"

    model_config = SettingsConfigDict(env_file=".env", env_prefix="", extra="ignore")

    @field_validator("environment")
    @classmethod
    def validate_environment(cls, value: str) -> str:
        allowed = {"local", "test", "staging", "production"}
        if value not in allowed:
            raise ValueError(f"environment must be one of {sorted(allowed)}")
        return value

    @field_validator("waqi_timeout_seconds")
    @classmethod
    def validate_timeout(cls, value: float) -> float:
        if value <= 0:
            raise ValueError("waqi timeout must be positive")
        return value

    @field_validator("spatial_backend")
    @classmethod
    def validate_spatial_backend(cls, value: str) -> str:
        allowed = {"in_memory", "postgis"}
        if value not in allowed:
            raise ValueError(f"spatial_backend must be one of {sorted(allowed)}")
        return value

    @field_validator("waqi_bounds")
    @classmethod
    def validate_bounds(cls, value: str) -> str:
        parts = value.split(",")
        if len(parts) != 4:
            raise ValueError("waqi bounds must have four comma-separated coordinates")
        for part in parts:
            float(part)
        return value


@lru_cache
def get_settings() -> Settings:
    return Settings()
