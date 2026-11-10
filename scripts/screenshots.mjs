import { chromium } from "@playwright/test";
import { mkdir } from "node:fs/promises";

const baseURL = process.env.SUBLY_PREVIEW_URL ?? "http://127.0.0.1:5173";
const executablePath =
  process.env.PLAYWRIGHT_BROWSER_EXECUTABLE ??
  (process.platform === "win32"
    ? "C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe"
    : undefined);
const browser = await chromium.launch({ executablePath });
try {
  await mkdir("docs/screenshots", { recursive: true });
  const page = await browser.newPage({
    viewport: { width: 1440, height: 1000 },
    deviceScaleFactor: 1,
  });
  const response = await page.goto(baseURL);
  if (!response?.ok())
    throw new Error("Preview did not return a successful response.");
  await page.evaluate(() => document.fonts.ready);
  for (const [view, label] of [
    ["overview", "Обзор"],
    ["calendar", "Календарь"],
    ["analytics", "Аналитика"],
  ]) {
    await page
      .locator(".sidebar")
      .getByRole("button", { name: label })
      .first()
      .click();
    await page.getByRole("heading", { level: 1 }).click();
    await page.screenshot({
      path: `docs/screenshots/${view}.png`,
      fullPage: true,
      animations: "disabled",
    });
  }
  await page
    .locator(".sidebar")
    .getByRole("button", { name: "Обзор", exact: true })
    .click();
  await page.getByRole("button", { name: "Сменить фон", exact: true }).click();
  await page.screenshot({
    path: "docs/screenshots/appearance.png",
    fullPage: false,
    animations: "disabled",
  });
  await page.getByRole("button", { name: "Красиво, оставить" }).click();
  await page.waitForFunction(() => {
    const option = document.querySelector('option[value="USD"]');
    return option && !option.disabled;
  });
  await page.getByLabel("Валюта отображения").selectOption("USD");
  await page.getByRole("heading", { level: 1 }).click();
  await page.screenshot({
    path: "docs/screenshots/usd.png",
    fullPage: true,
    animations: "disabled",
  });
  const mobile = await browser.newPage({
    viewport: { width: 390, height: 844 },
    deviceScaleFactor: 1,
    isMobile: true,
    hasTouch: true,
  });
  await mobile.goto(baseURL);
  await mobile.evaluate(() => document.fonts.ready);
  await mobile.screenshot({
    path: "docs/screenshots/mobile.png",
    fullPage: true,
    animations: "disabled",
  });
  console.log("Saved six screenshots in docs/screenshots.");
} finally {
  await browser.close();
}
