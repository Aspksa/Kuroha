from __future__ import annotations

from collections.abc import AsyncIterator
from contextlib import asynccontextmanager

from fastapi import FastAPI, HTTPException, Request
from fastapi.exceptions import RequestValidationError
from fastapi.middleware.cors import CORSMiddleware
from fastapi.middleware.gzip import GZipMiddleware
from starlette.middleware.trustedhost import TrustedHostMiddleware
from fastapi.responses import FileResponse, JSONResponse

from kuroha import __version__
from kuroha.api import router
from kuroha.config import PROJECT_ROOT, Settings
from kuroha.logging import configure_logging
from kuroha.security import (
    LocalRequestProtectionMiddleware,
    RequestSizeLimitMiddleware,
    SecurityHeadersMiddleware,
    StaticCacheMiddleware,
)
from kuroha.storage import SQLiteStore
from kuroha.updater import UpdateService


def create_app(settings: Settings | None = None) -> FastAPI:
    runtime_settings = settings or Settings.from_env()
    configure_logging(runtime_settings.log_level, runtime_settings.data_dir)
    store = SQLiteStore(runtime_settings.database_path)
    updater = UpdateService(runtime_settings.project_root, runtime_settings.data_dir)

    @asynccontextmanager
    async def lifespan(_: FastAPI) -> AsyncIterator[None]:
        store.initialize()
        yield

    app = FastAPI(
        title="Kuroha API",
        version=__version__,
        description="Kuroha platform foundation API.",
        lifespan=lifespan,
    )
    app.state.settings = runtime_settings
    app.state.store = store
    app.state.updater = updater

    app.add_middleware(
        TrustedHostMiddleware,
        allowed_hosts=["127.0.0.1", "localhost", "testserver"],
    )
    app.add_middleware(
        LocalRequestProtectionMiddleware,
        allowed_origins=runtime_settings.cors_origins,
    )
    app.add_middleware(GZipMiddleware, minimum_size=500)
    app.add_middleware(StaticCacheMiddleware)
    app.add_middleware(SecurityHeadersMiddleware)
    app.add_middleware(
        RequestSizeLimitMiddleware,
        max_bytes=runtime_settings.max_request_bytes,
    )
    app.add_middleware(
        CORSMiddleware,
        allow_origins=list(runtime_settings.cors_origins),
        allow_credentials=False,
        allow_methods=["GET", "POST", "PUT", "DELETE", "OPTIONS"],
        allow_headers=["Content-Type", "X-Kuroha"],
    )

    app.include_router(router, prefix="/api/v1")
    app.include_router(router, prefix="/api", include_in_schema=False)

    @app.exception_handler(RequestValidationError)
    async def validation_error(
        _: Request,
        exc: RequestValidationError,
    ) -> JSONResponse:
        return JSONResponse(
            status_code=422,
            content={
                "error": {
                    "code": "validation_error",
                    "message": "Request validation failed.",
                    "details": exc.errors(),
                }
            },
        )

    @app.exception_handler(HTTPException)
    async def http_error(_: Request, exc: HTTPException) -> JSONResponse:
        return JSONResponse(
            status_code=exc.status_code,
            content={
                "error": {
                    "code": "http_error",
                    "message": str(exc.detail),
                }
            },
            headers=exc.headers,
        )

    web_dist = PROJECT_ROOT / "web" / "dist"
    index_file = web_dist / "index.html"

    @app.get("/", include_in_schema=False, response_model=None)
    def root():
        if index_file.is_file():
            return FileResponse(index_file)
        return JSONResponse(
            {"name": "Kuroha", "version": __version__, "status": "web build not found"}
        )

    @app.get("/{path:path}", include_in_schema=False, response_model=None)
    def web_fallback(path: str):
        if path.startswith("api/"):
            raise HTTPException(status_code=404, detail="Not found")

        candidate = (web_dist / path).resolve()
        try:
            candidate.relative_to(web_dist.resolve())
        except ValueError as exc:
            raise HTTPException(status_code=404, detail="Not found") from exc

        if candidate.is_file():
            return FileResponse(candidate)
        if index_file.is_file():
            return FileResponse(index_file)
        raise HTTPException(status_code=404, detail="Web build not found")

    return app


app = create_app()
