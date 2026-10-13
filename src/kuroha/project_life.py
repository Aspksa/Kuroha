from __future__ import annotations

import re
import statistics
import subprocess
from collections import Counter
from datetime import datetime, timezone
from pathlib import Path
from typing import Any


IGNORED_PARTS = {
    ".git", ".venv", ".cache", "node_modules", "dist", "data",
    "__pycache__", ".pytest_cache", ".ruff_cache", "coverage",
}
CODE_EXTENSIONS = {
    ".py": "Python",
    ".ts": "TypeScript",
    ".tsx": "TypeScript",
    ".js": "JavaScript",
    ".jsx": "JavaScript",
    ".css": "CSS",
    ".json": "JSON",
    ".md": "Markdown",
    ".yml": "YAML",
    ".yaml": "YAML",
    ".ps1": "PowerShell",
    ".bat": "Batch",
    ".html": "HTML",
}


def _format_number(value: int | float) -> str:
    if isinstance(value, float):
        return f"{value:,.1f}".replace(",", " ")
    return f"{value:,}".replace(",", " ")


def _metric(icon: str, title: str, value: str, detail: str = "", progress: float | None = None) -> dict[str, Any]:
    return {
        "icon": icon,
        "title": title,
        "value": value,
        "detail": detail,
        "progress": progress,
    }


class ProjectLifeService:
    def __init__(self, project_root: Path) -> None:
        self.project_root = project_root.resolve()

    def _files(self) -> list[Path]:
        result: list[Path] = []
        for path in self.project_root.rglob("*"):
            if not path.is_file():
                continue
            relative = path.relative_to(self.project_root)
            if any(part in IGNORED_PARTS for part in relative.parts):
                continue
            result.append(path)
        return result

    def _git(self, *args: str, timeout: int = 20) -> str:
        result = subprocess.run(
            ["git", "-C", str(self.project_root), *args],
            capture_output=True,
            text=True,
            encoding="utf-8",
            errors="replace",
            timeout=timeout,
            check=True,
        )
        return result.stdout

    def _git_history(self) -> dict[str, Any]:
        if not (self.project_root / ".git").exists():
            return {}

        try:
            rows = [
                line.split("|", 2)
                for line in self._git("log", "--format=%aI|%s|%H").splitlines()
                if "|" in line
            ]
            commits = len(rows)
            dates = [datetime.fromisoformat(row[0]) for row in rows]
            subjects = [row[1] for row in rows]
            first = min(dates) if dates else None
            now = datetime.now(timezone.utc)
            age_days = max(1, (now - first.astimezone(timezone.utc)).days + 1) if first else 0

            day_counts = Counter(date.date().isoformat() for date in dates)
            hour_counts = Counter(date.hour for date in dates)
            weekend = sum(1 for date in dates if date.weekday() >= 5)
            night = sum(1 for date in dates if 0 <= date.hour < 6)
            russian = sum(1 for subject in subjects if re.search(r"[А-Яа-яЁё]", subject))
            fixes = sum(1 for subject in subjects if re.search(r"\b(fix|bug|hotfix|исправ)", subject, re.I))

            sorted_dates = sorted(date.astimezone(timezone.utc) for date in dates)
            gaps = [
                (right - left).total_seconds() / 60
                for left, right in zip(sorted_dates, sorted_dates[1:])
            ]
            median_gap = int(statistics.median(gaps)) if gaps else 0

            shortstat = self._git("log", "--shortstat", "--format=", timeout=30)
            added = sum(int(value) for value in re.findall(r"(\d+) insertion", shortstat))
            deleted = sum(int(value) for value in re.findall(r"(\d+) deletion", shortstat))

            changed = Counter(
                line.strip()
                for line in self._git("log", "--name-only", "--format=", timeout=30).splitlines()
                if line.strip()
            )
            hot_file, hot_edits = changed.most_common(1)[0] if changed else ("—", 0)

            active_days = sorted(set(date.date() for date in dates))
            streak = 0
            if active_days:
                streak = 1
                for previous, current in zip(reversed(active_days[:-1]), reversed(active_days[1:])):
                    if (current - previous).days == 1:
                        streak += 1
                    else:
                        break

            best_day, best_day_count = day_counts.most_common(1)[0] if day_counts else ("—", 0)
            peak_hour, _ = hour_counts.most_common(1)[0] if hour_counts else (0, 0)

            return {
                "commits": commits,
                "age_days": age_days,
                "first_commit": first.date().isoformat() if first else None,
                "added": added,
                "deleted": deleted,
                "hot_file": hot_file,
                "hot_edits": hot_edits,
                "best_day": best_day,
                "best_day_count": best_day_count,
                "weekend": weekend,
                "night": night,
                "russian": russian,
                "fixes": fixes,
                "median_gap": median_gap,
                "peak_hour": peak_hour,
                "streak": streak,
                "active_days": len(active_days),
            }
        except (OSError, subprocess.SubprocessError, ValueError):
            return {}

    def collect(self) -> dict[str, Any]:
        files = self._files()
        language_lines: Counter[str] = Counter()
        total_lines = 0
        nonempty_lines = 0
        blank_lines = 0
        comment_lines = 0
        markdown_lines = 0
        json_bytes = 0
        await_count = 0
        catch_count = 0
        todo_count = 0
        any_count = 0
        function_count = 0
        class_count = 0
        type_count = 0
        css_rules = 0
        color_values: set[str] = set()
        regex_count = 0
        test_files = 0
        test_cases = 0
        folders: set[str] = set()
        line_counts: list[tuple[int, str]] = []

        for path in files:
            relative = path.relative_to(self.project_root)
            if len(relative.parts) > 1:
                folders.add(relative.parts[0])
            language = CODE_EXTENSIONS.get(path.suffix.lower())
            if not language:
                continue
            try:
                text = path.read_text(encoding="utf-8", errors="replace")
            except OSError:
                continue

            lines = text.splitlines()
            count = len(lines)
            total_lines += count
            line_counts.append((count, relative.as_posix()))
            language_lines[language] += count
            blank_lines += sum(1 for line in lines if not line.strip())
            nonempty_lines += sum(1 for line in lines if line.strip())

            suffix = path.suffix.lower()
            if suffix == ".md":
                markdown_lines += count
            if suffix == ".json":
                try:
                    json_bytes += path.stat().st_size
                except OSError:
                    pass
            if "test" in path.name.lower() or "__tests__" in relative.parts:
                test_files += 1

            comment_lines += sum(
                1 for line in lines
                if line.strip().startswith(("#", "//", "/*", "*"))
            )
            await_count += len(re.findall(r"\bawait\b", text))
            catch_count += len(re.findall(r"\b(?:catch|except)\b", text))
            todo_count += len(re.findall(r"\b(?:TODO|FIXME)\b", text, re.I))
            any_count += len(re.findall(r"\bany\b", text)) if suffix in {".ts", ".tsx"} else 0
            function_count += len(re.findall(r"\bdef\s+\w+|\bfunction\s+\w+|\bconst\s+\w+\s*=\s*(?:async\s*)?\(", text))
            class_count += len(re.findall(r"\bclass\s+\w+", text))
            type_count += len(re.findall(r"\b(?:interface|type)\s+\w+", text)) if suffix in {".ts", ".tsx"} else 0
            test_cases += len(re.findall(r"\b(?:test|it)\s*\(|\bdef\s+test_", text))
            regex_count += len(re.findall(r"/(?:[^/\\]|\\.)+/[gimsuy]*", text)) if suffix in {".ts", ".tsx", ".js", ".jsx"} else 0
            if suffix == ".css":
                css_rules += text.count("{")
                color_values.update(re.findall(r"#[0-9a-fA-F]{3,8}\b", text))

        history = self._git_history()
        largest = max(line_counts, default=(0, "—"))
        smallest = min((item for item in line_counts if item[0] > 0), default=(0, "—"))
        avg_file = int(total_lines / len(line_counts)) if line_counts else 0
        median_file = int(statistics.median([count for count, _ in line_counts])) if line_counts else 0
        languages_total = sum(language_lines.values()) or 1
        languages = [
            {
                "name": name,
                "lines": lines,
                "percent": round(lines * 100 / languages_total, 1),
            }
            for name, lines in language_lines.most_common()
        ]

        commits = int(history.get("commits", 0))
        age_days = int(history.get("age_days", 0))
        added = int(history.get("added", 0))
        deleted = int(history.get("deleted", 0))
        change_total = max(1, added + deleted)

        sections = [
            {
                "title": "Анатомия проекта",
                "metrics": [
                    _metric("📜", "Строк родилось", _format_number(added), f"за {commits} коммитов" if commits else "Git-история недоступна"),
                    _metric("✂️", "Строк исчезло", _format_number(deleted), "удалённые строки", deleted * 100 / change_total),
                    _metric("🏋️", "Файл-гигант", f"{_format_number(largest[0])} строк", largest[1]),
                    _metric("🐜", "Самый маленький", f"{_format_number(smallest[0])} строк", smallest[1]),
                    _metric("🔥", "Горячий файл", f"{_format_number(int(history.get('hot_edits', 0)))} правок", str(history.get("hot_file", "—"))),
                    _metric("🎨", "Языки проекта", f"{len(languages)}", f"всего {_format_number(total_lines)} строк"),
                    _metric("📏", "Средний файл", f"{avg_file} строк", f"медиана: {median_file}"),
                    _metric("🗂️", "Папки", str(len(folders)), f"файлов: {len(files)}"),
                    _metric("📝", "Документация", f"{_format_number(markdown_lines)} строк", "Markdown"),
                    _metric("🗃️", "Данные JSON", f"{json_bytes / 1024 / 1024:.1f} МБ", "локальные JSON-файлы"),
                ],
            },
            {
                "title": "Жизнь и история",
                "metrics": [
                    _metric("🦊", "Возраст Kuroha", f"{age_days} дней" if age_days else "—", f"с {history.get('first_commit', 'нет Git-истории')}"),
                    _metric("☀️", "Самый продуктивный день", f"{history.get('best_day_count', 0)} коммитов", str(history.get("best_day", "—"))),
                    _metric("🔥", "Серия активности", f"{history.get('streak', 0)} дней", f"активных дней: {history.get('active_days', 0)}"),
                    _metric("🕰️", "Часы развития", f"{int(history.get('peak_hour', 0)):02d}:00", "пиковый час автора"),
                    _metric("🛋️", "Выходные", _format_number(int(history.get("weekend", 0))), "коммитов в субботу и воскресенье", int(history.get("weekend", 0)) * 100 / max(1, commits)),
                    _metric("⏱️", "Перерыв", f"{history.get('median_gap', 0)} мин", "медиана между коммитами"),
                    _metric("📮", "Коммиты по-русски", _format_number(int(history.get("russian", 0))), "русские названия", int(history.get("russian", 0)) * 100 / max(1, commits)),
                ],
            },
            {
                "title": "Надёжность и скорость",
                "metrics": [
                    _metric("🐛", "Исправления", _format_number(int(history.get("fixes", 0))), "fix/bug/исправ в истории", int(history.get("fixes", 0)) * 100 / max(1, commits)),
                    _metric("🔍", "Глубина проверок", _format_number(test_cases), f"в {test_files} тестовых файлах"),
                    _metric("🧫", "Код тестов", _format_number(test_files), f"из {len(line_counts)} файлов кода"),
                    _metric("🧷", "Слабые типы", _format_number(any_count), "вхождений any в TypeScript"),
                    _metric("📌", "Отложенные дела", _format_number(todo_count), "TODO и FIXME"),
                    _metric("🪂", "Страховки", _format_number(catch_count), "catch + except"),
                ],
            },
            {
                "title": "Код под микроскопом",
                "metrics": [
                    _metric("🧬", "Функции", _format_number(function_count), "объявления функций"),
                    _metric("🏛️", "Классы", _format_number(class_count), "объявления class"),
                    _metric("🧩", "Типы", _format_number(type_count), "interface + type"),
                    _metric("💬", "Комментарии", f"{_format_number(comment_lines)} строк", f"{comment_lines * 100 / max(1, nonempty_lines):.0f}% непустых строк"),
                    _metric("🌬️", "Воздух", f"{_format_number(blank_lines)} строк", f"{blank_lines * 100 / max(1, total_lines):.0f}% всех строк"),
                    _metric("🎨", "CSS-правила", _format_number(css_rules), f"цветов: {len(color_values)}"),
                    _metric("🔎", "Регулярные выражения", _format_number(regex_count), "шаблоны в JS/TS"),
                    _metric("⏳", "Ожидания", _format_number(await_count), "вхождений await"),
                ],
            },
        ]

        return {
            "generated_at": datetime.now(timezone.utc).isoformat(),
            "source": "git+files" if history else "files",
            "commits": commits,
            "age_days": age_days,
            "files": len(files),
            "code_lines": total_lines,
            "test_files": test_files,
            "tests": test_cases,
            "languages": languages,
            "sections": sections,
        }
