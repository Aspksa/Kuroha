from __future__ import annotations

import os
from dataclasses import dataclass
from pathlib import Path

from dotenv import load_dotenv


PROJECT_ROOT = Path(__file__).resolve().parents[2]


def _split_csv(value: str) -> tuple[str, ...]:
    return tuple(item.strip() for item in value.split(",") if item.strip())


@dataclass(frozen=True, slots=True)
class Settings:
    environment: str
    host: str
    port: int
    data_dir: Path
    log_level: str
    cors_origins: tuple[str, ...]
    max_request_bytes: int
    project_root: Path = PROJECT_ROOT

    @classmethod
    def from_env(cls) -> "Settings":
        load_dotenv(PROJECT_ROOT / ".env", override=False)
        return cls(
            environment=os.getenv("KUROHA_ENV", "development"),
            host=os.getenv("KUROHA_HOST", "127.0.0.1"),
            port=int(os.getenv("KUROHA_PORT", "8000")),
            data_dir=Path(os.getenv("KUROHA_DATA_DIR", PROJECT_ROOT / "data")).resolve(),
            log_level=os.getenv("KUROHA_LOG_LEVEL", "INFO").upper(),
            cors_origins=_split_csv(
                os.getenv(
                    "KUROHA_CORS_ORIGINS",
                    "http://127.0.0.1:5173,http://localhost:5173",
                )
            ),
            max_request_bytes=int(os.getenv("KUROHA_MAX_REQUEST_BYTES", "1048576")),
        )

    @property
    def database_path(self) -> Path:
        return self.data_dir / "kuroha.db"
