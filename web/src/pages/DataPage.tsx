import { useRef, useState } from "react";

import { backupDownloadUrl, logsDownloadUrl } from "../api/client";
import type { BackupInfo, LogEntry, StorageUsage } from "../api/types";
import { Button, bytes, Card, EmptyState } from "../components/ui";

type DataTab = "backups" | "logs";

const levels = ["ALL", "INFO", "WARNING", "ERROR"];
const levelLabels: Record<string, string> = {
  ALL: "ВСЕ",
  INFO: "INFO",
  WARNING: "WARNING",
  ERROR: "ERROR",
};

export default function DataPage({
  backups,
  usage,
  logs,
  level,
  onCreate,
  onImport,
  onRestore,
  onCleanup,
  onLevel,
  onRefreshLogs,
  onClearLogs,
}: {
  backups: BackupInfo[];
  usage: StorageUsage;
  logs: LogEntry[];
  level: string;
  onCreate: () => Promise<void>;
  onImport: (file: File) => Promise<void>;
  onRestore: (id: string) => Promise<void>;
  onCleanup: () => Promise<void>;
  onLevel: (level: string) => Promise<void>;
  onRefreshLogs: () => Promise<void>;
  onClearLogs: () => Promise<void>;
}) {
  const [tab, setTab] = useState<DataTab>("backups");
  const [busy, setBusy] = useState(false);
  const input = useRef<HTMLInputElement>(null);

  const run = async (action: () => Promise<void>) => {
    setBusy(true);
    try {
      await action();
    } finally {
      setBusy(false);
    }
  };

  return (
    <>
      <header className="topbar">
        <div>
          <span className="eyebrow">KUROHA / ДАННЫЕ</span>
          <h1>Данные и журнал</h1>
        </div>
      </header>

      <div className="section-tabs" role="tablist" aria-label="Раздел данных">
        <button className={tab === "backups" ? "active" : ""} onClick={() => setTab("backups")}>Резервные копии</button>
        <button className={tab === "logs" ? "active" : ""} onClick={() => { setTab("logs"); void onRefreshLogs(); }}>Журнал</button>
      </div>

      {tab === "backups" ? (
        <section className="stack">
          <Card className="data-summary-card">
            <div className="storage-bars">
              <div><span>База данных</span><strong>{bytes(usage.database_bytes)}</strong></div>
              <div><span>Копии</span><strong>{bytes(usage.backups_bytes)}</strong></div>
              <div><span>Журналы</span><strong>{bytes(usage.logs_bytes)}</strong></div>
              <div><span>Всего</span><strong>{bytes(usage.total_bytes)}</strong></div>
            </div>
            <div className="toolbar data-toolbar">
              <Button onClick={() => input.current?.click()} disabled={busy}>Импорт ZIP</Button>
              <Button kind="primary" onClick={() => void run(onCreate)} disabled={busy}>Создать копию</Button>
              <input
                ref={input}
                hidden
                type="file"
                accept=".zip,application/zip"
                onChange={(event) => {
                  const file = event.target.files?.[0];
                  if (file) void run(() => onImport(file));
                  event.currentTarget.value = "";
                }}
              />
            </div>
          </Card>

          <Card>
            {backups.length === 0 ? (
              <EmptyState title="Нет точек восстановления">Создайте резервную копию перед значительными изменениями.</EmptyState>
            ) : (
              <div className="backup-list">
                {backups.map((backup) => (
                  <div className="backup-row" key={backup.id}>
                    <div><strong>{backup.id}</strong><small>{bytes(backup.size_bytes)} · {new Date(backup.created_at).toLocaleString("ru-RU")}</small></div>
                    <div className="row-actions">
                      <a className="ghost link-button" href={backupDownloadUrl(backup.id)}>Скачать</a>
                      <Button disabled={busy} onClick={() => {
                        if (window.confirm("Восстановить эту резервную копию? Текущая база данных будет заменена.")) void run(() => onRestore(backup.id));
                      }}>Восстановить</Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </Card>

          <Card className="maintenance-card">
            <div>
              <span className="eyebrow">ОБСЛУЖИВАНИЕ</span>
              <h2>Очистка старых файлов</h2>
              <p className="muted">Оставить 5 последних резервных копий и удалить старые журналы.</p>
            </div>
            <Button kind="danger" disabled={busy} onClick={() => void run(onCleanup)}>Очистить</Button>
          </Card>
        </section>
      ) : (
        <Card>
          <div className="log-filters data-log-toolbar">
            {levels.map((item) => (
              <button key={item} className={level === item ? "active" : ""} onClick={() => void onLevel(item)}>{levelLabels[item]}</button>
            ))}
            <span className="toolbar-spacer" />
            <a className="ghost link-button" href={logsDownloadUrl()}>Скачать</a>
            <Button onClick={() => void onRefreshLogs()}>Обновить</Button>
            <Button kind="danger" disabled={busy} onClick={() => {
              if (!window.confirm("Очистить текущий и архивные журналы Kuroha?")) return;
              void run(onClearLogs);
            }}>Очистить</Button>
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
      )}
    </>
  );
}
