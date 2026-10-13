import { afterEach, describe, expect, it, vi } from "vitest";

import { createBackup, restoreBackup } from "./client";


afterEach(() => {
  vi.unstubAllGlobals();
});


describe("api client", () => {
  it("parses JSON responses", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        new Response(
          JSON.stringify({
            id: "backup-1",
            filename: "backup-1.zip",
            created_at: "2026-10-13T00:00:00Z",
            size_bytes: 120,
          }),
          { status: 201, headers: { "Content-Type": "application/json" } },
        ),
      ),
    );

    const backup = await createBackup();
    expect(backup.id).toBe("backup-1");
  });

  it("handles 204 restore responses", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(new Response(null, { status: 204 })),
    );

    await expect(restoreBackup("backup-1")).resolves.toBeUndefined();
  });

  it("surfaces API error messages", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        new Response(
          JSON.stringify({ error: { message: "Backup not found" } }),
          { status: 404, headers: { "Content-Type": "application/json" } },
        ),
      ),
    );

    await expect(restoreBackup("missing")).rejects.toThrow("Backup not found (404)");
  });
});
