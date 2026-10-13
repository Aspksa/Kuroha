from __future__ import annotations

from dataclasses import dataclass, field
from threading import RLock
from uuid import uuid4

from kuroha import __version__


@dataclass(slots=True)
class Conversation:
    messages: list[tuple[str, str]] = field(default_factory=list)


class KurohaEngine:
    """Legacy deterministic runtime kept isolated from the platform foundation."""

    def __init__(self) -> None:
        self._sessions: dict[str, Conversation] = {}
        self._lock = RLock()

    def respond(self, message: str, session_id: str | None = None) -> tuple[str, str]:
        text = message.strip()
        if not text:
            raise ValueError("message must not be blank")

        sid = session_id or uuid4().hex

        with self._lock:
            conversation = self._sessions.setdefault(sid, Conversation())
            conversation.messages.append(("user", text))
            reply = self._generate_reply(text, conversation)
            conversation.messages.append(("assistant", reply))

        return reply, sid

    def history(self, session_id: str) -> tuple[tuple[str, str], ...]:
        with self._lock:
            conversation = self._sessions.get(session_id)
            if conversation is None:
                return ()
            return tuple(conversation.messages)

    @staticmethod
    def _generate_reply(message: str, conversation: Conversation) -> str:
        normalized = message.casefold()

        if normalized in {"/ping", "ping"}:
            return "pong"
        if normalized in {"/about", "about"}:
            return (
                f"Kuroha core {__version__} — Python runtime "
                "with a TypeScript web client."
            )
        if normalized in {"/history", "history"}:
            user_messages = sum(1 for role, _ in conversation.messages if role == "user")
            return f"This session contains {user_messages} user message(s)."

        return f"Kuroha received: {message}"
