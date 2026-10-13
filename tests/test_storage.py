from pathlib import Path

from kuroha.storage import SQLiteStore


def test_storage_initializes_and_updates(tmp_path: Path) -> None:
    store = SQLiteStore(tmp_path / "nested" / "kuroha.db")
    store.initialize()

    assert store.is_ready()
    assert store.get_settings() == {"site_name": "Kuroha", "theme": "dark"}

    result = store.update_settings({"site_name": "Куроха"})
    assert result["site_name"] == "Куроха"


def test_storage_rejects_unknown_keys(tmp_path: Path) -> None:
    store = SQLiteStore(tmp_path / "kuroha.db")
    store.initialize()

    try:
        store.update_settings({"secret": "nope"})
    except ValueError as exc:
        assert "unsupported settings" in str(exc)
    else:
        raise AssertionError("unknown settings must be rejected")
