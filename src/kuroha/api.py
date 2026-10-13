from __future__ import annotations

from fastapi import APIRouter, HTTPException, Request

from kuroha import __version__
from kuroha.models import (
    HealthResponse,
    InfoResponse,
    PublicSettings,
    ReadyResponse,
    SettingsUpdate,
)
from kuroha.storage import SQLiteStore


router = APIRouter()


def _store(request: Request) -> SQLiteStore:
    return request.app.state.store


@router.get("/health", response_model=HealthResponse)
def health(request: Request) -> HealthResponse:
    settings = request.app.state.settings
    return HealthResponse(
        status="ok",
        version=__version__,
        environment=settings.environment,
    )


@router.get("/ready", response_model=ReadyResponse)
def ready(request: Request) -> ReadyResponse:
    store = _store(request)
    if not store.is_ready():
        raise HTTPException(status_code=503, detail="storage is not ready")
    return ReadyResponse(ready=True)


@router.get("/info", response_model=InfoResponse)
def info() -> InfoResponse:
    return InfoResponse(
        name="Kuroha",
        version=__version__,
        api_version="v1",
        capabilities=["web", "settings", "sqlite-storage", "health"],
    )


@router.get("/settings", response_model=PublicSettings)
def get_settings(request: Request) -> PublicSettings:
    return PublicSettings.model_validate(_store(request).get_settings())


@router.put("/settings", response_model=PublicSettings)
def update_settings(payload: SettingsUpdate, request: Request) -> PublicSettings:
    values = payload.model_dump(exclude_none=True)
    if not values:
        return PublicSettings.model_validate(_store(request).get_settings())
    try:
        current = _store(request).update_settings(values)
    except ValueError as exc:
        raise HTTPException(status_code=422, detail=str(exc)) from exc
    return PublicSettings.model_validate(current)
