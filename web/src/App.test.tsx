import { cleanup, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import App from "./App";
import { SETUP_KEY } from "./components/SetupWizard";

const api = vi.hoisted(() => ({
  getFoundation: vi.fn(),
  getDiagnostics: vi.fn(),
  getBackups: vi.fn(),
  getStorageUsage: vi.fn(),
  getLogs: vi.fn(),
  createBackup: vi.fn(),
  importBackup: vi.fn(),
  restoreBackup: vi.fn(),
  cleanupStorage: vi.fn(),
  clearLogs: vi.fn(),
  updateSettings: vi.fn(),
  backupDownloadUrl: vi.fn((id: string) => "/download/" + id),
  logsDownloadUrl: vi.fn(() => "/logs/download"),
}));

vi.mock("./api/client", () => api);

beforeEach(() => {
  localStorage.setItem(SETUP_KEY, "1");
  window.history.pushState({}, "", "/overview");

  api.getFoundation.mockResolvedValue({
    health: { status: "ok", version: "0.4.0", environment: "test" },
    info: {
      name: "Kuroha",
      version: "0.4.0",
      api_version: "v1",
      capabilities: ["diagnostics", "backup-restore", "pwa"],
    },
    settings: { site_name: "Куроха", theme: "dark" },
  });
  api.getDiagnostics.mockResolvedValue({
    python_version: "3.13.0",
    python_executable: "python",
    node_version: "v20.0.0",
    platform: "test-platform",
    project_root: "/kuroha",
    data_dir: "/kuroha/data",
    database_path: "/kuroha/data/kuroha.db",
    database_size_bytes: 1024,
    database_schema_version: 2,
    database_journal_mode: "wal",
    database_integrity: "ok",
    data_dir_writable: true,
    disk_free_bytes: 1024 * 1024,
    disk_total_bytes: 2 * 1024 * 1024,
    environment: "test",
    host: "127.0.0.1",
    port: 8000,
  });
  api.getBackups.mockResolvedValue([]);
  api.getStorageUsage.mockResolvedValue({
    database_bytes: 1024,
    backups_bytes: 0,
    logs_bytes: 0,
    total_bytes: 1024,
    backup_count: 0,
    log_file_count: 0,
  });
  api.getLogs.mockResolvedValue([]);
  api.updateSettings.mockImplementation(async (value) => value);
});

afterEach(() => {
  cleanup();
  localStorage.clear();
  vi.clearAllMocks();
});

describe("App", () => {
  it("loads the routed overview", async () => {
    render(<App />);
    expect(await screen.findByText("Куроха")).toBeInTheDocument();
    expect(screen.getByText(/Quiet power/)).toBeInTheDocument();
    expect(window.location.pathname).toBe("/overview");
  });

  it("navigates to system using a real URL", async () => {
    const user = userEvent.setup();
    render(<App />);
    await screen.findByText("Куроха");

    await user.click(screen.getByRole("link", { name: "System" }));

    await waitFor(() => expect(window.location.pathname).toBe("/system"));
    expect(screen.getByText("3.13.0")).toBeInTheDocument();
    expect(screen.getByText("test-platform")).toBeInTheDocument();
  });

  it("shows the first-run wizard when setup is not completed", async () => {
    localStorage.removeItem(SETUP_KEY);
    render(<App />);
    expect(await screen.findByText("Welcome to Kuroha")).toBeInTheDocument();
  });
});
