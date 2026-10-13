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
      <header className="topbar"><div><span className="eyebrow">KUROHA / НАСТРОЙКИ</span><h1>Локальные настройки</h1></div></header>
      <section className="stack">
        <Card>
          <form className="settings-form" onSubmit={submit}>
            <label>Название сайта<input maxLength={80} value={name} onChange={(e) => setName(e.target.value)} /></label>
            <fieldset>
              <legend>Тема</legend>
              <div className="theme-options">
                {(["dark", "light"] as const).map((value) => (
                  <button className={theme === value ? "selected" : ""} key={value} type="button" onClick={() => setTheme(value)}>
                    <span className={"theme-preview " + value} /><span>{value === "dark" ? "Тёмная" : "Светлая"}</span>
                  </button>
                ))}
              </div>
            </fieldset>
            <Button kind="primary" type="submit" disabled={saving || !name.trim()}>{saving ? "Сохранение…" : "Сохранить настройки"}</Button>
          </form>
        </Card>

        <Card>
          <span className="eyebrow">ПЕРВЫЙ ЗАПУСК</span>
          <h2>Мастер настройки</h2>
          <p className="muted">Запустите первоначальную настройку повторно без удаления данных.</p>
          <Button onClick={onResetSetup}>Запустить настройку снова</Button>
        </Card>
      </section>
    </>
  );
}
