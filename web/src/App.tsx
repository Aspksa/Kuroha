import { FormEvent, useEffect, useState } from "react";

import {
  createBackup,
  getBackups,
  getDiagnostics,
  getFoundation,
  restoreBackup,
  updateSettings,
} from "./api/client";
import type {
  BackupInfo,
  Diagnostics,
  Health,
  Info,
  PublicSettings,
} from "./api/types";

type View = "overview" | "system" | "settings";

function bytes(value: number): string {
  if (value < 1024) return value + " B";
  const units = ["KB", "MB", "GB", "TB"];
  let size = value / 1024;
  let unit = units[0];
  for (let index = 1; index < units.length && size >= 1024; index += 1) {
    size /= 1024;
    unit = units[index];
  }
  return size.toFixed(size >= 10 ? 1 : 2) + " " + unit;
}

export default function App() {
  const [view, setView] = useState<View>("overview");
  const [health, setHealth] = useState<Health | null>(null);
  const [info, setInfo] = useState<Info | null>(null);
  const [diagnostics, setDiagnostics] = useState<Diagnostics | null>(null);
  const [backups, setBackups] = useState<BackupInfo[]>([]);
  const [settings, setSettings] = useState<PublicSettings>({
    site_name: "Kuroha",
    theme: "dark",
  });
  const [draftName, setDraftName] = useState("Kuroha");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [backupBusy, setBackupBusy] = useState(false);
  const [error, setError] = useState<string>();

  useEffect(() => {
    void loadFoundation();
  }, []);

  useEffect(() => {
    document.documentElement.dataset.theme = settings.theme;
  }, [settings.theme]);

  async function loadFoundation() {
    try {
      setLoading(true);
      setError(undefined);
      const foundation = await getFoundation();
      setHealth(foundation.health);
      setInfo(foundation.info);
      setSettings(foundation.settings);
      setDraftName(foundation.settings.site_name);

      const [nextDiagnostics, nextBackups] = await Promise.all([
        getDiagnostics(),
        getBackups(),
      ]);
      setDiagnostics(nextDiagnostics);
      setBackups(nextBackups);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Unknown error");
    } finally {
      setLoading(false);
    }
  }

  async function saveSettings(event: FormEvent) {
    event.preventDefault();
    try {
      setSaving(true);
      setError(undefined);
      const nextSettings = await updateSettings({
        site_name: draftName.trim(),
        theme: settings.theme,
      });
      setSettings(nextSettings);
      setDraftName(nextSettings.site_name);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Unknown error");
    } finally {
      setSaving(false);
    }
  }

  async function makeBackup() {
    try {
      setBackupBusy(true);
      setError(undefined);
      await createBackup();
      setBackups(await getBackups());
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Unknown error");
    } finally {
      setBackupBusy(false);
    }
  }

  async function restore(id: string) {
    if (!window.confirm("Restore this backup? Current database will be replaced.")) return;
    try {
      setBackupBusy(true);
      setError(undefined);
      await restoreBackup(id);
      await loadFoundation();
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Unknown error");
    } finally {
      setBackupBusy(false);
    }
  }

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <div className="brand">
          <span className="brand-mark">K</span>
          <div>
            <strong>{settings.site_name}</strong>
            <small>Foundation</small>
          </div>
        </div>

        <nav aria-label="Primary">
          <button className={view === "overview" ? "active" : ""} onClick={() => setView("overview")}>
            Overview
          </button>
          <button className={view === "system" ? "active" : ""} onClick={() => setView("system")}>
            System
          </button>
          <button className={view === "settings" ? "active" : ""} onClick={() => setView("settings")}>
            Settings
          </button>
        </nav>

        <div className="sidebar-status">
          <i className={health ? "online" : "offline"} />
          <span>{health ? "Core online" : "Core offline"}</span>
        </div>
      </aside>

      <main className="content">
        <header className="topbar">
          <div>
            <span className="eyebrow">KUROHA / PLATFORM</span>
            <h1>
              {view === "overview"
                ? "Project foundation"
                : view === "system"
                  ? "System diagnostics"
                  : "Settings & backups"}
            </h1>
          </div>
          <button className="ghost" onClick={() => void loadFoundation()} disabled={loading}>
            {loading ? "Checking…" : "Refresh"}
          </button>
        </header>

        {error && <div className="alert">{error}</div>}

        {view === "overview" && (
          <section className="grid">
            <article className="hero card">
              <span className="eyebrow">CURRENT STAGE</span>
              <h2>Stable shell before intelligence.</h2>
              <p>
                Kuroha has persistent storage, managed schema migrations,
                diagnostics, backups, portable startup and a hardened local web stack.
              </p>
            </article>

            <article className="card metric">
              <span>Version</span>
              <strong>{info?.version ?? "—"}</strong>
              <small>Platform release</small>
            </article>
            <article className="card metric">
              <span>Schema</span>
              <strong>v{diagnostics?.database_schema_version ?? "—"}</strong>
              <small>SQLite migration level</small>
            </article>
            <article className="card metric">
              <span>Backups</span>
              <strong>{backups.length}</strong>
              <small>Local restore points</small>
            </article>
          </section>
        )}

        {view === "system" && (
          <section className="stack">
            <article className="card">
              <div className="section-heading">
                <div>
                  <span className="eyebrow">RUNTIME</span>
                  <h2>Diagnostics</h2>
                </div>
                <span className={"pill " + (health ? "ok" : "bad")}>
                  {health ? "Operational" : "Unavailable"}
                </span>
              </div>
              <dl className="details">
                <div><dt>Kuroha</dt><dd>{health?.version ?? "—"}</dd></div>
                <div><dt>Python</dt><dd>{diagnostics?.python_version ?? "—"}</dd></div>
                <div><dt>Node</dt><dd>{diagnostics?.node_version ?? "not detected"}</dd></div>
                <div><dt>Platform</dt><dd>{diagnostics?.platform ?? "—"}</dd></div>
                <div><dt>Environment</dt><dd>{diagnostics?.environment ?? "—"}</dd></div>
                <div><dt>Port</dt><dd>{diagnostics?.port ?? "—"}</dd></div>
              </dl>
            </article>

            <article className="card">
              <span className="eyebrow">STORAGE</span>
              <dl className="details">
                <div><dt>Database</dt><dd>{diagnostics?.database_path ?? "—"}</dd></div>
                <div><dt>Size</dt><dd>{diagnostics ? bytes(diagnostics.database_size_bytes) : "—"}</dd></div>
                <div><dt>Schema</dt><dd>v{diagnostics?.database_schema_version ?? "—"}</dd></div>
                <div><dt>Journal</dt><dd>{diagnostics?.database_journal_mode ?? "—"}</dd></div>
                <div><dt>Integrity</dt><dd>{diagnostics?.database_integrity ?? "—"}</dd></div>
                <div><dt>Writable</dt><dd>{diagnostics?.data_dir_writable ? "yes" : "no"}</dd></div>
                <div><dt>Disk free</dt><dd>{diagnostics ? bytes(diagnostics.disk_free_bytes) : "—"}</dd></div>
              </dl>
            </article>

            <article className="card">
              <span className="eyebrow">CAPABILITIES</span>
              <div className="chips">
                {(info?.capabilities ?? []).map((capability) => (
                  <span key={capability}>{capability}</span>
                ))}
              </div>
            </article>
          </section>
        )}

        {view === "settings" && (
          <section className="stack">
            <form className="card settings-form" onSubmit={saveSettings}>
              <div>
                <span className="eyebrow">LOCAL SETTINGS</span>
                <h2>Appearance</h2>
              </div>

              <label>
                Site name
                <input
                  maxLength={80}
                  value={draftName}
                  onChange={(event) => setDraftName(event.target.value)}
                />
              </label>

              <fieldset>
                <legend>Theme</legend>
                <div className="theme-options">
                  {(["dark", "light"] as const).map((theme) => (
                    <button
                      className={settings.theme === theme ? "selected" : ""}
                      key={theme}
                      type="button"
                      onClick={() => setSettings((current) => ({ ...current, theme }))}
                    >
                      {theme}
                    </button>
                  ))}
                </div>
              </fieldset>

              <button className="primary" disabled={saving || !draftName.trim()} type="submit">
                {saving ? "Saving…" : "Save settings"}
              </button>
            </form>

            <article className="card">
              <div className="section-heading">
                <div>
                  <span className="eyebrow">DATABASE</span>
                  <h2>Backup & restore</h2>
                </div>
                <button className="ghost" disabled={backupBusy} onClick={() => void makeBackup()}>
                  {backupBusy ? "Working…" : "Create backup"}
                </button>
              </div>

              {backups.length === 0 ? (
                <p className="muted">No backups created yet.</p>
              ) : (
                <div className="backup-list">
                  {backups.map((backup) => (
                    <div className="backup-row" key={backup.id}>
                      <div>
                        <strong>{backup.id}</strong>
                        <small>{bytes(backup.size_bytes)} · {new Date(backup.created_at).toLocaleString()}</small>
                      </div>
                      <button className="ghost" disabled={backupBusy} onClick={() => void restore(backup.id)}>
                        Restore
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </article>
          </section>
        )}
      </main>
    </div>
  );
}
