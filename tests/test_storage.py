import sqlite3
from pathlib import Path

from kuroha.storage import SQLiteStore


def test_storage_initializes_and_updates(tmp_path: Path) -> None:
    store = SQLiteStore(tmp_path / "nested" / "kuroha.db")
    store.initialize()

    assert store.is_ready()
    assert store.schema_version() == 4
    assert store.journal_mode() == "wal"
    settings = store.get_settings()
    assert settings["site_name"] == "Kuroha"
    assert settings["theme"] == "dark"
    assert settings["language"] == "ru"
    assert settings["minimize_to_tray"] == "true"
    assert settings["preferred_data_dir"] == ""

    result = store.update_settings({"site_name": "Куроха"})
    assert result["site_name"] == "Куроха"


def test_storage_migrates_existing_v1_database(tmp_path: Path) -> None:
    database = tmp_path / "kuroha.db"
    with sqlite3.connect(database) as connection:
        connection.execute(
            "CREATE TABLE app_settings (key TEXT PRIMARY KEY, value TEXT NOT NULL)"
        )
        connection.execute(
            "INSERT INTO app_settings(key, value) VALUES ('site_name', 'Старая Куроха')"
        )
        connection.execute("PRAGMA user_version = 1")

    store = SQLiteStore(database)
    store.initialize()

    assert store.schema_version() == 4
    assert store.get_settings()["site_name"] == "Старая Куроха"

    with sqlite3.connect(database) as connection:
        table = connection.execute(
            "SELECT name FROM sqlite_master WHERE type='table' AND name='backup_history'"
        ).fetchone()
    assert table is not None


def test_backup_restores_previous_state(tmp_path: Path) -> None:
    store = SQLiteStore(tmp_path / "kuroha.db")
    store.initialize()
    store.update_settings({"site_name": "Первое состояние"})

    backup = store.create_backup()
    store.update_settings({"site_name": "Второе состояние"})

    store.restore_backup(str(backup["id"]))

    assert store.get_settings()["site_name"] == "Первое состояние"
    assert any(item["id"] == backup["id"] for item in store.list_backups())
    assert store.integrity_check() == "ok"


def test_storage_rejects_unknown_keys(tmp_path: Path) -> None:
    store = SQLiteStore(tmp_path / "kuroha.db")
    store.initialize()

    try:
        store.update_settings({"secret": "nope"})
    except ValueError as exc:
        assert "unsupported settings" in str(exc)
    else:
        raise AssertionError("unknown settings must be rejected")
