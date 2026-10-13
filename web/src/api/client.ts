import type {
  BackupInfo,
  Diagnostics,
  Health,
  Info,
  PublicSettings,
} from "./types";

const API_BASE = "/api/v1";

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(API_BASE + path, {
    ...init,
    headers: {
      ...(init?.body ? { "Content-Type": "application/json" } : {}),
      ...init?.headers,
    },
  });

  if (!response.ok) {
    let message = "Kuroha API request failed";
    try {
      const payload = (await response.json()) as {
        error?: { message?: string };
      };
      message = payload.error?.message ?? message;
    } catch {
      // Keep the generic message when the response body is not JSON.
    }
    throw new Error(message + " (" + response.status + ")");
  }

  if (response.status === 204) {
    return undefined as T;
  }

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

export function restoreBackup(id: string): Promise<void> {
  return request<void>("/backups/" + encodeURIComponent(id) + "/restore", {
    method: "POST",
  });
}

export function updateSettings(
  settings: PublicSettings,
): Promise<PublicSettings> {
  return request<PublicSettings>("/settings", {
    method: "PUT",
    body: JSON.stringify(settings),
  });
}
