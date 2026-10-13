from __future__ import annotations

import json
import shutil
import zipfile
from pathlib import Path

import pytest

from kuroha.updater import UpdateService


REMOTE_SHA = "b" * 40


def _branch_payload() -> dict[str, object]:
    return {
        "commit": {
            "sha": REMOTE_SHA,
            "commit": {"message": "test update\nmore details"},
        }
    }


def _make_archive(path: Path) -> None:
    with zipfile.ZipFile(path, "w", zipfile.ZIP_DEFLATED) as archive:
        root = "Kuroha-test/"
        archive.writestr(root + "pyproject.toml", "[project]\nname='kuroha'\n")
        archive.writestr(root + "Kuroha.bat", "@echo off\n")
        archive.writestr(root + "src/kuroha/__init__.py", "__version__='9.9.9'\n")
        archive.writestr(root + "web/package.json", '{"name":"kuroha-web"}')


def test_update_check_without_local_state_marks_sync_needed(
    tmp_path: Path,
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    project = tmp_path / "Куроха проект"
    project.mkdir()
    service = UpdateService(project, tmp_path / "data")
    monkeypatch.setattr(service, "_fetch_json", lambda _: _branch_payload())

    status = service.check()

    assert status["remote_sha"] == REMOTE_SHA
    assert status["installed_sha"] is None
    assert status["update_available"] is True
    assert status["git_checkout"] is False


def test_prepare_downloads_exact_sha_and_validates_archive(
    tmp_path: Path,
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    project = tmp_path / "Куроха проект"
    project.mkdir()
    service = UpdateService(project, tmp_path / "data")
    monkeypatch.setattr(service, "_fetch_json", lambda _: _branch_payload())

    requested: list[str] = []

    def fake_download(destination: Path, sha: str) -> None:
        requested.append(sha)
        archive = tmp_path / "source.zip"
        _make_archive(archive)
        shutil.copy2(archive, destination)

    monkeypatch.setattr(service, "_download_archive", fake_download)

    status = service.prepare()

    assert requested == [REMOTE_SHA]
    assert status["prepared"] is True
    prepared = json.loads(service.prepared_file.read_text(encoding="utf-8"))
    assert prepared["sha"] == REMOTE_SHA
    assert (Path(prepared["source"]) / "Kuroha.bat").is_file()


def test_installed_state_prevents_reoffering_same_commit(
    tmp_path: Path,
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    project = tmp_path / "Kuroha"
    project.mkdir()
    service = UpdateService(project, tmp_path / "data")
    service.update_dir.mkdir(parents=True)
    service.state_file.write_text(
        json.dumps({"installed_sha": REMOTE_SHA}),
        encoding="utf-8",
    )
    monkeypatch.setattr(service, "_fetch_json", lambda _: _branch_payload())

    status = service.check()

    assert status["installed_sha"] == REMOTE_SHA
    assert status["update_available"] is False


def test_apply_is_blocked_for_git_checkout(tmp_path: Path) -> None:
    project = tmp_path / "Kuroha"
    (project / ".git").mkdir(parents=True)
    service = UpdateService(project, tmp_path / "data")

    with pytest.raises(ValueError, match="Git-клона"):
        service.apply()


def test_update_history_lists_source_backups(tmp_path: Path) -> None:
    project = tmp_path / "Kuroha"
    project.mkdir()
    service = UpdateService(project, tmp_path / "data")
    backup_dir = service.update_dir / "backups"
    backup_dir.mkdir(parents=True)
    archive = backup_dir / "source-before-20261013T120000Z.zip"
    with zipfile.ZipFile(archive, "w") as handle:
        handle.writestr("README.md", "old")

    history = service.list_backups()

    assert len(history) == 1
    assert history[0]["filename"] == archive.name
    assert history[0]["size_bytes"] > 0


def test_update_check_exposes_changelog(
    tmp_path: Path,
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    project = tmp_path / "Kuroha"
    project.mkdir()
    service = UpdateService(project, tmp_path / "data")
    service.update_dir.mkdir(parents=True)
    service.state_file.write_text(
        json.dumps({"installed_sha": "a" * 40}),
        encoding="utf-8",
    )

    def fake_json(url: str) -> dict[str, object]:
        if "/compare/" in url:
            return {
                "commits": [
                    {"commit": {"message": "feat: one\nbody"}},
                    {"commit": {"message": "fix: two"}},
                ]
            }
        return _branch_payload()

    monkeypatch.setattr(service, "_fetch_json", fake_json)

    status = service.check()

    assert status["changelog"] == ["feat: one", "fix: two"]


def test_update_preferences_store_token_without_exposing_it(tmp_path: Path) -> None:
    project = tmp_path / "Kuroha"
    project.mkdir()
    service = UpdateService(project, tmp_path / "data")

    preferences = service.save_preferences(
        channel="stable",
        auto_check="hourly",
        token="secret-token",
    )

    assert preferences == {
        "channel": "stable",
        "auto_check": "hourly",
        "token_saved": True,
    }
    assert service.token_file.read_text(encoding="utf-8") == "secret-token"
    assert "secret-token" not in json.dumps(service.preferences())


def test_stable_channel_resolves_latest_release_sha(
    tmp_path: Path,
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    project = tmp_path / "Kuroha"
    project.mkdir()
    service = UpdateService(project, tmp_path / "data")
    service.save_preferences(channel="stable", auto_check="daily")

    def fake_json(url: str) -> dict[str, object]:
        if url.endswith("/releases/latest"):
            return {"tag_name": "v0.8.0", "name": "Kuroha 0.8.0"}
        if "/commits/v0.8.0" in url:
            return {"sha": REMOTE_SHA}
        if "/compare/" in url:
            return {"commits": []}
        raise AssertionError(url)

    monkeypatch.setattr(service, "_fetch_json", fake_json)

    status = service.check()

    assert status["remote_sha"] == REMOTE_SHA
    assert status["branch"] == "v0.8.0"
    assert status["channel"] == "stable"
