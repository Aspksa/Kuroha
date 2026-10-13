import { useState } from "react";

import type { Diagnostics, PublicSettings } from "../api/types";
import { Button, Card } from "./ui";

export const SETUP_KEY = "kuroha.setup.completed";

export default function SetupWizard({
  diagnostics,
  settings,
  onSave,
  onDone,
}: {
  diagnostics: Diagnostics;
  settings: PublicSettings;
  onSave: (settings: PublicSettings) => Promise<void>;
  onDone: () => void;
}) {
  const [step, setStep] = useState(0);
  const [name, setName] = useState(settings.site_name);
  const [theme, setTheme] = useState(settings.theme);

  const finish = async () => {
    await onSave({ ...settings, site_name: name.trim() || "Kuroha", theme });
    localStorage.setItem(SETUP_KEY, "1");
    onDone();
  };

  return (
    <div className="wizard-backdrop">
      <Card className="wizard">
        <span className="eyebrow">ПЕРВЫЙ ЗАПУСК · {step + 1}/4</span>
        {step === 0 && (
          <>
            <h1>Добро пожаловать в Kuroha</h1>
            <p>Настройте локальную платформу перед началом работы.</p>
            <label>Отображаемое имя<input value={name} onChange={(e) => setName(e.target.value)} /></label>
          </>
        )}
        {step === 1 && (
          <>
            <h1>Выберите оформление</h1>
            <p>Тема хранится локально в базе данных Kuroha.</p>
            <div className="theme-options">
              {(["dark", "light"] as const).map((value) => (
                <button key={value} className={theme === value ? "selected" : ""} onClick={() => setTheme(value)}>
                  {value === "dark" ? "Тёмная" : "Светлая"}
                </button>
              ))}
            </div>
          </>
        )}
        {step === 2 && (
          <>
            <h1>Локальные данные</h1>
            <p>Kuroha будет хранить базу данных, резервные копии и журналы в этой папке.</p>
            <code className="wizard-path">{diagnostics.data_dir}</code>
            <p>{diagnostics.data_dir_writable ? "Доступ на запись подтверждён." : "Нет доступа на запись в папку данных."}</p>
          </>
        )}
        {step === 3 && (
          <>
            <h1>Проверка окружения</h1>
            <dl className="details">
              <div><dt>Python</dt><dd>{diagnostics.python_version}</dd></div>
              <div><dt>Node</dt><dd>{diagnostics.node_version ?? "не обнаружен"}</dd></div>
              <div><dt>База данных</dt><dd>{diagnostics.database_integrity}</dd></div>
              <div><dt>Окружение</dt><dd>{diagnostics.environment}</dd></div>
            </dl>
          </>
        )}
        <div className="wizard-actions">
          {step > 0 && <Button onClick={() => setStep((value) => value - 1)}>Назад</Button>}
          {step < 3 ? (
            <Button kind="primary" onClick={() => setStep((value) => value + 1)}>Продолжить</Button>
          ) : (
            <Button kind="primary" onClick={() => void finish()}>Открыть Kuroha</Button>
          )}
        </div>
      </Card>
    </div>
  );
}
