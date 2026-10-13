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
  const [draft, setDraft] = useState<PublicSettings>(settings);
  const [saving, setSaving] = useState(false);

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    setSaving(true);
    try {
      await onSave({ ...draft, site_name: draft.site_name.trim() });
    } finally {
      setSaving(false);
    }
  };

  function toggle(key: "autostart_windows" | "launch_minimized" | "minimize_to_tray" | "check_updates_on_start") {
    setDraft((current) => ({ ...current, [key]: !current[key] }));
  }

  return (
    <>
      <header className="topbar">
        <div><span className="eyebrow">KUROHA / НАСТРОЙКИ</span><h1>Настройки приложения</h1></div>
      </header>

      <section className="stack">
        <Card>
          <form className="settings-form" onSubmit={submit}>
            <label>
              Название сайта
              <input maxLength={80} value={draft.site_name} onChange={(e) => setDraft((v) => ({ ...v, site_name: e.target.value }))} />
            </label>

            <fieldset>
              <legend>Тема</legend>
              <div className="theme-options">
                {(["dark", "light"] as const).map((value) => (
                  <button className={draft.theme === value ? "selected" : ""} key={value} type="button" onClick={() => setDraft((v) => ({ ...v, theme: value }))}>
                    <span className={"theme-preview " + value} />
                    <span>{value === "dark" ? "Тёмная" : "Светлая"}</span>
                  </button>
                ))}
              </div>
            </fieldset>

            <fieldset>
              <legend>Запуск и трей</legend>
              <label className="setting-toggle"><input type="checkbox" checked={draft.autostart_windows} onChange={() => toggle("autostart_windows")} /><span>Запускать Kuroha вместе с Windows</span></label>
              <label className="setting-toggle"><input type="checkbox" checked={draft.launch_minimized} onChange={() => toggle("launch_minimized")} /><span>Запускать свёрнутой, без открытия браузера</span></label>
              <label className="setting-toggle"><input type="checkbox" checked={draft.minimize_to_tray} onChange={() => toggle("minimize_to_tray")} /><span>Показывать значок Kuroha в системном трее</span></label>
              <label className="setting-toggle"><input type="checkbox" checked={draft.check_updates_on_start} onChange={() => toggle("check_updates_on_start")} /><span>Проверять обновления при запуске и показывать уведомление</span></label>
            </fieldset>

            <label>
              Предпочитаемый API-порт
              <input
                type="number"
                min={1024}
                max={65535}
                value={draft.preferred_api_port}
                onChange={(e) => setDraft((v) => ({ ...v, preferred_api_port: Number(e.target.value) }))}
              />
              <small className="muted">Применится при следующем запуске. Если порт занят, launcher выберет следующий свободный.</small>
            </label>

            <label>
              Папка данных
              <input
                value={draft.preferred_data_dir}
                placeholder="Оставьте пустым для папки data рядом с Kuroha"
                onChange={(e) => setDraft((v) => ({ ...v, preferred_data_dir: e.target.value }))}
              />
              <small className="muted">Применится после перезапуска. При первом переходе текущие данные будут скопированы в новую папку.</small>
            </label>

            <label>
              Язык интерфейса
              <input value="Русский" readOnly />
            </label>

            <Button kind="primary" type="submit" disabled={saving || !draft.site_name.trim()}>
              {saving ? "Сохранение…" : "Сохранить настройки"}
            </Button>
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
