import { expect, test } from "@playwright/test";

test("first run, routing, diagnostics and backup flow", async ({ page }) => {
  await page.goto("/");

  await expect(page.getByText("Добро пожаловать в Kuroha")).toBeVisible();
  await page.getByRole("button", { name: "Продолжить" }).click();
  await page.getByRole("button", { name: "Продолжить" }).click();
  await page.getByRole("button", { name: "Продолжить" }).click();
  await page.getByRole("button", { name: "Открыть Kuroha" }).click();

  await expect(page).toHaveURL(/\/home$/);
  await expect(page.getByText("Спокойный интерфейс.")).toBeVisible();

  await expect(page.getByText("Система и хранилище")).toBeVisible();

  await page.getByRole("link", { name: "Данные" }).click();
  await expect(page).toHaveURL(/\/data$/);
  await page.getByRole("button", { name: "Создать копию" }).click();
  await expect(page.locator(".backup-row")).toHaveCount(1);

  await page.reload();
  await expect(page.getByText("Добро пожаловать в Kuroha")).toHaveCount(0);
  await expect(page).toHaveURL(/\/data$/);
});

test("mobile navigation remains usable", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/home");
  await page.evaluate(() => localStorage.setItem("kuroha.setup.completed", "1"));
  await page.reload();

  await page.getByRole("link", { name: "Данные" }).click();
  await expect(page).toHaveURL(/\/data$/);
  await page.getByRole("button", { name: "Журнал" }).click();
  await expect(page.getByText("Записей нет")).toBeVisible();
});
