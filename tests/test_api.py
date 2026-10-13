from fastapi.testclient import TestClient

from kuroha.app import app

client = TestClient(app)


def test_health() -> None:
    response = client.get("/api/health")
    assert response.status_code == 200
    assert response.json() == {"status": "ok", "version": "0.1.0"}


def test_chat_reuses_session() -> None:
    first = client.post("/api/chat", json={"message": "ping"})
    assert first.status_code == 200
    payload = first.json()
    assert payload["reply"] == "pong"

    second = client.post(
        "/api/chat",
        json={"message": "/history", "session_id": payload["session_id"]},
    )
    assert second.status_code == 200
    assert second.json()["reply"] == "This session contains 2 user message(s)."
