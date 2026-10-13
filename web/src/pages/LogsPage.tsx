import { useState } from "react";

import type { LogEntry } from "../api/types";
import { logsDownloadUrl } from "../api/client";
import { Button, Card, EmptyState } from "../components/ui";

const levels = ["ALL", "INFO", "WARNING", "ERROR"];

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
        <div><span className="eyebrow">KUROHA / LOGS</span><h1>System journal</h1></div>
        <div className="toolbar">
          <a className="ghost link-button" href={logsDownloadUrl()}>Download</a>
          <Button onClick={() => void onRefresh()}>Refresh</Button>
        </div>
      </header>

      <Card>
        <div className="log-filters">
          {levels.map((item) => (
            <button key={item} className={level === item ? "active" : ""} onClick={() => void onLevel(item)}>{item}</button>
          ))}
          <Button kind="danger" disabled={busy} onClick={() => {
            if (!window.confirm("Clear current and rotated Kuroha logs?")) return;
            setBusy(true);
            void onClear().finally(() => setBusy(false));
          }}>Clear logs</Button>
        </div>

        {logs.length === 0 ? (
          <EmptyState title="No log entries">There are no entries for this filter.</EmptyState>
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
