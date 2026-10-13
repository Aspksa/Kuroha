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
    await onSave({ site_name: name.trim() || "Kuroha", theme });
    localStorage.setItem(SETUP_KEY, "1");
    onDone();
  };

  return (
    <div className="wizard-backdrop">
      <Card className="wizard">
        <span className="eyebrow">FIRST RUN · {step + 1}/4</span>
        {step === 0 && (
          <>
            <h1>Welcome to Kuroha</h1>
            <p>Configure the local platform before using the dashboard.</p>
            <label>Display name<input value={name} onChange={(e) => setName(e.target.value)} /></label>
          </>
        )}
        {step === 1 && (
          <>
            <h1>Choose appearance</h1>
            <p>The theme is stored in your local Kuroha database.</p>
            <div className="theme-options">
              {(["dark", "light"] as const).map((value) => (
                <button key={value} className={theme === value ? "selected" : ""} onClick={() => setTheme(value)}>
                  {value}
                </button>
              ))}
            </div>
          </>
        )}
        {step === 2 && (
          <>
            <h1>Local data</h1>
            <p>Kuroha will keep its database, backups and logs in this data directory.</p>
            <code className="wizard-path">{diagnostics.data_dir}</code>
            <p>{diagnostics.data_dir_writable ? "Write access verified." : "Data directory is not writable."}</p>
          </>
        )}
        {step === 3 && (
          <>
            <h1>Environment check</h1>
            <dl className="details">
              <div><dt>Python</dt><dd>{diagnostics.python_version}</dd></div>
              <div><dt>Node</dt><dd>{diagnostics.node_version ?? "not detected"}</dd></div>
              <div><dt>Database</dt><dd>{diagnostics.database_integrity}</dd></div>
              <div><dt>Environment</dt><dd>{diagnostics.environment}</dd></div>
            </dl>
          </>
        )}
        <div className="wizard-actions">
          {step > 0 && <Button onClick={() => setStep((value) => value - 1)}>Back</Button>}
          {step < 3 ? (
            <Button kind="primary" onClick={() => setStep((value) => value + 1)}>Continue</Button>
          ) : (
            <Button kind="primary" onClick={() => void finish()}>Open Kuroha</Button>
          )}
        </div>
      </Card>
    </div>
  );
}
