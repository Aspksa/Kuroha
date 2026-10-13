import { FormEvent, useState } from "react";

import type { PublicSettings } from "../api/types";
import { Button, Card } from "../components/ui";

export default function SettingsPage({
  settings,
  onSave,
  onResetSetup,
}: {
  settings: PublicSettings;
  onSave: (settings: PublicSettings) => Promise<void>;
  onResetSetup: () => void;
}) {
  const [name, setName] = useState(settings.site_name);
  const [theme, setTheme] = useState(settings.theme);
  const [saving, setSaving] = useState(false);

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    setSaving(true);
    try {
      await onSave({ site_name: name.trim(), theme });
    } finally {
      setSaving(false);
    }
  };

  return (
    <>
      <header className="topbar"><div><span className="eyebrow">KUROHA / SETTINGS</span><h1>Local preferences</h1></div></header>
      <section className="stack">
        <Card>
          <form className="settings-form" onSubmit={submit}>
            <label>Site name<input maxLength={80} value={name} onChange={(e) => setName(e.target.value)} /></label>
            <fieldset>
              <legend>Theme</legend>
              <div className="theme-options">
                {(["dark", "light"] as const).map((value) => (
                  <button className={theme === value ? "selected" : ""} key={value} type="button" onClick={() => setTheme(value)}>
                    <span className={"theme-preview " + value} /><span>{value}</span>
                  </button>
                ))}
              </div>
            </fieldset>
            <Button kind="primary" type="submit" disabled={saving || !name.trim()}>{saving ? "Saving…" : "Save settings"}</Button>
          </form>
        </Card>

        <Card>
          <span className="eyebrow">FIRST RUN</span>
          <h2>Setup wizard</h2>
          <p className="muted">Run the environment setup again without deleting data.</p>
          <Button onClick={onResetSetup}>Run setup again</Button>
        </Card>
      </section>
    </>
  );
}
