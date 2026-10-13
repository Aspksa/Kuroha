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
                log_level="WARNING",
                cors_origins=("http://localhost:5173",),
                max_request_bytes=1024,
            )
        )
    )


def test_security_headers_are_present(tmp_path: Path) -> None:
    with client_for(tmp_path) as client:
        response = client.get("/api/v1/health")

    assert response.headers["x-content-type-options"] == "nosniff"
    assert response.headers["x-frame-options"] == "DENY"
    assert response.headers["referrer-policy"] == "no-referrer"
    assert "frame-ancestors 'none'" in response.headers["content-security-policy"]
    assert response.headers["cache-control"] == "no-store"


def test_cors_allows_only_configured_origin(tmp_path: Path) -> None:
    with client_for(tmp_path) as client:
        allowed = client.options(
            "/api/v1/settings",
            headers={
                "Origin": "http://localhost:5173",
                "Access-Control-Request-Method": "PUT",
                "Access-Control-Request-Headers": "X-Kuroha, Content-Type",
            },
        )
        blocked = client.options(
            "/api/v1/settings",
            headers={
                "Origin": "https://example.invalid",
                "Access-Control-Request-Method": "PUT",
            },
        )

    assert allowed.headers["access-control-allow-origin"] == "http://localhost:5173"
    assert "access-control-allow-origin" not in blocked.headers


def test_untrusted_host_is_blocked(tmp_path: Path) -> None:
    with client_for(tmp_path) as client:
        response = client.get(
            "/api/v1/health",
            headers={"Host": "attacker.example"},
        )

    assert response.status_code == 400


def test_cross_origin_modifying_request_is_blocked(tmp_path: Path) -> None:
    with client_for(tmp_path) as client:
        response = client.post(
            "/api/v1/backups",
            headers={"Origin": "https://evil.example"},
        )

    assert response.status_code == 403
    assert response.json()["error"]["code"] == "forbidden_origin"


def test_allowed_browser_write_requires_kuroha_marker(tmp_path: Path) -> None:
    with client_for(tmp_path) as client:
        blocked = client.post(
            "/api/v1/backups",
            headers={"Origin": "http://localhost:5173"},
        )
        allowed = client.post(
            "/api/v1/backups",
            headers={
                "Origin": "http://localhost:5173",
                "X-Kuroha": "1",
            },
        )

    assert blocked.status_code == 403
    assert allowed.status_code == 201
