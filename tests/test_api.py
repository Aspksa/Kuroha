from pathlib import Path

from fastapi.testclient import TestClient

from kuroha.app import create_app
from kuroha.config import Settings


def build_client(tmp_path: Path, *, max_request_bytes: int = 1024 * 1024) -> TestClient:
    settings = Settings(
        environment="test",
        host="127.0.0.1",
        port=8000,
        data_dir=tmp_path,
        log_level="WARNING",
        cors_origins=("http://localhost:5173",),
        max_request_bytes=max_request_bytes,
    )
    return TestClient(create_app(settings))


def test_health_and_readiness(tmp_path: Path) -> None:
    with build_client(tmp_path) as client:
        health = client.get("/api/v1/health")
        assert health.status_code == 200
        assert health.json() == {
            "status": "ok",
            "version": "0.6.1",
            "environment": "test",
        }

        ready = client.get("/api/v1/ready")
        assert ready.status_code == 200
        assert ready.json() == {"ready": True}


def test_legacy_api_alias_remains_available(tmp_path: Path) -> None:
    with build_client(tmp_path) as client:
        response = client.get("/api/info")
        assert response.status_code == 200
        assert response.json()["api_version"] == "v1"


def test_settings_persist_in_sqlite(tmp_path: Path) -> None:
    with build_client(tmp_path) as client:
        initial = client.get("/api/v1/settings")
        assert initial.json()["site_name"] == "Kuroha"
        assert initial.json()["theme"] == "dark"
        assert initial.json()["language"] == "ru"
        assert initial.json()["minimize_to_tray"] is True
        assert initial.json()["preferred_data_dir"] == ""

        updated = client.put(
            "/api/v1/settings",
            json={"site_name": "Куроха", "theme": "light"},
        )
        assert updated.status_code == 200
        assert updated.json()["site_name"] == "Куроха"
        assert updated.json()["theme"] == "light"

    with build_client(tmp_path) as client:
        persisted = client.get("/api/v1/settings")
        assert persisted.json()["site_name"] == "Куроха"
        assert persisted.json()["theme"] == "light"


def test_diagnostics_exposes_storage_health(tmp_path: Path) -> None:
    with build_client(tmp_path) as client:
        response = client.get("/api/v1/diagnostics")

    assert response.status_code == 200
    payload = response.json()
    assert payload["database_schema_version"] == 4
    assert payload["database_journal_mode"] == "wal"
    assert payload["database_integrity"] == "ok"
    assert payload["data_dir_writable"] is True
    assert payload["python_version"]


def test_backup_and_restore_api(tmp_path: Path) -> None:
    with build_client(tmp_path) as client:
        client.put("/api/v1/settings", json={"site_name": "До бэкапа"})
        created = client.post("/api/v1/backups")
        assert created.status_code == 201
        backup_id = created.json()["id"]

        client.put("/api/v1/settings", json={"site_name": "После бэкапа"})
        restored = client.post(f"/api/v1/backups/{backup_id}/restore")
        assert restored.status_code == 204

        settings = client.get("/api/v1/settings")
        assert settings.json()["site_name"] == "До бэкапа"

        backups = client.get("/api/v1/backups")
        assert backups.status_code == 200
        assert any(item["id"] == backup_id for item in backups.json())


def test_validation_error_has_stable_shape(tmp_path: Path) -> None:
    with build_client(tmp_path) as client:
        response = client.put("/api/v1/settings", json={"site_name": ""})
        assert response.status_code == 422
        assert response.json()["error"]["code"] == "validation_error"


def test_request_size_limit(tmp_path: Path) -> None:
    with build_client(tmp_path, max_request_bytes=32) as client:
        response = client.put(
            "/api/v1/settings",
            content=b"x" * 64,
            headers={"Content-Type": "application/json"},
        )
        assert response.status_code == 413
        assert response.json()["error"]["code"] == "request_too_large"
