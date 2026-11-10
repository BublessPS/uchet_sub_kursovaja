import { test, expect, type Page } from "@playwright/test";
import { APPEARANCE_KEY } from "../../src/appearance";
import { STORAGE_KEY } from "../../src/domain";

const rates = {
  base: "RUB",
  date: "2026-11-10",
  fetchedAt: "2026-11-10T09:00:00Z",
  rubPerUnit: { USD: 100, EUR: 200 },
};
async function setup(page: Page) {
  await page.route("**/api/exchange-rates", (route) =>
    route.fulfill({ json: rates }),
  );
  await page.goto("/");
  await expect(
    page.locator('.currency-select option[value="USD"]'),
  ).toBeEnabled();
}

test("currency switching converts all views while preserving stored RUB amounts", async ({
  page,
}) => {
  await setup(page);
  const stored = await page.evaluate(
    (key) => localStorage.getItem(key),
    STORAGE_KEY,
  );
  const card = page
    .locator(".subscription-card")
    .filter({
      has: page.getByRole("button", { name: "Кинопоиск", exact: true }),
    });
  await page.getByLabel("Валюта отображения").selectOption("USD");
  await expect(card.locator(".subscription-price")).toContainText("4,49");
  await expect(card.locator(".subscription-price")).toContainText("$");
  await expect(page.locator(".stats-grid .featured .stat-value")).toContainText(
    "$",
  );
  await expect(page.locator(".budget-amount")).toContainText("$");
  await page.getByLabel("Валюта отображения").selectOption("EUR");
  await expect(card.locator(".subscription-price")).toContainText("2,25");
  await expect(card.locator(".subscription-price")).toContainText("€");
  expect(
    await page.evaluate((key) => localStorage.getItem(key), STORAGE_KEY),
  ).toBe(stored);
  await page.reload();
  await expect(page.getByLabel("Валюта отображения")).toHaveValue("EUR");
  await expect(card.locator(".subscription-price")).toContainText("€");
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
    .getByRole("button", { name: "Аналитика", exact: true })
    .click();
  await expect(page.locator(".analytics-stat").first()).toContainText("€");
  await expect(page.locator(".bar-chart")).toContainText("€");
});

test("cached exchange rates remain usable with a visible warning during an outage", async ({
  page,
}) => {
  await setup(page);
  await page.getByLabel("Валюта отображения").selectOption("USD");
  await page.unroute("**/api/exchange-rates");
  await page.route("**/api/exchange-rates", (route) =>
    route.fulfill({ status: 503, json: { error: "Unavailable" } }),
  );
  await page.reload();
  await expect(page.getByLabel("Валюта отображения")).toHaveValue("USD");
  await expect(page.locator(".rate-cache-label")).toHaveText(
    "Сохраненный курс",
  );
  await expect(page.locator(".subscription-price").first()).toContainText("$");
});

test("without a received rate, foreign currencies are disabled and can recover", async ({
  page,
}) => {
  await page.route("**/api/exchange-rates", (route) =>
    route.fulfill({ status: 503, json: { error: "Unavailable" } }),
  );
  await page.goto("/");
  await expect(page.locator(".currency-status")).toContainText(
    "Курс недоступен",
  );
  await expect(
    page.locator('.currency-select option[value="USD"]'),
  ).toBeDisabled();
  await expect(page.locator(".subscription-price").first()).toContainText("₽");
  await page.unroute("**/api/exchange-rates");
  await page.route("**/api/exchange-rates", (route) =>
    route.fulfill({ json: rates }),
  );
  await page.getByRole("button", { name: "Обновить курс валют" }).click();
  await expect(
    page.locator('.currency-select option[value="USD"]'),
  ).toBeEnabled();
});

test("wallpaper presets, gradients and uploaded images persist after reload", async ({
  page,
}, testInfo) => {
  await setup(page);
  await page.getByRole("button", { name: "Сменить фон", exact: true }).click();
  await page
    .getByRole("button", { name: "Фон: Золотые поля", exact: true })
    .click();
  await expect(page.locator(".app-shell")).toHaveAttribute(
    "style",
    /meadow.webp/,
  );
  await page.getByRole("button", { name: "Красиво, оставить" }).click();
  await expect
    .poll(() =>
      page.evaluate(
        (key) => JSON.parse(localStorage.getItem(key) ?? "{}").background,
        APPEARANCE_KEY,
      ),
    )
    .toBe("meadow");
  await page.reload();
  await expect(page.locator(".app-shell")).toHaveAttribute(
    "style",
    /meadow.webp/,
  );
  await page.getByRole("button", { name: "Сменить фон", exact: true }).click();
  await page
    .getByRole("button", { name: "Фон: Свой градиент", exact: true })
    .click();
  await page.getByLabel("Первый цвет").fill("#123456");
  await expect(page.locator(".app-shell")).toHaveAttribute("style", /#123456/);
  const image = await page.evaluate(() => {
    const canvas = document.createElement("canvas");
    canvas.width = 32;
    canvas.height = 32;
    const context = canvas.getContext("2d")!;
    context.fillStyle = "#aabbcc";
    context.fillRect(0, 0, 32, 32);
    return canvas.toDataURL("image/png").split(",")[1];
  });
  await page
    .getByLabel("Загрузить изображение фона")
    .setInputFiles({
      name: "my-wallpaper.png",
      mimeType: "image/png",
      buffer: Buffer.from(image, "base64"),
    });
  await expect(
    page.getByRole("button", { name: "Фон: Своя картинка" }),
  ).toHaveAttribute("aria-pressed", "true");
  await expect
    .poll(() =>
      page.evaluate(
        (key) => JSON.parse(localStorage.getItem(key) ?? "{}").background,
        APPEARANCE_KEY,
      ),
    )
    .toBe("custom");
  await page.reload();
  await expect(page.locator(".app-shell")).toHaveAttribute(
    "style",
    /data:image\/webp;base64/,
  );
  await page.getByRole("button", { name: "Сменить фон", exact: true }).click();
  await page
    .getByRole("button", { name: "Удалить картинку", exact: true })
    .click();
  await expect(page.locator(".app-shell")).toHaveAttribute(
    "style",
    /mountains.webp/,
  );
  await page.screenshot({
    path: `.artifacts/${testInfo.project.name}-appearance-picker.png`,
    fullPage: false,
  });
});

test("invalid wallpaper files show an error without replacing the selected background", async ({
  page,
}) => {
  await setup(page);
  await page.getByRole("button", { name: "Сменить фон", exact: true }).click();
  await page
    .getByLabel("Загрузить изображение фона")
    .setInputFiles({
      name: "wrong.png",
      mimeType: "image/png",
      buffer: Buffer.from("not an image"),
    });
  await expect(page.getByRole("dialog")).toContainText(
    "Не удалось прочитать картинку",
  );
  await expect(page.locator(".app-shell")).toHaveAttribute(
    "style",
    /mountains.webp/,
  );
});
