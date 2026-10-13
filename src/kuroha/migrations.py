from __future__ import annotations

import sqlite3
from collections.abc import Callable


SCHEMA_VERSION = 2

Migration = Callable[[sqlite3.Connection], None]


def _migration_1(connection: sqlite3.Connection) -> None:
    connection.execute(
        """
        CREATE TABLE IF NOT EXISTS app_settings (
            key TEXT PRIMARY KEY,
            value TEXT NOT NULL
        )
        """
    )
    connection.executemany(
        "INSERT OR IGNORE INTO app_settings(key, value) VALUES (?, ?)",
        (("site_name", "Kuroha"), ("theme", "dark")),
    )


def _migration_2(connection: sqlite3.Connection) -> None:
    connection.execute(
        """
        CREATE TABLE IF NOT EXISTS backup_history (
            id TEXT PRIMARY KEY,
            filename TEXT NOT NULL,
            created_at TEXT NOT NULL,
            size_bytes INTEGER NOT NULL
        )
        """
    )


MIGRATIONS: dict[int, Migration] = {
    1: _migration_1,
    2: _migration_2,
}


def migrate(connection: sqlite3.Connection) -> int:
    current = int(connection.execute("PRAGMA user_version").fetchone()[0])
    if current > SCHEMA_VERSION:
        raise RuntimeError(
            f"database schema {current} is newer than supported {SCHEMA_VERSION}"
        )

    for version in range(current + 1, SCHEMA_VERSION + 1):
        migration = MIGRATIONS[version]
        with connection:
            migration(connection)
            connection.execute(f"PRAGMA user_version = {version}")

    return SCHEMA_VERSION
