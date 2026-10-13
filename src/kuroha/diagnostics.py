from __future__ import annotations

import platform
import shutil
import subprocess
import sys
import tempfile
from pathlib import Path

from kuroha.config import Settings
from kuroha.storage import SQLiteStore


def _node_version() -> str | None:
    try:
        result = subprocess.run(
            ["node", "--version"],
            check=True,
            capture_output=True,
            text=True,
            timeout=2,
        )
    except (OSError, subprocess.SubprocessError):
        return None
    return result.stdout.strip() or None


def _writable(path: Path) -> bool:
    try:
        path.mkdir(parents=True, exist_ok=True)
        with tempfile.NamedTemporaryFile(dir=path, delete=True):
            return True
    except OSError:
        return False


def collect_diagnostics(settings: Settings, store: SQLiteStore) -> dict[str, object]:
    usage = shutil.disk_usage(settings.data_dir)
    return {
        "python_version": platform.python_version(),
        "python_executable": sys.executable,
        "node_version": _node_version(),
        "platform": platform.platform(),
        "project_root": str(settings.project_root),
        "data_dir": str(settings.data_dir),
        "database_path": str(settings.database_path),
        "database_size_bytes": store.database_size(),
        "database_schema_version": store.schema_version(),
        "database_journal_mode": store.journal_mode(),
        "database_integrity": store.integrity_check(),
        "data_dir_writable": _writable(settings.data_dir),
        "disk_free_bytes": usage.free,
        "disk_total_bytes": usage.total,
        "environment": settings.environment,
        "host": settings.host,
        "port": settings.port,
    }
