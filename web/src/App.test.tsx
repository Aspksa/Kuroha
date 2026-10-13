import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import App from "./App";

const api = vi.hoisted(() => ({
  getFoundation: vi.fn(),
  getDiagnostics: vi.fn(),
  getBackups: vi.fn(),
  createBackup: vi.fn(),
  restoreBackup: vi.fn(),
  updateSettings: vi.fn(),
}));

vi.mock("./api/client", () => api);

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

beforeEach(() => {
  api.getFoundation.mockResolvedValue({
    health: { status: "ok", version: "0.3.0", environment: "test" },
    info: {
      name: "Kuroha",
      version: "0.3.0",
      api_version: "v1",
      capabilities: ["diagnostics", "backup-restore"],
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
});

describe("App", () => {
  it("loads the foundation dashboard", async () => {
    render(<App />);

    expect(await screen.findByText("Куроха")).toBeInTheDocument();
    expect(screen.getByText(/Quiet power/)).toBeInTheDocument();
    expect(screen.getByText("v2")).toBeInTheDocument();
  });

  it("shows runtime diagnostics", async () => {
    const user = userEvent.setup();
    render(<App />);

    await screen.findByText("Куроха");
    await user.click(screen.getByRole("button", { name: "System" }));

    expect(screen.getByText("3.13.0")).toBeInTheDocument();
    expect(screen.getByText("v20.0.0")).toBeInTheDocument();
    expect(screen.getByText("test-platform")).toBeInTheDocument();
  });

  it("creates a backup from settings", async () => {
    const user = userEvent.setup();
    api.createBackup.mockResolvedValue({
      id: "backup-1",
      filename: "backup-1.zip",
      created_at: "2026-10-13T00:00:00+00:00",
      size_bytes: 100,
    });
    api.getBackups
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([
        {
          id: "backup-1",
          filename: "backup-1.zip",
          created_at: "2026-10-13T00:00:00+00:00",
          size_bytes: 100,
        },
      ]);

    render(<App />);
    await screen.findByText("Куроха");
    await user.click(screen.getByRole("button", { name: "Settings" }));
    await user.click(screen.getByRole("button", { name: "Create backup" }));

    expect(await screen.findByText("backup-1")).toBeInTheDocument();
  });
});
