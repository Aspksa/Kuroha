from __future__ import annotations

import json
import os
import shutil
import subprocess
import sys
import tempfile
import threading
import urllib.request
import zipfile
from datetime import datetime, timezone
from pathlib import Path
from typing import Any

from kuroha import __version__


REPOSITORY = "Aspksa/Kuroha"
BRANCH = "main"
REPOSITORY_URL = "https://github.com/Aspksa/Kuroha"
BRANCH_API_URL = f"https://api.github.com/repos/{REPOSITORY}/branches/{BRANCH}"
ARCHIVE_URL = f"https://github.com/{REPOSITORY}/archive/refs/heads/{BRANCH}.zip"
MAX_ARCHIVE_BYTES = 128 * 1024 * 1024
MAX_EXTRACTED_BYTES = 256 * 1024 * 1024


_HELPER = r'''
from __future__ import annotations

import json
import os
import shutil
import subprocess
import sys
import time
import zipfile
from datetime import datetime, timezone
from pathlib import Path


project = Path(sys.argv[1]).resolve()
source = Path(sys.argv[2]).resolve()
state_file = Path(sys.argv[3]).resolve()
target_sha = sys.argv[4]
parent_pid = int(sys.argv[5])
log_file = state_file.parent / "update.log"
backup_dir = state_file.parent / "backups"
backup_dir.mkdir(parents=True, exist_ok=True)

managed_dirs = [".github", "docs", "src", "tests", "web"]
ignored_parts = {".git", ".venv", ".cache", "data", "node_modules", "dist", "__pycache__"}


def log(message: str) -> None:
    stamp = datetime.now(timezone.utc).isoformat()
    with log_file.open("a", encoding="utf-8") as handle:
        handle.write(f"{stamp} {message}\n")


def wait_for_parent() -> None:
    deadline = time.time() + 30
    while time.time() < deadline:
        try:
            os.kill(parent_pid, 0)
        except OSError:
            return
        time.sleep(0.25)
    log("parent process wait timed out; continuing update")


def backup_current() -> None:
    stamp = datetime.now(timezone.utc).strftime("%Y%m%dT%H%M%SZ")
    archive = backup_dir / f"source-before-{stamp}.zip"
    with zipfile.ZipFile(archive, "w", zipfile.ZIP_DEFLATED) as output:
        for directory in managed_dirs:
            root = project / directory
            if not root.exists():
                continue
            for path in root.rglob("*"):
                if not path.is_file():
                    continue
                relative = path.relative_to(project)
                if any(part in ignored_parts for part in relative.parts):
                    continue
                output.write(path, relative.as_posix())
        for path in project.iterdir():
            if path.is_file() and path.name != ".env":
                output.write(path, path.name)
    log(f"backup created: {archive.name}")


def apply_files() -> None:
    for directory in managed_dirs:
        destination = project / directory
        incoming = source / directory
        if destination.exists():
            shutil.rmtree(destination)
        if incoming.exists():
            shutil.copytree(incoming, destination)

    for incoming in source.iterdir():
        if not incoming.is_file() or incoming.name == ".env":
            continue
        shutil.copy2(incoming, project / incoming.name)

    state_file.parent.mkdir(parents=True, exist_ok=True)
    state_file.write_text(
        json.dumps(
            {
                "installed_sha": target_sha,
                "updated_at": datetime.now(timezone.utc).isoformat(),
            },
            ensure_ascii=False,
            indent=2,
        ),
        encoding="utf-8",
    )
    log(f"update applied: {target_sha}")


def restart() -> None:
    launcher = project / "Kuroha.bat"
    if os.name == "nt" and launcher.exists():
        os.startfile(str(launcher))
        log("Kuroha.bat restart requested")
    else:
        log("automatic restart skipped on non-Windows platform")


try:
    log(f"update helper started for {target_sha}")
    wait_for_parent()
    backup_current()
    apply_files()
    restart()
except Exception as exc:
    log(f"update failed: {type(exc).__name__}: {exc}")
    raise
'''


class UpdateService:
    def __init__(self, project_root: Path, data_dir: Path) -> None:
        self.project_root = project_root.resolve()
        self.update_dir = data_dir.resolve() / "updates"
        self.stage_dir = self.update_dir / "staged"
        self.state_file = self.update_dir / "state.json"
        self.prepared_file = self.update_dir / "prepared.json"

    def _request(self, url: str) -> urllib.request.Request:
        return urllib.request.Request(
            url,
            headers={
                "Accept": "application/vnd.github+json",
                "User-Agent": f"Kuroha/{__version__}",
            },
        )

    def _fetch_json(self, url: str) -> dict[str, Any]:
        with urllib.request.urlopen(self._request(url), timeout=10) as response:
            return json.loads(response.read().decode("utf-8"))

    def _installed_sha(self) -> str | None:
        git_dir = self.project_root / ".git"
        if git_dir.exists():
            try:
                result = subprocess.run(
                    ["git", "-C", str(self.project_root), "rev-parse", "HEAD"],
                    capture_output=True,
                    text=True,
                    check=True,
                    timeout=3,
                )
                sha = result.stdout.strip()
                if sha:
                    return sha
            except (OSError, subprocess.SubprocessError):
                pass

        try:
            payload = json.loads(self.state_file.read_text(encoding="utf-8"))
            sha = str(payload.get("installed_sha", "")).strip()
            return sha or None
        except (OSError, ValueError, TypeError):
            return None

    def _prepared(self) -> dict[str, Any] | None:
        try:
            payload = json.loads(self.prepared_file.read_text(encoding="utf-8"))
            source = Path(str(payload["source"])).resolve()
            if source.is_dir() and source.is_relative_to(self.stage_dir.resolve()):
                return payload
        except (OSError, ValueError, KeyError, TypeError):
            pass
        return None

    def check(self) -> dict[str, Any]:
        payload = self._fetch_json(BRANCH_API_URL)
        remote_sha = str(payload["commit"]["sha"])
        commit = payload["commit"].get("commit", {})
        installed_sha = self._installed_sha()
        prepared = self._prepared()
        return {
            "current_version": __version__,
            "installed_sha": installed_sha,
            "remote_sha": remote_sha,
            "update_available": installed_sha != remote_sha,
            "prepared": bool(prepared and prepared.get("sha") == remote_sha),
            "repository_url": REPOSITORY_URL,
            "branch": BRANCH,
            "commit_message": str(commit.get("message", "")).splitlines()[0],
            "checked_at": datetime.now(timezone.utc).isoformat(),
        }

    def _download_archive(self, destination: Path) -> None:
        with urllib.request.urlopen(self._request(ARCHIVE_URL), timeout=30) as response:
            total = 0
            with destination.open("wb") as output:
                while chunk := response.read(1024 * 1024):
                    total += len(chunk)
                    if total > MAX_ARCHIVE_BYTES:
                        raise ValueError("архив обновления слишком большой")
                    output.write(chunk)

    def prepare(self) -> dict[str, Any]:
        status = self.check()
        remote_sha = str(status["remote_sha"])
        self.update_dir.mkdir(parents=True, exist_ok=True)
        self.stage_dir.mkdir(parents=True, exist_ok=True)

        existing = self._prepared()
        if existing and existing.get("sha") == remote_sha:
            return {**status, "prepared": True}

        target = self.stage_dir / remote_sha
        if target.exists():
            shutil.rmtree(target)
        target.mkdir(parents=True)

        with tempfile.TemporaryDirectory(dir=self.update_dir) as temp_dir:
            archive_path = Path(temp_dir) / "update.zip"
            self._download_archive(archive_path)
            with zipfile.ZipFile(archive_path) as archive:
                total_size = sum(item.file_size for item in archive.infolist())
                if total_size > MAX_EXTRACTED_BYTES:
                    raise ValueError("распакованный архив обновления слишком большой")
                for item in archive.infolist():
                    path = Path(item.filename)
                    if path.is_absolute() or ".." in path.parts:
                        raise ValueError("архив обновления содержит небезопасный путь")
                archive.extractall(target)

        candidates = [
            path
            for path in target.iterdir()
            if path.is_dir()
            and (path / "pyproject.toml").is_file()
            and (path / "Kuroha.bat").is_file()
            and (path / "src" / "kuroha").is_dir()
            and (path / "web" / "package.json").is_file()
        ]
        if len(candidates) != 1:
            shutil.rmtree(target, ignore_errors=True)
            raise ValueError("структура архива обновления не распознана")

        source = candidates[0].resolve()
        prepared = {
            "sha": remote_sha,
            "source": str(source),
            "prepared_at": datetime.now(timezone.utc).isoformat(),
        }
        self.prepared_file.write_text(
            json.dumps(prepared, ensure_ascii=False, indent=2),
            encoding="utf-8",
        )
        return {**status, "prepared": True}

    def apply(self) -> dict[str, Any]:
        prepared = self._prepared()
        if not prepared:
            raise ValueError("обновление сначала нужно подготовить")

        target_sha = str(prepared["sha"])
        source = Path(str(prepared["source"])).resolve()
        if not source.is_dir():
            raise ValueError("подготовленные файлы обновления не найдены")

        self.update_dir.mkdir(parents=True, exist_ok=True)
        helper = self.update_dir / "apply_update.py"
        helper.write_text(_HELPER, encoding="utf-8")

        kwargs: dict[str, Any] = {
            "cwd": str(self.project_root),
            "stdin": subprocess.DEVNULL,
            "stdout": subprocess.DEVNULL,
            "stderr": subprocess.DEVNULL,
            "close_fds": True,
        }
        if os.name == "nt":
            kwargs["creationflags"] = (
                subprocess.CREATE_NEW_PROCESS_GROUP | subprocess.DETACHED_PROCESS
            )

        subprocess.Popen(
            [
                sys.executable,
                str(helper),
                str(self.project_root),
                str(source),
                str(self.state_file),
                target_sha,
                str(os.getpid()),
            ],
            **kwargs,
        )

        if os.getenv("KUROHA_DISABLE_UPDATE_SHUTDOWN") != "1":
            threading.Timer(1.0, lambda: os._exit(0)).start()

        return {
            "accepted": True,
            "target_sha": target_sha,
            "message": "Обновление запущено. Kuroha будет перезапущена автоматически.",
        }
