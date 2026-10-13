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


class SettingsUpdate(BaseModel):
    site_name: str | None = Field(default=None, min_length=1, max_length=80)
    theme: Literal["dark", "light"] | None = None


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


class UpdateStatus(BaseModel):
    current_version: str
    installed_sha: str | None
    remote_sha: str
    update_available: bool
    prepared: bool
    repository_url: str
    branch: str
    commit_message: str
    checked_at: str


class UpdateApplyResponse(BaseModel):
    accepted: bool
    target_sha: str
    message: str
