from pathlib import Path

from fastapi.testclient import TestClient

from kuroha.app import create_app
from kuroha.config import Settings


def client_for(tmp_path: Path) -> TestClient:
    return TestClient(
        create_app(
            Settings(
                environment="test",
                host="127.0.0.1",
                port=8000,
                data_dir=tmp_path,
                log_level="INFO",
                cors_origins=("http://localhost:5173",),
                max_request_bytes=1024,
            )
        )
    )


def test_backup_export_and_import(tmp_path: Path) -> None:
    with client_for(tmp_path) as client:
        created = client.post("/api/v1/backups")
        assert created.status_code == 201
        backup_id = created.json()["id"]

        downloaded = client.get(f"/api/v1/backups/{backup_id}/download")
        assert downloaded.status_code == 200
        assert downloaded.headers["content-type"].startswith("application/zip")

        imported = client.post(
            "/api/v1/backups/import",
            content=downloaded.content,
            headers={"Content-Type": "application/zip"},
        )
        assert imported.status_code == 201
        assert imported.json()["id"] != backup_id

        backups = client.get("/api/v1/backups").json()
        assert len(backups) == 2


def test_logs_and_storage_cleanup(tmp_path: Path) -> None:
    with client_for(tmp_path) as client:
        for _ in range(7):
            assert client.post("/api/v1/backups").status_code == 201

        usage = client.get("/api/v1/storage")
        assert usage.status_code == 200
        assert usage.json()["backup_count"] == 7

        logs = client.get("/api/v1/logs")
        assert logs.status_code == 200

        cleanup = client.post("/api/v1/storage/cleanup", json={"keep_backups": 5})
        assert cleanup.status_code == 200
        assert cleanup.json()["removed_backups"] == 2

        after = client.get("/api/v1/storage").json()
        assert after["backup_count"] == 5

        cleared = client.delete("/api/v1/logs")
        assert cleared.status_code == 204


def test_import_rejects_invalid_zip(tmp_path: Path) -> None:
    with client_for(tmp_path) as client:
        response = client.post(
            "/api/v1/backups/import",
            content=b"not-a-zip",
            headers={"Content-Type": "application/zip"},
        )
    assert response.status_code == 422
