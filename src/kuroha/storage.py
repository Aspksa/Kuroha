from __future__ import annotations

import json
import os
import shutil
import sqlite3
import tempfile
import zipfile
from contextlib import closing
from datetime import datetime, timezone
from io import BytesIO
from pathlib import Path
from threading import RLock
from uuid import uuid4

from kuroha.migrations import SCHEMA_VERSION, migrate


MAX_IMPORTED_DATABASE_BYTES = 128 * 1024 * 1024



DEFAULT_SETTINGS = {
    "site_name": "Kuroha",
    "theme": "dark",
    "language": "ru",
    "autostart_windows": "false",
    "launch_minimized": "false",
    "minimize_to_tray": "true",
    "check_updates_on_start": "true",
    "preferred_api_port": "8000",
    "preferred_data_dir": "",
}


class SQLiteStore:
    def __init__(self, database_path: Path) -> None:
        self.database_path = database_path
        self.backup_dir = database_path.parent / "backups"
        self.log_dir = database_path.parent / "logs"
        self._lock = RLock()

    def _connect_path(self, path: Path) -> sqlite3.Connection:
        connection = sqlite3.connect(path, timeout=5)
        connection.row_factory = sqlite3.Row
        connection.execute("PRAGMA foreign_keys = ON")
        connection.execute("PRAGMA busy_timeout = 5000")
        connection.execute("PRAGMA journal_mode = WAL")
        connection.execute("PRAGMA synchronous = NORMAL")
        return connection

    def _connect(self) -> sqlite3.Connection:
        return self._connect_path(self.database_path)

    def initialize(self) -> None:
        self.database_path.parent.mkdir(parents=True, exist_ok=True)
        self.backup_dir.mkdir(parents=True, exist_ok=True)
        self.log_dir.mkdir(parents=True, exist_ok=True)
        with self._lock, closing(self._connect()) as connection, connection:
            migrate(connection)

    def is_ready(self) -> bool:
        try:
            with closing(self._connect()) as connection, connection:
                return connection.execute("PRAGMA quick_check").fetchone()[0] == "ok"
        except sqlite3.Error:
            return False

    def schema_version(self) -> int:
        with closing(self._connect()) as connection, connection:
            return int(connection.execute("PRAGMA user_version").fetchone()[0])

    def journal_mode(self) -> str:
        with closing(self._connect()) as connection, connection:
            return str(connection.execute("PRAGMA journal_mode").fetchone()[0])

    def integrity_check(self) -> str:
        with closing(self._connect()) as connection, connection:
            return str(connection.execute("PRAGMA integrity_check").fetchone()[0])

    def database_size(self) -> int:
        return self.database_path.stat().st_size if self.database_path.exists() else 0

    def get_settings(self) -> dict[str, str]:
        with self._lock, closing(self._connect()) as connection, connection:
            rows = connection.execute(
                "SELECT key, value FROM app_settings ORDER BY key"
            ).fetchall()
        return {str(row["key"]): str(row["value"]) for row in rows}

    def update_settings(self, values: dict[str, object]) -> dict[str, str]:
        unknown = set(values) - set(DEFAULT_SETTINGS)
        if unknown:
            names = ", ".join(sorted(unknown))
            raise ValueError(f"unsupported settings: {names}")

        with self._lock, closing(self._connect()) as connection, connection:
            for key, value in values.items():
                connection.execute(
                    """
                    INSERT INTO app_settings(key, value) VALUES (?, ?)
                    ON CONFLICT(key) DO UPDATE SET value = excluded.value
                    """,
                    (key, str(value).lower() if isinstance(value, bool) else str(value)),
                )
        return self.get_settings()

    def create_backup(self) -> dict[str, str | int]:
        self.backup_dir.mkdir(parents=True, exist_ok=True)
        created_at = datetime.now(timezone.utc)
        backup_id = created_at.strftime("%Y%m%dT%H%M%SZ") + "-" + uuid4().hex[:8]
        archive_path = self.backup_dir / f"{backup_id}.zip"

        with tempfile.TemporaryDirectory(dir=self.database_path.parent) as temp_dir:
            snapshot = Path(temp_dir) / "kuroha.db"
            with self._lock, closing(self._connect()) as source, source:
                source.execute("PRAGMA wal_checkpoint(PASSIVE)")
                with closing(self._connect_path(snapshot)) as target, target:
                    source.backup(target)
                    target.execute("PRAGMA wal_checkpoint(TRUNCATE)")

            manifest = {
                "id": backup_id,
                "created_at": created_at.isoformat(),
                "schema_version": self.schema_version(),
            }
            with zipfile.ZipFile(archive_path, "w", zipfile.ZIP_DEFLATED) as archive:
                archive.write(snapshot, arcname="kuroha.db")
                archive.writestr("manifest.json", json.dumps(manifest, ensure_ascii=False))

        return self._backup_info(archive_path)

    def _backup_info(self, archive_path: Path) -> dict[str, str | int]:
        with zipfile.ZipFile(archive_path) as archive:
            manifest = json.loads(archive.read("manifest.json").decode("utf-8"))
        return {
            "id": str(manifest["id"]),
            "filename": archive_path.name,
            "created_at": str(manifest["created_at"]),
            "size_bytes": archive_path.stat().st_size,
        }

    def list_backups(self) -> list[dict[str, str | int]]:
        backups: list[dict[str, str | int]] = []
        if not self.backup_dir.exists():
            return backups

        for archive_path in self.backup_dir.glob("*.zip"):
            try:
                backups.append(self._backup_info(archive_path))
            except (KeyError, ValueError, OSError, zipfile.BadZipFile):
                continue

        return sorted(backups, key=lambda item: str(item["created_at"]), reverse=True)

    def backup_path(self, backup_id: str) -> Path:
        self._validate_backup_id(backup_id)
        path = self.backup_dir / f"{backup_id}.zip"
        if not path.is_file():
            raise FileNotFoundError(backup_id)
        return path

    def import_backup(self, payload: bytes) -> dict[str, str | int]:
        if not payload:
            raise ValueError("backup archive is empty")
        if len(payload) > 128 * 1024 * 1024:
            raise ValueError("backup archive is too large")

        created_at = datetime.now(timezone.utc)
        backup_id = created_at.strftime("%Y%m%dT%H%M%SZ") + "-import-" + uuid4().hex[:8]
        archive_path = self.backup_dir / f"{backup_id}.zip"
        self.backup_dir.mkdir(parents=True, exist_ok=True)

        with tempfile.TemporaryDirectory(dir=self.database_path.parent) as temp_dir:
            candidate = Path(temp_dir) / "kuroha.db"
            try:
                with zipfile.ZipFile(BytesIO(payload)) as archive:
                    names = set(archive.namelist())
                    if {"kuroha.db", "manifest.json"} - names:
                        raise ValueError("backup archive is incomplete")

                    source_manifest = json.loads(
                        archive.read("manifest.json").decode("utf-8")
                    )
                    if not isinstance(source_manifest, dict):
                        raise ValueError("backup manifest must be an object")
                    if int(source_manifest.get("schema_version", 0)) > SCHEMA_VERSION:
                        raise ValueError("backup uses a newer database schema")

                    database_info = archive.getinfo("kuroha.db")
                    if database_info.file_size > MAX_IMPORTED_DATABASE_BYTES:
                        raise ValueError("backup database is too large")

                    with archive.open(database_info, "r") as source, candidate.open("wb") as target:
                        shutil.copyfileobj(source, target, length=1024 * 1024)

                with closing(self._connect_path(candidate)) as connection, connection:
                    if connection.execute("PRAGMA integrity_check").fetchone()[0] != "ok":
                        raise ValueError("backup database failed integrity check")
                    migrate(connection)
                    connection.execute("PRAGMA wal_checkpoint(TRUNCATE)")
            except ValueError:
                raise
            except (
                zipfile.BadZipFile,
                json.JSONDecodeError,
                KeyError,
                AttributeError,
                TypeError,
                sqlite3.Error,
                RuntimeError,
            ) as exc:
                raise ValueError("invalid backup archive") from exc

            manifest = {
                "id": backup_id,
                "created_at": created_at.isoformat(),
                "schema_version": SCHEMA_VERSION,
                "imported": True,
            }
            with zipfile.ZipFile(archive_path, "w", zipfile.ZIP_DEFLATED) as output:
                output.write(candidate, arcname="kuroha.db")
                output.writestr("manifest.json", json.dumps(manifest, ensure_ascii=False))

        return self._backup_info(archive_path)

    def restore_backup(self, backup_id: str) -> None:
        archive_path = self.backup_path(backup_id)

        with tempfile.TemporaryDirectory(dir=self.database_path.parent) as temp_dir:
            temp_path = Path(temp_dir)
            with zipfile.ZipFile(archive_path) as archive:
                names = set(archive.namelist())
                if {"kuroha.db", "manifest.json"} - names:
                    raise ValueError("backup archive is incomplete")
                manifest = json.loads(archive.read("manifest.json").decode("utf-8"))
                if not isinstance(manifest, dict):
                    raise ValueError("backup manifest must be an object")
                if int(manifest.get("schema_version", 0)) > SCHEMA_VERSION:
                    raise ValueError("backup uses a newer database schema")
                database_info = archive.getinfo("kuroha.db")
                if database_info.file_size > MAX_IMPORTED_DATABASE_BYTES:
                    raise ValueError("backup database is too large")
                with archive.open(database_info, "r") as source, (temp_path / "kuroha.db").open("wb") as target:
                    shutil.copyfileobj(source, target, length=1024 * 1024)

            restored = temp_path / "kuroha.db"
            with closing(self._connect_path(restored)) as connection, connection:
                if connection.execute("PRAGMA integrity_check").fetchone()[0] != "ok":
                    raise ValueError("backup database failed integrity check")
                migrate(connection)
                connection.execute("PRAGMA wal_checkpoint(TRUNCATE)")

            with self._lock:
                if self.database_path.exists():
                    with closing(self._connect()) as current, current:
                        current.execute("PRAGMA wal_checkpoint(TRUNCATE)")
                    safety = self.database_path.with_suffix(".pre-restore.db")
                    try:
                        safety.unlink()
                    except FileNotFoundError:
                        pass
                    os.replace(self.database_path, safety)

                for suffix in ("-wal", "-shm"):
                    try:
                        Path(str(self.database_path) + suffix).unlink()
                    except FileNotFoundError:
                        pass

                os.replace(restored, self.database_path)

        self.initialize()

    def read_logs(self, limit: int = 300, level: str | None = None) -> list[dict[str, str]]:
        log_path = self.log_dir / "kuroha.log"
        if not log_path.is_file():
            return []

        lines = log_path.read_text(encoding="utf-8", errors="replace").splitlines()[-limit:]
        entries: list[dict[str, str]] = []
        for line in reversed(lines):
            detected = "INFO"
            for candidate in ("CRITICAL", "ERROR", "WARNING", "INFO", "DEBUG"):
                if f" {candidate} " in line:
                    detected = candidate
                    break
            if level and detected != level.upper():
                continue
            entries.append({"raw": line, "level": detected})
        return entries

    def clear_logs(self) -> int:
        freed = 0
        for path in self.log_dir.glob("kuroha.log*"):
            if path.is_file():
                freed += path.stat().st_size
                path.write_text("", encoding="utf-8") if path.name == "kuroha.log" else path.unlink()
        return freed

    def log_path(self) -> Path:
        path = self.log_dir / "kuroha.log"
        path.touch(exist_ok=True)
        return path

    def storage_usage(self) -> dict[str, int]:
        backup_files = [path for path in self.backup_dir.glob("*.zip") if path.is_file()]
        log_files = [path for path in self.log_dir.glob("kuroha.log*") if path.is_file()]
        database_bytes = self.database_size()
        backups_bytes = sum(path.stat().st_size for path in backup_files)
        logs_bytes = sum(path.stat().st_size for path in log_files)
        return {
            "database_bytes": database_bytes,
            "backups_bytes": backups_bytes,
            "logs_bytes": logs_bytes,
            "total_bytes": database_bytes + backups_bytes + logs_bytes,
            "backup_count": len(backup_files),
            "log_file_count": len(log_files),
        }

    def cleanup_storage(self, keep_backups: int) -> dict[str, int]:
        backups = sorted(
            (path for path in self.backup_dir.glob("*.zip") if path.is_file()),
            key=lambda path: path.stat().st_mtime,
            reverse=True,
        )
        removed_backups = 0
        removed_log_files = 0
        freed_bytes = 0

        for path in backups[keep_backups:]:
            freed_bytes += path.stat().st_size
            path.unlink()
            removed_backups += 1

        for path in self.log_dir.glob("kuroha.log.*"):
            if path.is_file():
                freed_bytes += path.stat().st_size
                path.unlink()
                removed_log_files += 1

        return {
            "removed_backups": removed_backups,
            "removed_log_files": removed_log_files,
            "freed_bytes": freed_bytes,
        }

    @staticmethod
    def _validate_backup_id(backup_id: str) -> None:
        allowed = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789-_"
        if not backup_id or any(char not in allowed for char in backup_id):
            raise ValueError("invalid backup id")
