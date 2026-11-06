import { test, expect, type Page } from "@playwright/test";
import {
  createDemoData,
  dateKey,
  nextDate,
  STORAGE_KEY,
} from "../../src/domain";

async function go(page: Page, label: string) {
  if (
    await page
      .getByRole("button", { name: "Открыть меню", exact: true })
      .isVisible()
  )
    await page
      .getByRole("button", { name: "Открыть меню", exact: true })
      .click();
  await page
    .locator(".sidebar")
    .getByRole("button", { name: label })
    .first()
    .click();
}

test.beforeEach(async ({ page }) => {
  await page.goto("/");
});

test("dashboard is responsive and accessible by keyboard", async ({
  page,
}, testInfo) => {
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await expect(
    page.getByRole("heading", { name: "Всё о ваших подписках" }),
  ).toBeVisible();
  await expect(page.locator(".subscription-card")).toHaveCount(6);
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= window.innerWidth,
    ),
  ).toBeTruthy();
  await page
    .getByRole("button", { name: "Добавить подписку", exact: true })
    .click();
  await expect(page.getByLabel("Название сервиса")).toBeFocused();
  await page.keyboard.press("Escape");
  await expect(page.getByRole("dialog")).toHaveCount(0);
  await expect(
    page.getByRole("button", { name: "Добавить подписку", exact: true }),
  ).toBeFocused();
  await page.getByRole("heading", { level: 1 }).click();
  await page.screenshot({
    path: `.artifacts/${testInfo.project.name}-overview.png`,
    fullPage: true,
  });
  expect(errors).toEqual([]);
});

test("create, edit, search, pause, persist and delete a subscription", async ({
  page,
}) => {
  await page
    .getByRole("button", { name: "Добавить подписку", exact: true })
    .click();
  await page.getByLabel("Название сервиса").fill("Тестовый сервис");
  await page.getByLabel("Стоимость, ₽").fill("799,90");
  await page.getByLabel("Следующая оплата").fill("2027-01-31");
  await page
    .getByRole("dialog")
    .getByRole("button", { name: "Добавить подписку", exact: true })
    .click();
  await go(page, "Мои подписки");
  await page.getByLabel("Поиск подписок").fill("Тестовый");
  await expect(page.locator(".subscription-card")).toHaveCount(1);
  await page
    .getByRole("button", { name: "Редактировать Тестовый сервис", exact: true })
    .click();
  await page.getByLabel("Стоимость, ₽").fill("899");
  await page.getByRole("button", { name: "Сохранить", exact: true }).click();
  await expect(page.locator(".subscription-price")).toContainText("899");
  await page
    .getByRole("button", { name: "Приостановить Тестовый сервис", exact: true })
    .click();
  await page.getByRole("button", { name: "На паузе", exact: true }).click();
  await expect(page.locator(".subscription-card")).toHaveCount(1);
  await page.reload();
  await go(page, "Мои подписки");
  await page.getByLabel("Поиск подписок").fill("Тестовый");
  await expect(page.locator(".subscription-price")).toContainText("899");
  await expect(
    page.getByRole("button", {
      name: "Возобновить Тестовый сервис",
      exact: true,
    }),
  ).toBeVisible();
  await page
    .getByRole("button", { name: "Редактировать Тестовый сервис", exact: true })
    .click();
  await page
    .getByRole("button", { name: "Удалить Тестовый сервис", exact: true })
    .click();
  await expect(
    page.getByRole("heading", { name: "Удалить подписку?" }),
  ).toBeVisible();
  await page
    .getByRole("button", { name: "Удалить подписку", exact: true })
    .click();
  await expect(
    page.getByRole("heading", { name: "Ничего не найдено" }),
  ).toBeVisible();
});

test("recording a payment advances the due date and adds a ledger record", async ({
  page,
}) => {
  const before = await page.evaluate(
    (key) => JSON.parse(localStorage.getItem(key)!),
    STORAGE_KEY,
  );
  await page
    .getByRole("button", { name: "Отметить оплату Кинопоиск", exact: true })
    .click();
  await page.getByRole("button", { name: "Да, оплачено", exact: true }).click();
  await expect
    .poll(() =>
      page.evaluate(
        (key) => JSON.parse(localStorage.getItem(key)!).payments.length,
        STORAGE_KEY,
      ),
    )
    .toBe(1);
  const after = await page.evaluate(
    (key) => JSON.parse(localStorage.getItem(key)!),
    STORAGE_KEY,
  );
  expect(after.subscriptions[0].nextPayment).toBe(
    nextDate(before.subscriptions[0]),
  );
  await go(page, "Аналитика");
  await expect(page.locator(".history-list")).toContainText("Кинопоиск");
  await expect(page.locator(".history-list")).toContainText("449");
});

test("calendar, category filters, list view and budget settings work", async ({
  page,
}, testInfo) => {
  await go(page, "Календарь");
  const firstMonth = await page.locator(".month-switcher h2").textContent();
  await page.getByRole("button", { name: "Следующий месяц" }).click();
  await expect(page.locator(".month-switcher h2")).not.toHaveText(firstMonth!);
  await page.getByRole("button", { name: "Сегодня", exact: true }).click();
  await expect(page.locator(".month-switcher h2")).toHaveText(firstMonth!);
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= window.innerWidth,
    ),
  ).toBeTruthy();
  await page.screenshot({
    path: `.artifacts/${testInfo.project.name}-calendar.png`,
    fullPage: true,
  });
  await go(page, "Мои подписки");
  await page.getByLabel("Фильтр по категории").selectOption("music");
  await expect(page.locator(".subscription-card")).toHaveCount(1);
  await expect(page.locator(".subscription-name")).toHaveText(
    "Spotify Premium",
  );
  await page.getByRole("button", { name: "Показать списком" }).click();
  await expect(page.locator(".subscription-table tbody tr")).toHaveCount(1);
  await go(page, "Настройки");
  await page.getByLabel("Месячный бюджет, ₽").fill("1000");
  await page.getByRole("button", { name: "Сохранить настройки" }).click();
  await go(page, "Обзор");
  await expect(page.locator(".budget-card")).toHaveClass(/over-budget/);
  await expect(page.locator(".budget-card")).toContainText("Бюджет превышен");
});

test("backup and calendar exports produce files and invalid import keeps data intact", async ({
  page,
}) => {
  await go(page, "Настройки");
  const downloadPromise = page.waitForEvent("download");
  await page.getByRole("button", { name: "Скачать", exact: true }).click();
  const download = await downloadPromise;
  expect(download.suggestedFilename()).toMatch(/subly-backup-.*\.json/);
  await page.getByLabel("Загрузить JSON-копию").setInputFiles({
    name: "broken.json",
    mimeType: "application/json",
    buffer: Buffer.from('{"version":1}'),
  });
  await expect(page.getByRole("status")).toContainText("Неверный формат");
  const data = createDemoData();
  data.subscriptions = [data.subscriptions[0]];
  data.subscriptions[0].name = "Восстановленная подписка";
  await page.getByLabel("Загрузить JSON-копию").setInputFiles({
    name: "backup.json",
    mimeType: "application/json",
    buffer: Buffer.from(JSON.stringify(data)),
  });
  await page.getByRole("button", { name: "Восстановить", exact: true }).click();
  await expect(page.locator(".subscription-card")).toHaveCount(1);
  await expect(page.locator(".subscription-name")).toHaveText(
    "Восстановленная подписка",
  );
  await go(page, "Календарь");
  const calendarDownload = page.waitForEvent("download");
  await page.getByRole("button", { name: "Скачать .ics" }).click();
  expect((await calendarDownload).suggestedFilename()).toBe(
    "subly-reminders.ics",
  );
});

test("empty state and overdue reminders are actionable", async ({ page }) => {
  const data = createDemoData();
  data.subscriptions[0].nextPayment = dateKey(new Date(2026, 0, 1));
  await page.evaluate(
    ({ key, value }) => localStorage.setItem(key, JSON.stringify(value)),
    { key: STORAGE_KEY, value: data },
  );
  await page.reload();
  await page.getByRole("button", { name: /^Напоминания:/ }).click();
  await expect(page.getByRole("dialog")).toContainText("Просрочено");
  await page.getByRole("button", { name: "Закрыть окно" }).click();
  await go(page, "Настройки");
  await page
    .getByRole("button", { name: "Очистить данные", exact: true })
    .click();
  await page
    .getByRole("dialog")
    .getByRole("button", { name: "Очистить данные", exact: true })
    .click();
  await expect(
    page.getByRole("heading", { name: "Здесь будут ваши подписки" }),
  ).toBeVisible();
  await expect(page.locator(".subscription-card")).toHaveCount(0);
});
