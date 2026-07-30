from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.api.errors import app_error_handler
from app.api.middleware import request_id_middleware
from app.api.router import api_router
from app.core.config import get_settings
from app.core.logging import configure_logging
from app.domain.errors import AppError


def create_app() -> FastAPI:
    settings = get_settings()
    configure_logging(settings.log_level)

    app = FastAPI(title=settings.app_name, version=settings.app_version)
    app.add_middleware(
        CORSMiddleware,
        allow_origins=settings.cors_origins,
        allow_credentials=False,
        allow_methods=["GET"],
        allow_headers=["*"],
    )
    app.middleware("http")(request_id_middleware)
    app.add_exception_handler(AppError, app_error_handler)
    app.include_router(api_router)
    return app


app = create_app()
