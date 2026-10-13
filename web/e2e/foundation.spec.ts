import { expect, test } from "@playwright/test";

test("first run, routing, diagnostics and backup flow", async ({ page }) => {
  await page.goto("/");

  await expect(page.getByText("Welcome to Kuroha")).toBeVisible();
  await page.getByRole("button", { name: "Continue" }).click();
  await page.getByRole("button", { name: "Continue" }).click();
  await page.getByRole("button", { name: "Continue" }).click();
  await page.getByRole("button", { name: "Open Kuroha" }).click();

  await expect(page).toHaveURL(/\/overview$/);
  await expect(page.getByText("Quiet power.")).toBeVisible();

  await page.getByRole("link", { name: "System" }).click();
  await expect(page).toHaveURL(/\/system$/);
  await expect(page.getByText("System diagnostics")).toBeVisible();

  await page.getByRole("link", { name: "Backups" }).click();
  await expect(page).toHaveURL(/\/backups$/);
  await page.getByRole("button", { name: "Create backup" }).click();
  await expect(page.locator(".backup-row")).toHaveCount(1);

  await page.reload();
  await expect(page.getByText("Welcome to Kuroha")).toHaveCount(0);
  await expect(page).toHaveURL(/\/backups$/);
});

test("mobile navigation remains usable", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/overview");
  await page.evaluate(() => localStorage.setItem("kuroha.setup.completed", "1"));
  await page.reload();

  await page.getByRole("link", { name: "Logs" }).click();
  await expect(page).toHaveURL(/\/logs$/);
  await expect(page.getByText("System journal")).toBeVisible();
});
