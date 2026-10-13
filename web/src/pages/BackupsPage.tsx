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
        <div><span className="eyebrow">KUROHA / BACKUPS</span><h1>Backup & restore</h1></div>
        <div className="toolbar">
          <Button onClick={() => input.current?.click()} disabled={busy}>Import ZIP</Button>
          <Button kind="primary" onClick={() => void run(onCreate)} disabled={busy}>Create backup</Button>
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
            <div><span>Database</span><strong>{bytes(usage.database_bytes)}</strong></div>
            <div><span>Backups</span><strong>{bytes(usage.backups_bytes)}</strong></div>
            <div><span>Logs</span><strong>{bytes(usage.logs_bytes)}</strong></div>
            <div><span>Total managed</span><strong>{bytes(usage.total_bytes)}</strong></div>
          </div>
        </Card>

        <Card>
          {backups.length === 0 ? (
            <EmptyState title="No restore points">Create a backup before major changes.</EmptyState>
          ) : (
            <div className="backup-list">
              {backups.map((backup) => (
                <div className="backup-row" key={backup.id}>
                  <div><strong>{backup.id}</strong><small>{bytes(backup.size_bytes)} · {new Date(backup.created_at).toLocaleString()}</small></div>
                  <div className="row-actions">
                    <a className="ghost link-button" href={backupDownloadUrl(backup.id)}>Download</a>
                    <Button disabled={busy} onClick={() => {
                      if (window.confirm("Restore this backup? Current database will be replaced.")) void run(() => onRestore(backup.id));
                    }}>Restore</Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>

        <Card>
          <span className="eyebrow">MAINTENANCE</span>
          <h2>Clean old files</h2>
          <p className="muted">Keep the 5 newest backups and remove rotated log files.</p>
          <Button kind="danger" disabled={busy} onClick={() => void run(onCleanup)}>Clean storage</Button>
        </Card>
      </section>
    </>
  );
}
