from __future__ import annotations

from contextlib import asynccontextmanager
from typing import AsyncIterator

from fastapi import FastAPI, HTTPException, Request
from fastapi.exceptions import RequestValidationError
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse, JSONResponse

from kuroha import __version__
from kuroha.api import router
from kuroha.config import PROJECT_ROOT, Settings
from kuroha.logging import configure_logging
from kuroha.security import RequestSizeLimitMiddleware, SecurityHeadersMiddleware
from kuroha.storage import SQLiteStore


def create_app(settings: Settings | None = None) -> FastAPI:
    runtime_settings = settings or Settings.from_env()
    configure_logging(runtime_settings.log_level)
    store = SQLiteStore(runtime_settings.database_path)

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

    app.add_middleware(SecurityHeadersMiddleware)
    app.add_middleware(
        RequestSizeLimitMiddleware,
        max_bytes=runtime_settings.max_request_bytes,
    )
    app.add_middleware(
        CORSMiddleware,
        allow_origins=list(runtime_settings.cors_origins),
        allow_credentials=False,
        allow_methods=["GET", "PUT", "OPTIONS"],
        allow_headers=["Content-Type"],
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

    @app.get("/", include_in_schema=False)
    def root() -> FileResponse | JSONResponse:
        if index_file.is_file():
            return FileResponse(index_file)
        return JSONResponse(
            {"name": "Kuroha", "version": __version__, "status": "web build not found"}
        )

    @app.get("/{path:path}", include_in_schema=False)
    def web_fallback(path: str) -> FileResponse:
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
