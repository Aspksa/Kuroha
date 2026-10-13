from __future__ import annotations

import sqlite3
from pathlib import Path
from threading import RLock


DEFAULT_SETTINGS = {
    "site_name": "Kuroha",
    "theme": "dark",
}


class SQLiteStore:
    def __init__(self, database_path: Path) -> None:
        self.database_path = database_path
        self._lock = RLock()

    def _connect(self) -> sqlite3.Connection:
        connection = sqlite3.connect(self.database_path)
        connection.row_factory = sqlite3.Row
        connection.execute("PRAGMA foreign_keys = ON")
        return connection

    def initialize(self) -> None:
        self.database_path.parent.mkdir(parents=True, exist_ok=True)
        with self._lock, self._connect() as connection:
            connection.execute(
                """
                CREATE TABLE IF NOT EXISTS app_settings (
                    key TEXT PRIMARY KEY,
                    value TEXT NOT NULL
                )
                """
            )
            for key, value in DEFAULT_SETTINGS.items():
                connection.execute(
                    "INSERT OR IGNORE INTO app_settings(key, value) VALUES (?, ?)",
                    (key, value),
                )
            connection.execute("PRAGMA user_version = 1")

    def is_ready(self) -> bool:
        try:
            with self._connect() as connection:
                connection.execute("SELECT 1").fetchone()
            return True
        except sqlite3.Error:
            return False

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
