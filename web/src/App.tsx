import { useEffect, useMemo, useState } from "react";
import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";

import {
  cleanupStorage,
  createBackup,
  getBackups,
  getDiagnostics,
  getFoundation,
  getLogs,
  getStorageUsage,
  importBackup,
  restoreBackup,
  updateSettings,
} from "./api/client";
import type {
  BackupInfo,
  Diagnostics,
  Health,
  Info,
  LogEntry,
  PublicSettings,
  StorageUsage,
} from "./api/types";
import ErrorBoundary from "./components/ErrorBoundary";
import SetupWizard, { SETUP_KEY } from "./components/SetupWizard";
import Shell from "./components/Shell";
import { ErrorPanel, LoadingPanel } from "./components/ui";
import DashboardPage from "./pages/DashboardPage";
import DataPage from "./pages/DataPage";
import SettingsPage from "./pages/SettingsPage";
import UpdatePage from "./pages/UpdatePage";

const emptyUsage: StorageUsage = {
  database_bytes: 0,
  backups_bytes: 0,
  logs_bytes: 0,
  total_bytes: 0,
  backup_count: 0,
  log_file_count: 0,
};

export default function App() {
  const [health, setHealth] = useState<Health | null>(null);
  const [info, setInfo] = useState<Info | null>(null);
  const [diagnostics, setDiagnostics] = useState<Diagnostics | null>(null);
  const [settings, setSettings] = useState<PublicSettings>({
    site_name: "Kuroha",
    theme: "dark",
    language: "ru",
    autostart_windows: false,
    launch_minimized: false,
    minimize_to_tray: true,
    check_updates_on_start: true,
    preferred_api_port: 8000,
    preferred_data_dir: "",
  });
  const [backups, setBackups] = useState<BackupInfo[]>([]);
  const [usage, setUsage] = useState<StorageUsage>(emptyUsage);
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [logLevel, setLogLevel] = useState("ALL");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string>();
  const [setupOpen, setSetupOpen] = useState(() => localStorage.getItem(SETUP_KEY) !== "1");

  useEffect(() => {
    void refreshAll();
  }, []);

  useEffect(() => {
    document.documentElement.dataset.theme = settings.theme;
  }, [settings.theme]);

  async function refreshAll() {
    setLoading(true);
    setError(undefined);
    try {
      const foundation = await getFoundation();
      const [nextDiagnostics, nextBackups, nextUsage] = await Promise.all([
        getDiagnostics(),
        getBackups(),
        getStorageUsage(),
      ]);
      setHealth(foundation.health);
      setInfo(foundation.info);
      setSettings(foundation.settings);
      setDiagnostics(nextDiagnostics);
      setBackups(nextBackups);
      setUsage(nextUsage);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Неизвестная ошибка");
    } finally {
      setLoading(false);
    }
  }

  async function saveSettings(next: PublicSettings) {
    const saved = await updateSettings(next);
    setSettings(saved);
  }

  async function refreshBackups() {
    const [nextBackups, nextUsage] = await Promise.all([getBackups(), getStorageUsage()]);
    setBackups(nextBackups);
    setUsage(nextUsage);
  }

  async function createRestorePoint() {
    await createBackup();
    await refreshBackups();
  }

  async function importRestorePoint(file: File) {
    await importBackup(await file.arrayBuffer());
    await refreshBackups();
  }

  async function restoreRestorePoint(id: string) {
    await restoreBackup(id);
    await refreshAll();
  }

  async function cleanup() {
    await cleanupStorage(5);
    await refreshBackups();
  }

  async function loadLogs(level = logLevel) {
    const next = await getLogs(level === "ALL" ? undefined : level);
    setLogs(next);
  }

  async function selectLogLevel(level: string) {
    setLogLevel(level);
    await loadLogs(level);
  }

  async function clearCurrentLogs() {
    const { clearLogs } = await import("./api/client");
    await clearLogs();
    await loadLogs();
    setUsage(await getStorageUsage());
  }

  const ready = useMemo(
    () => Boolean(health && info && diagnostics),
    [health, info, diagnostics],
  );

  if (loading && !ready) return <LoadingPanel />;
  if (error && !ready) return <ErrorPanel message={error} retry={() => void refreshAll()} />;
  if (!health || !info || !diagnostics) return <ErrorPanel message="Данные платформы Kuroha недоступны." retry={() => void refreshAll()} />;

  return (
    <ErrorBoundary>
      <BrowserRouter>
        {setupOpen && (
          <SetupWizard
            diagnostics={diagnostics}
            settings={settings}
            onSave={saveSettings}
            onDone={() => setSetupOpen(false)}
          />
        )}

        {error && <div className="global-alert">{error}</div>}

        <Routes>
          <Route element={<Shell settings={settings} health={health} />}>
            <Route path="/home" element={<DashboardPage health={health} info={info} diagnostics={diagnostics} backups={backups} />} />
            <Route
              path="/data"
              element={
                <DataPage
                  backups={backups}
                  usage={usage}
                  logs={logs}
                  level={logLevel}
                  onCreate={createRestorePoint}
                  onImport={importRestorePoint}
                  onRestore={restoreRestorePoint}
                  onCleanup={cleanup}
                  onLevel={selectLogLevel}
                  onRefreshLogs={() => loadLogs()}
                  onClearLogs={clearCurrentLogs}
                />
              }
            />
            <Route path="/update" element={<UpdatePage />} />
            <Route
              path="/settings"
              element={
                <SettingsPage
                  settings={settings}
                  onSave={saveSettings}
                  onResetSetup={() => {
                    localStorage.removeItem(SETUP_KEY);
                    setSetupOpen(true);
                  }}
                />
              }
            />
            <Route path="/overview" element={<Navigate to="/home" replace />} />
            <Route path="/system" element={<Navigate to="/home" replace />} />
            <Route path="/backups" element={<Navigate to="/data" replace />} />
            <Route path="/logs" element={<Navigate to="/data" replace />} />
            <Route path="/" element={<Navigate to="/home" replace />} />
            <Route path="*" element={<Navigate to="/home" replace />} />
          </Route>
        </Routes>
      </BrowserRouter>
    </ErrorBoundary>
  );
}
