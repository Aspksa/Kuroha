from typing import Literal

from pydantic import BaseModel, Field


class HealthResponse(BaseModel):
    status: Literal["ok"]
    version: str
    environment: str


class ReadyResponse(BaseModel):
    ready: bool


class InfoResponse(BaseModel):
    name: str
    version: str
    api_version: str
    capabilities: list[str]


class PublicSettings(BaseModel):
    site_name: str
    theme: Literal["dark", "light"]
    language: Literal["ru"]
    autostart_windows: bool
    launch_minimized: bool
    minimize_to_tray: bool
    check_updates_on_start: bool
    preferred_api_port: int


class SettingsUpdate(BaseModel):
    site_name: str | None = Field(default=None, min_length=1, max_length=80)
    theme: Literal["dark", "light"] | None = None
    language: Literal["ru"] | None = None
    autostart_windows: bool | None = None
    launch_minimized: bool | None = None
    minimize_to_tray: bool | None = None
    check_updates_on_start: bool | None = None
    preferred_api_port: int | None = Field(default=None, ge=1024, le=65535)


class BackupInfo(BaseModel):
    id: str
    filename: str
    created_at: str
    size_bytes: int


class DiagnosticsResponse(BaseModel):
    python_version: str
    python_executable: str
    node_version: str | None
    platform: str
    project_root: str
    data_dir: str
    database_path: str
    database_size_bytes: int
    database_schema_version: int
    database_journal_mode: str
    database_integrity: str
    data_dir_writable: bool
    disk_free_bytes: int
    disk_total_bytes: int
    environment: str
    host: str
    port: int


class LogEntry(BaseModel):
    raw: str
    level: str


class StorageUsage(BaseModel):
    database_bytes: int
    backups_bytes: int
    logs_bytes: int
    total_bytes: int
    backup_count: int
    log_file_count: int


class CleanupRequest(BaseModel):
    keep_backups: int = Field(default=5, ge=0, le=100)


class CleanupResult(BaseModel):
    removed_backups: int
    removed_log_files: int
    freed_bytes: int


class UpdateBackup(BaseModel):
    filename: str
    created_at: str
    size_bytes: int


class UpdateStatus(BaseModel):
    current_version: str
    installed_sha: str | None
    remote_sha: str
    update_available: bool
    prepared: bool
    git_checkout: bool
    repository_url: str
    branch: str
    commit_message: str
    changelog: list[str]
    checked_at: str


class UpdateApplyResponse(BaseModel):
    accepted: bool
    target_sha: str
    message: str


class UpdateRollbackResponse(BaseModel):
    accepted: bool
    backup: str
    message: str
