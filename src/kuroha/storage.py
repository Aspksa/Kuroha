from __future__ import annotations

import json
import os
import sqlite3
import tempfile
import zipfile
from datetime import datetime, timezone
from pathlib import Path
from threading import RLock
from uuid import uuid4

from kuroha.migrations import SCHEMA_VERSION, migrate


DEFAULT_SETTINGS = {
    "site_name": "Kuroha",
    "theme": "dark",
}


class SQLiteStore:
    def __init__(self, database_path: Path) -> None:
        self.database_path = database_path
        self.backup_dir = database_path.parent / "backups"
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
        with self._lock, self._connect() as connection:
            migrate(connection)

    def is_ready(self) -> bool:
        try:
            with self._connect() as connection:
                return connection.execute("PRAGMA quick_check").fetchone()[0] == "ok"
        except sqlite3.Error:
            return False

    def schema_version(self) -> int:
        with self._connect() as connection:
            return int(connection.execute("PRAGMA user_version").fetchone()[0])

    def journal_mode(self) -> str:
        with self._connect() as connection:
            return str(connection.execute("PRAGMA journal_mode").fetchone()[0])

    def integrity_check(self) -> str:
        with self._connect() as connection:
            return str(connection.execute("PRAGMA integrity_check").fetchone()[0])

    def database_size(self) -> int:
        return self.database_path.stat().st_size if self.database_path.exists() else 0

    def get_settings(self) -> dict[str, str]:
        with self._lock, self._connect() as connection:
            rows = connection.execute(
                "SELECT key, value FROM app_settings ORDER BY key"
            ).fetchall()
        return {str(row["key"]): str(row["value"]) for row in rows}

    def update_settings(self, values: dict[str, str]) -> dict[str, str]:
        unknown = set(values) - set(DEFAULT_SETTINGS)
        if unknown:
            names = ", ".join(sorted(unknown))
            raise ValueError(f"unsupported settings: {names}")

        with self._lock, self._connect() as connection:
            for key, value in values.items():
                connection.execute(
                    """
                    INSERT INTO app_settings(key, value) VALUES (?, ?)
                    ON CONFLICT(key) DO UPDATE SET value = excluded.value
                    """,
                    (key, value),
                )
        return self.get_settings()

    def create_backup(self) -> dict[str, str | int]:
        self.backup_dir.mkdir(parents=True, exist_ok=True)
        created_at = datetime.now(timezone.utc)
        backup_id = created_at.strftime("%Y%m%dT%H%M%SZ") + "-" + uuid4().hex[:8]
        archive_path = self.backup_dir / f"{backup_id}.zip"

        with tempfile.TemporaryDirectory(dir=self.database_path.parent) as temp_dir:
            snapshot = Path(temp_dir) / "kuroha.db"
            with self._lock, self._connect() as source:
                source.execute("PRAGMA wal_checkpoint(PASSIVE)")
                with self._connect_path(snapshot) as target:
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

        size_bytes = archive_path.stat().st_size
        with self._lock, self._connect() as connection:
            connection.execute(
                """
                INSERT INTO backup_history(id, filename, created_at, size_bytes)
                VALUES (?, ?, ?, ?)
                """,
                (backup_id, archive_path.name, created_at.isoformat(), size_bytes),
            )

        return {
            "id": backup_id,
            "filename": archive_path.name,
            "created_at": created_at.isoformat(),
            "size_bytes": size_bytes,
        }

    def list_backups(self) -> list[dict[str, str | int]]:
        backups: list[dict[str, str | int]] = []
        if not self.backup_dir.exists():
            return backups

        for archive_path in self.backup_dir.glob("*.zip"):
            try:
                with zipfile.ZipFile(archive_path) as archive:
                    manifest = json.loads(archive.read("manifest.json").decode("utf-8"))
                backups.append(
                    {
                        "id": str(manifest["id"]),
                        "filename": archive_path.name,
                        "created_at": str(manifest["created_at"]),
                        "size_bytes": archive_path.stat().st_size,
                    }
                )
            except (KeyError, ValueError, OSError, zipfile.BadZipFile):
                continue

        return sorted(backups, key=lambda item: str(item["created_at"]), reverse=True)

    def restore_backup(self, backup_id: str) -> None:
        allowed = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789-_"
        if not backup_id or any(char not in allowed for char in backup_id):
            raise ValueError("invalid backup id")

        archive_path = self.backup_dir / f"{backup_id}.zip"
        if not archive_path.is_file():
            raise FileNotFoundError(backup_id)

        with tempfile.TemporaryDirectory(dir=self.database_path.parent) as temp_dir:
            temp_path = Path(temp_dir)
            with zipfile.ZipFile(archive_path) as archive:
                names = set(archive.namelist())
                if {"kuroha.db", "manifest.json"} - names:
                    raise ValueError("backup archive is incomplete")
                manifest = json.loads(archive.read("manifest.json").decode("utf-8"))
                if int(manifest.get("schema_version", 0)) > SCHEMA_VERSION:
                    raise ValueError("backup uses a newer database schema")
                archive.extract("kuroha.db", path=temp_path)

            restored = temp_path / "kuroha.db"
            with self._connect_path(restored) as connection:
                if connection.execute("PRAGMA integrity_check").fetchone()[0] != "ok":
                    raise ValueError("backup database failed integrity check")
                migrate(connection)
                connection.execute("PRAGMA wal_checkpoint(TRUNCATE)")

            with self._lock:
                if self.database_path.exists():
                    with self._connect() as current:
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
