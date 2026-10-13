import { useState } from "react";

import type { LogEntry } from "../api/types";
import { logsDownloadUrl } from "../api/client";
import { Button, Card, EmptyState } from "../components/ui";

const levels = ["ALL", "INFO", "WARNING", "ERROR"];
const levelLabels: Record<string, string> = {
  ALL: "ВСЕ",
  INFO: "INFO",
  WARNING: "WARNING",
  ERROR: "ERROR",
};

export default function LogsPage({
  logs,
  level,
  onLevel,
  onRefresh,
  onClear,
}: {
  logs: LogEntry[];
  level: string;
  onLevel: (level: string) => Promise<void>;
  onRefresh: () => Promise<void>;
  onClear: () => Promise<void>;
}) {
  const [busy, setBusy] = useState(false);

  return (
    <>
      <header className="topbar">
        <div><span className="eyebrow">KUROHA / ЖУРНАЛ</span><h1>Системный журнал</h1></div>
        <div className="toolbar">
          <a className="ghost link-button" href={logsDownloadUrl()}>Скачать</a>
          <Button onClick={() => void onRefresh()}>Обновить</Button>
        </div>
      </header>

      <Card>
        <div className="log-filters">
          {levels.map((item) => (
            <button key={item} className={level === item ? "active" : ""} onClick={() => void onLevel(item)}>{levelLabels[item]}</button>
          ))}
          <Button kind="danger" disabled={busy} onClick={() => {
            if (!window.confirm("Очистить текущий и архивные журналы Kuroha?")) return;
            setBusy(true);
            void onClear().finally(() => setBusy(false));
          }}>Очистить журнал</Button>
        </div>

        {logs.length === 0 ? (
          <EmptyState title="Записей нет">Для выбранного фильтра нет записей.</EmptyState>
        ) : (
          <div className="log-list">
            {logs.map((entry, index) => (
              <code key={index} className={"log-line " + entry.level.toLowerCase()}>
                <span>{entry.level}</span>{entry.raw}
              </code>
            ))}
          </div>
        )}
      </Card>
    </>
  );
}
