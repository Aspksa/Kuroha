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

function Icon({ name }: { name: "overview" | "system" | "settings" | "refresh" | "backup" }) {
  const paths = {
    overview: "M4 13h6V4H4v9Zm10 7h6v-9h-6v9ZM4 20h6v-3H4v3Zm10-13h6V4h-6v3Z",
    system: "M12 8a4 4 0 1 0 0 8 4 4 0 0 0 0-8Zm9 4-2.05-.78a7.85 7.85 0 0 0-.53-1.28l.9-2-2.26-2.26-2 .9a7.85 7.85 0 0 0-1.28-.53L13 4h-2l-.78 2.05c-.45.14-.88.32-1.28.53l-2-.9L4.68 7.94l.9 2c-.21.4-.39.83-.53 1.28L3 12v2l2.05.78c.14.45.32.88.53 1.28l-.9 2 2.26 2.26 2-.9c.4.21.83.39 1.28.53L11 22h2l.78-2.05c.45-.14.88-.32 1.28-.53l2 .9 2.26-2.26-.9-2c.21-.4.39-.83.53-1.28L21 14v-2Z",
    settings: "M4 5h10v2H4V5Zm0 12h16v2H4v-2Zm12-6h4v2h-4v-2ZM8 3h2v6H8V3Zm4 6h2v6h-2V9Zm4 6h2v6h-2v-6Z",
    refresh: "M17.65 6.35A7.95 7.95 0 0 0 12 4a8 8 0 1 0 7.75 10h-2.1A6 6 0 1 1 12 6c1.3 0 2.5.42 3.47 1.13L13 9.6V11h7V4h-1.4l-.95 2.35Z",
    backup: "M12 3 5 7v4c0 4.97 2.99 9.62 7 11 4.01-1.38 7-6.03 7-11V7l-7-4Zm0 4a4 4 0 0 1 4 4h-2.1a2 2 0 1 0-.59 1.41L12 11h4v4l-1.24-1.24A4 4 0 1 1 12 7Z",
  };

  return (
    <svg aria-hidden="true" viewBox="0 0 24 24">
      <path d={paths[name]} />
    </svg>
  );
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

  const navigation: Array<{ id: View; label: string; icon: "overview" | "system" | "settings" }> = [
    { id: "overview", label: "Overview", icon: "overview" },
    { id: "system", label: "System", icon: "system" },
    { id: "settings", label: "Settings", icon: "settings" },
  ];

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <div className="brand">
          <span className="brand-mark" aria-hidden="true">
            <span className="brand-moon" />
            <span className="brand-tail tail-one" />
            <span className="brand-tail tail-two" />
            <span className="brand-tail tail-three" />
          </span>
          <div className="brand-copy">
            <strong>{settings.site_name}</strong>
            <small>黒羽 · FOUNDATION</small>
          </div>
        </div>

        <nav aria-label="Primary">
          {navigation.map((item) => (
            <button
              key={item.id}
              className={view === item.id ? "active" : ""}
              onClick={() => setView(item.id)}
            >
              <Icon name={item.icon} />
              <span>{item.label}</span>
            </button>
          ))}
        </nav>

        <div className="sidebar-status">
          <span className={health ? "status-orb online" : "status-orb offline"} />
          <div>
            <strong>{health ? "Core online" : "Core offline"}</strong>
            <small>{health ? "All local systems nominal" : "Connection unavailable"}</small>
          </div>
        </div>
      </aside>

      <main className="content">
        <div className="ambient ambient-one" />
        <div className="ambient ambient-two" />

        <header className="topbar">
          <div>
            <span className="eyebrow">KUROHA / LOCAL PLATFORM</span>
            <h1>
              {view === "overview"
                ? "Command center"
                : view === "system"
                  ? "System diagnostics"
                  : "Settings & backups"}
            </h1>
          </div>
          <button className="ghost icon-button" onClick={() => void loadFoundation()} disabled={loading}>
            <Icon name="refresh" />
            <span>{loading ? "Checking…" : "Refresh"}</span>
          </button>
        </header>

        {error && <div className="alert">{error}</div>}

        {view === "overview" && (
          <section className="grid">
            <article className="hero card">
              <div className="hero-copy">
                <span className="eyebrow">KUROHA FOUNDATION · {info?.version ?? "—"}</span>
                <h2>Quiet power.<br />Stable foundation.</h2>
                <p>
                  A local-first platform engineered for persistence, portability,
                  observability and controlled growth.
                </p>
                <div className="hero-meta">
                  <span><i className="meta-dot" />Local runtime</span>
                  <span>SQLite WAL</span>
                  <span>Portable Windows</span>
                </div>
              </div>
              <div className="hero-sigil" aria-hidden="true">
                <div className="sigil-ring ring-one" />
                <div className="sigil-ring ring-two" />
                <div className="sigil-core">K</div>
              </div>
            </article>

            <article className="card metric">
              <span className="metric-label">Platform version</span>
              <strong>{info?.version ?? "—"}</strong>
              <small>Current local release</small>
            </article>
            <article className="card metric">
              <span className="metric-label">Database schema</span>
              <strong>v{diagnostics?.database_schema_version ?? "—"}</strong>
              <small>Migration level</small>
            </article>
            <article className="card metric">
              <span className="metric-label">Restore points</span>
              <strong>{backups.length}</strong>
              <small>Local backups available</small>
            </article>

            <article className="card system-glance">
              <div>
                <span className="eyebrow">SYSTEM GLANCE</span>
                <h2>Everything important, at a glance.</h2>
              </div>
              <div className="glance-grid">
                <div><span>Runtime</span><strong>Python {diagnostics?.python_version ?? "—"}</strong></div>
                <div><span>Database</span><strong>{diagnostics?.database_integrity === "ok" ? "Healthy" : "Unknown"}</strong></div>
                <div><span>Disk free</span><strong>{diagnostics ? bytes(diagnostics.disk_free_bytes) : "—"}</strong></div>
                <div><span>Environment</span><strong>{diagnostics?.environment ?? "—"}</strong></div>
              </div>
            </article>
          </section>
        )}

        {view === "system" && (
          <section className="stack">
            <article className="card status-card">
              <div className="section-heading">
                <div>
                  <span className="eyebrow">RUNTIME STATUS</span>
                  <h2>Core diagnostics</h2>
                </div>
                <span className={"pill " + (health ? "ok" : "bad")}>
                  <span className="pill-dot" />
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

            <div className="two-column">
              <article className="card">
                <span className="eyebrow">STORAGE</span>
                <dl className="details compact">
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
                <div className="path-block">
                  <span>Database path</span>
                  <code>{diagnostics?.database_path ?? "—"}</code>
                </div>
              </article>
            </div>
          </section>
        )}

        {view === "settings" && (
          <section className="stack">
            <form className="card settings-form" onSubmit={saveSettings}>
              <div className="section-heading">
                <div>
                  <span className="eyebrow">LOCAL SETTINGS</span>
                  <h2>Appearance</h2>
                </div>
                <span className="settings-badge">Stored locally</span>
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
                      <span className={"theme-preview " + theme} />
                      <span>{theme}</span>
                    </button>
                  ))}
                </div>
              </fieldset>

              <button className="primary" disabled={saving || !draftName.trim()} type="submit">
                {saving ? "Saving…" : "Save settings"}
              </button>
            </form>

            <article className="card backup-card">
              <div className="section-heading">
                <div>
                  <span className="eyebrow">DATABASE SAFETY</span>
                  <h2>Backup & restore</h2>
                </div>
                <button className="ghost icon-button" disabled={backupBusy} onClick={() => void makeBackup()}>
                  <Icon name="backup" />
                  <span>{backupBusy ? "Working…" : "Create backup"}</span>
                </button>
              </div>

              {backups.length === 0 ? (
                <div className="empty-state">
                  <Icon name="backup" />
                  <strong>No backups yet</strong>
                  <p>Create a local restore point before major changes.</p>
                </div>
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
