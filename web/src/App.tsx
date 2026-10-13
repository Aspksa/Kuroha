import { FormEvent, useEffect, useState } from "react";

type View = "overview" | "system" | "settings";

type Health = {
  status: "ok";
  version: string;
  environment: string;
};

type Info = {
  name: string;
  version: string;
  api_version: string;
  capabilities: string[];
};

type PublicSettings = {
  site_name: string;
  theme: "dark" | "light";
};

export default function App() {
  const [view, setView] = useState<View>("overview");
  const [health, setHealth] = useState<Health | null>(null);
  const [info, setInfo] = useState<Info | null>(null);
  const [settings, setSettings] = useState<PublicSettings>({
    site_name: "Kuroha",
    theme: "dark",
  });
  const [draftName, setDraftName] = useState("Kuroha");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
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
      const [healthResponse, infoResponse, settingsResponse] = await Promise.all([
        fetch("/api/v1/health"),
        fetch("/api/v1/info"),
        fetch("/api/v1/settings"),
      ]);

      if (!healthResponse.ok || !infoResponse.ok || !settingsResponse.ok) {
        throw new Error("Kuroha API is unavailable");
      }

      const nextHealth = (await healthResponse.json()) as Health;
      const nextInfo = (await infoResponse.json()) as Info;
      const nextSettings = (await settingsResponse.json()) as PublicSettings;

      setHealth(nextHealth);
      setInfo(nextInfo);
      setSettings(nextSettings);
      setDraftName(nextSettings.site_name);
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
      const response = await fetch("/api/v1/settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          site_name: draftName.trim(),
          theme: settings.theme,
        }),
      });

      if (!response.ok) throw new Error("Could not save settings");
      const nextSettings = (await response.json()) as PublicSettings;
      setSettings(nextSettings);
      setDraftName(nextSettings.site_name);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Unknown error");
    } finally {
      setSaving(false);
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
                  ? "System status"
                  : "Settings"}
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
                Kuroha now has a web layer, versioned API, persistent local storage,
                portable startup, validation and security foundations.
              </p>
            </article>

            <article className="card metric">
              <span>Version</span>
              <strong>{info?.version ?? "—"}</strong>
              <small>Platform release</small>
            </article>
            <article className="card metric">
              <span>Environment</span>
              <strong>{health?.environment ?? "—"}</strong>
              <small>Runtime profile</small>
            </article>
            <article className="card metric">
              <span>Storage</span>
              <strong>SQLite</strong>
              <small>Persistent local data</small>
            </article>
          </section>
        )}

        {view === "system" && (
          <section className="stack">
            <article className="card">
              <div className="section-heading">
                <div>
                  <span className="eyebrow">API</span>
                  <h2>Runtime</h2>
                </div>
                <span className={"pill " + (health ? "ok" : "bad")}>
                  {health ? "Operational" : "Unavailable"}
                </span>
              </div>
              <dl className="details">
                <div><dt>Version</dt><dd>{health?.version ?? "—"}</dd></div>
                <div><dt>API</dt><dd>{info?.api_version ?? "—"}</dd></div>
                <div><dt>Environment</dt><dd>{health?.environment ?? "—"}</dd></div>
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
        )}
      </main>
    </div>
  );
}
