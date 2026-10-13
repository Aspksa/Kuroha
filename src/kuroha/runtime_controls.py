from __future__ import annotations

import json
import os
from pathlib import Path


RUN_KEY = r"Software\Microsoft\Windows\CurrentVersion\Run"


def write_launcher_config(data_dir: Path, values: dict[str, str]) -> None:
    data_dir.mkdir(parents=True, exist_ok=True)
    path = data_dir / "launcher.json"
    payload = {
        "launch_minimized": values.get("launch_minimized", "false") == "true",
        "minimize_to_tray": values.get("minimize_to_tray", "true") == "true",
        "check_updates_on_start": values.get("check_updates_on_start", "true") == "true",
        "preferred_api_port": int(values.get("preferred_api_port", "8000")),
    }
    path.write_text(json.dumps(payload, ensure_ascii=False, indent=2), encoding="utf-8")


def set_windows_autostart(project_root: Path, enabled: bool) -> None:
    if os.name != "nt":
        return
    import winreg

    command = f'"{project_root / "Kuroha.bat"}"'
    with winreg.OpenKey(
        winreg.HKEY_CURRENT_USER,
        RUN_KEY,
        0,
        winreg.KEY_SET_VALUE,
    ) as key:
        if enabled:
            winreg.SetValueEx(key, "Kuroha", 0, winreg.REG_SZ, command)
        else:
            try:
                winreg.DeleteValue(key, "Kuroha")
            except FileNotFoundError:
                pass
