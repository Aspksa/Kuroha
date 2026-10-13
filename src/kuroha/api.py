from __future__ import annotations

from fastapi import APIRouter, HTTPException, Query, Request, Response
from fastapi.responses import FileResponse

from kuroha import __version__
from kuroha.diagnostics import collect_diagnostics
from kuroha.models import (
    BackupInfo,
    CleanupRequest,
    CleanupResult,
    DiagnosticsResponse,
    HealthResponse,
    InfoResponse,
    LogEntry,
    PublicSettings,
    ReadyResponse,
    SettingsUpdate,
    StorageUsage,
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
        capabilities=[
            "web",
            "settings",
            "sqlite-storage",
            "health",
            "diagnostics",
            "backup-restore",
            "backup-import-export",
            "logs",
            "storage-management",
            "migrations",
            "pwa",
            "desktop-ready",
        ],
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


@router.get("/diagnostics", response_model=DiagnosticsResponse)
def diagnostics(request: Request) -> DiagnosticsResponse:
    data = collect_diagnostics(request.app.state.settings, _store(request))
    return DiagnosticsResponse.model_validate(data)


@router.get("/backups", response_model=list[BackupInfo])
def list_backups(request: Request) -> list[BackupInfo]:
    return [BackupInfo.model_validate(item) for item in _store(request).list_backups()]


@router.post("/backups", response_model=BackupInfo, status_code=201)
def create_backup(request: Request) -> BackupInfo:
    return BackupInfo.model_validate(_store(request).create_backup())


@router.post("/backups/import", response_model=BackupInfo, status_code=201)
async def import_backup(request: Request) -> BackupInfo:
    try:
        payload = await request.body()
        return BackupInfo.model_validate(_store(request).import_backup(payload))
    except ValueError as exc:
        raise HTTPException(status_code=422, detail=str(exc)) from exc


@router.get("/backups/{backup_id}/download", response_model=None)
def download_backup(backup_id: str, request: Request):
    try:
        path = _store(request).backup_path(backup_id)
    except FileNotFoundError as exc:
        raise HTTPException(status_code=404, detail="Backup not found") from exc
    except ValueError as exc:
        raise HTTPException(status_code=422, detail=str(exc)) from exc
    return FileResponse(path, media_type="application/zip", filename=path.name)


@router.post("/backups/{backup_id}/restore", status_code=204)
def restore_backup(backup_id: str, request: Request) -> None:
    try:
        _store(request).restore_backup(backup_id)
    except FileNotFoundError as exc:
        raise HTTPException(status_code=404, detail="Backup not found") from exc
    except ValueError as exc:
        raise HTTPException(status_code=422, detail=str(exc)) from exc


@router.get("/logs", response_model=list[LogEntry])
def logs(
    request: Request,
    limit: int = Query(default=300, ge=1, le=2000),
    level: str | None = Query(default=None),
) -> list[LogEntry]:
    return [LogEntry.model_validate(item) for item in _store(request).read_logs(limit, level)]


@router.delete("/logs", status_code=204)
def clear_logs(request: Request) -> None:
    _store(request).clear_logs()


@router.get("/logs/download", response_model=None)
def download_logs(request: Request):
    path = _store(request).log_path()
    return FileResponse(path, media_type="text/plain", filename="kuroha.log")


@router.get("/storage", response_model=StorageUsage)
def storage_usage(request: Request) -> StorageUsage:
    return StorageUsage.model_validate(_store(request).storage_usage())


@router.post("/storage/cleanup", response_model=CleanupResult)
def cleanup_storage(payload: CleanupRequest, request: Request) -> CleanupResult:
    return CleanupResult.model_validate(_store(request).cleanup_storage(payload.keep_backups))


@router.options("/backups/import", include_in_schema=False)
def import_options() -> Response:
    return Response(status_code=204)
