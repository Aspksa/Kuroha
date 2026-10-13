import type {
  BackupInfo,
  CleanupResult,
  Diagnostics,
  Health,
  Info,
  LogEntry,
  PublicSettings,
  StorageUsage,
  UpdateApplyResponse,
  UpdateBackup,
  UpdateRollbackResponse,
  UpdateStatus,
} from "./types";

export const API_BASE = "/api/v1";

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const method = (init?.method ?? "GET").toUpperCase();
  const response = await fetch(API_BASE + path, {
    ...init,
    headers: {
      ...(init?.body && !(init.body instanceof ArrayBuffer)
        ? { "Content-Type": "application/json" }
        : {}),
      ...(method !== "GET" && method !== "HEAD" && method !== "OPTIONS"
        ? { "X-Kuroha": "1" }
        : {}),
      ...init?.headers,
    },
  });

  if (!response.ok) {
    let message = "Kuroha API request failed";
    try {
      const payload = (await response.json()) as { error?: { message?: string } };
      message = payload.error?.message ?? message;
    } catch {
      // Keep generic message for non-JSON responses.
    }
    throw new Error(message + " (" + response.status + ")");
  }

  if (response.status === 204) return undefined as T;
  return (await response.json()) as T;
}

export async function getFoundation(): Promise<{
  health: Health;
  info: Info;
  settings: PublicSettings;
}> {
  const [health, info, settings] = await Promise.all([
    request<Health>("/health"),
    request<Info>("/info"),
    request<PublicSettings>("/settings"),
  ]);
  return { health, info, settings };
}

export function getDiagnostics(): Promise<Diagnostics> {
  return request<Diagnostics>("/diagnostics");
}

export function getBackups(): Promise<BackupInfo[]> {
  return request<BackupInfo[]>("/backups");
}

export function createBackup(): Promise<BackupInfo> {
  return request<BackupInfo>("/backups", { method: "POST" });
}

export function importBackup(payload: ArrayBuffer): Promise<BackupInfo> {
  return request<BackupInfo>("/backups/import", {
    method: "POST",
    body: payload,
    headers: { "Content-Type": "application/zip" },
  });
}

export function backupDownloadUrl(id: string): string {
  return API_BASE + "/backups/" + encodeURIComponent(id) + "/download";
}

export function restoreBackup(id: string): Promise<void> {
  return request<void>("/backups/" + encodeURIComponent(id) + "/restore", {
    method: "POST",
  });
}

export function updateSettings(settings: PublicSettings): Promise<PublicSettings> {
  return request<PublicSettings>("/settings", {
    method: "PUT",
    body: JSON.stringify(settings),
  });
}

export function getLogs(level?: string): Promise<LogEntry[]> {
  const suffix = level ? "?level=" + encodeURIComponent(level) : "";
  return request<LogEntry[]>("/logs" + suffix);
}

export function clearLogs(): Promise<void> {
  return request<void>("/logs", { method: "DELETE" });
}

export function logsDownloadUrl(): string {
  return API_BASE + "/logs/download";
}

export function getStorageUsage(): Promise<StorageUsage> {
  return request<StorageUsage>("/storage");
}

export function cleanupStorage(keepBackups: number): Promise<CleanupResult> {
  return request<CleanupResult>("/storage/cleanup", {
    method: "POST",
    body: JSON.stringify({ keep_backups: keepBackups }),
  });
}


export function getUpdateStatus(): Promise<UpdateStatus> {
  return request<UpdateStatus>("/update/status");
}

export function prepareUpdate(): Promise<UpdateStatus> {
  return request<UpdateStatus>("/update/prepare", { method: "POST" });
}

export function applyUpdate(): Promise<UpdateApplyResponse> {
  return request<UpdateApplyResponse>("/update/apply", { method: "POST" });
}

export function getUpdateBackups(): Promise<UpdateBackup[]> {
  return request<UpdateBackup[]>("/update/backups");
}

export function rollbackUpdate(filename: string): Promise<UpdateRollbackResponse> {
  return request<UpdateRollbackResponse>(
    "/update/rollback/" + encodeURIComponent(filename),
    { method: "POST" },
  );
}
