import sys

import pytest

from kuroha.engine import KurohaEngine


def test_supported_python_runtime() -> None:
    assert (3, 10) <= sys.version_info[:2] < (3, 16)


@pytest.mark.parametrize(
    "message",
    [
        "Кириллица без потерь: АБВ абв Ёё",
        "Путь: C:\\Проекты\\Куроха\\данные",
        "Смешанный текст: Kuroha — Куроха — 黒羽 — 🌙",
    ],
)
def test_engine_round_trips_unicode(message: str) -> None:
    engine = KurohaEngine()
    reply, session_id = engine.respond(message)

    assert reply == f"Kuroha received: {message}"
    assert engine.history(session_id) == (
        ("user", message),
        ("assistant", reply),
    )
