import { expect, test } from "@playwright/test";

test("first run, routing, diagnostics and backup flow", async ({ page }) => {
  await page.goto("/");

  await expect(page.getByText("Добро пожаловать в Kuroha")).toBeVisible();
  await page.getByRole("button", { name: "Продолжить" }).click();
  await page.getByRole("button", { name: "Продолжить" }).click();
  await page.getByRole("button", { name: "Продолжить" }).click();
  await page.getByRole("button", { name: "Открыть Kuroha" }).click();

  await expect(page).toHaveURL(/\/overview$/);
  await expect(page.getByText("Тихая сила.")).toBeVisible();

  await page.getByRole("link", { name: "Система" }).click();
  await expect(page).toHaveURL(/\/system$/);
  await expect(page.getByText("Диагностика системы")).toBeVisible();

  await page.getByRole("link", { name: "Резервные копии" }).click();
  await expect(page).toHaveURL(/\/backups$/);
  await page.getByRole("button", { name: "Создать копию" }).click();
  await expect(page.locator(".backup-row")).toHaveCount(1);

  await page.reload();
  await expect(page.getByText("Добро пожаловать в Kuroha")).toHaveCount(0);
  await expect(page).toHaveURL(/\/backups$/);
});

test("mobile navigation remains usable", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/overview");
  await page.evaluate(() => localStorage.setItem("kuroha.setup.completed", "1"));
  await page.reload();

  await page.getByRole("link", { name: "Журнал" }).click();
  await expect(page).toHaveURL(/\/logs$/);
  await expect(page.getByText("Системный журнал")).toBeVisible();
});
