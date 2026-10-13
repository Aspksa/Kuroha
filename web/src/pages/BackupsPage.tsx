import { useRef, useState } from "react";

import type { BackupInfo, StorageUsage } from "../api/types";
import { backupDownloadUrl } from "../api/client";
import { Button, bytes, Card, EmptyState } from "../components/ui";

export default function BackupsPage({
  backups,
  usage,
  onCreate,
  onImport,
  onRestore,
  onCleanup,
}: {
  backups: BackupInfo[];
  usage: StorageUsage;
  onCreate: () => Promise<void>;
  onImport: (file: File) => Promise<void>;
  onRestore: (id: string) => Promise<void>;
  onCleanup: () => Promise<void>;
}) {
  const [busy, setBusy] = useState(false);
  const input = useRef<HTMLInputElement>(null);

  const run = async (action: () => Promise<void>) => {
    setBusy(true);
    try { await action(); } finally { setBusy(false); }
  };

  return (
    <>
      <header className="topbar">
        <div><span className="eyebrow">KUROHA / РЕЗЕРВНЫЕ КОПИИ</span><h1>Резервное копирование</h1></div>
        <div className="toolbar">
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
      </header>

      <section className="stack">
        <Card>
          <div className="storage-bars">
            <div><span>База данных</span><strong>{bytes(usage.database_bytes)}</strong></div>
            <div><span>Резервные копии</span><strong>{bytes(usage.backups_bytes)}</strong></div>
            <div><span>Журналы</span><strong>{bytes(usage.logs_bytes)}</strong></div>
            <div><span>Всего занято</span><strong>{bytes(usage.total_bytes)}</strong></div>
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

        <Card>
          <span className="eyebrow">ОБСЛУЖИВАНИЕ</span>
          <h2>Очистка старых файлов</h2>
          <p className="muted">Сохранить 5 последних резервных копий и удалить старые файлы журналов.</p>
          <Button kind="danger" disabled={busy} onClick={() => void run(onCleanup)}>Очистить хранилище</Button>
        </Card>
      </section>
    </>
  );
}
