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


def test_chat_preserves_cyrillic_utf8() -> None:
    message = "Привет, Куроха! Проверка: ёжик, Владивосток, мир."
    response = client.post("/api/chat", json={"message": message})

    assert response.status_code == 200
    assert response.json()["reply"] == f"Kuroha received: {message}"

    body = response.content.decode("utf-8")
    assert "Привет, Куроха!" in body
    assert "ёжик" in body


def test_chat_preserves_mixed_unicode() -> None:
    message = "Русский + English + 日本語 + emoji 🌙"
    response = client.post("/api/chat", json={"message": message})

    assert response.status_code == 200
    assert response.json()["reply"] == f"Kuroha received: {message}"
