import test from "node:test";
import assert from "node:assert/strict";
import {
  createMoneyFormatter,
  validRates,
  type ExchangeRates,
} from "../src/currency.ts";
import { parseCbrRates } from "../server/exchange-rates.ts";
import {
  parseAppearance,
  wallpaperImage,
  DEFAULT_APPEARANCE,
} from "../src/appearance.ts";

const xml = `<?xml version="1.0"?><ValCurs Date="10.11.2026"><Valute ID="EUR"><CharCode>EUR</CharCode><Nominal>1</Nominal><Value>200,0000</Value></Valute><Valute ID="USD"><CharCode>USD</CharCode><Nominal>10</Nominal><Value>1 000,0000</Value></Valute></ValCurs>`;
const rates: ExchangeRates = {
  base: "RUB",
  date: "2026-11-10",
  fetchedAt: "2026-11-10T09:00:00Z",
  rubPerUnit: { USD: 100, EUR: 200 },
};

test("CBR parser honors nominal units, decimal commas, and effective date", () => {
  assert.deepEqual(parseCbrRates(xml, rates.fetchedAt), rates);
});
test("invalid XML never produces invented rates", () => {
  for (const document of [
    "<html>Error</html>",
    xml.replace("10.11.2026", "31.02.2026"),
    xml.replace("<Value>200,0000</Value>", "<Value>0</Value>"),
    xml.replace("<CharCode>EUR</CharCode>", "<CharCode>GBP</CharCode>"),
    xml.replace("<Nominal>10</Nominal>", "<Nominal>0</Nominal>"),
  ])
    assert.throws(() => parseCbrRates(document));
});
test("display conversion divides RUB by the price of one foreign unit", () => {
  const compact = (value: string) => value.replace(/\s/g, "");
  assert.equal(
    compact(createMoneyFormatter("USD", rates.rubPerUnit)(449)),
    "4,49$",
  );
  assert.equal(
    compact(createMoneyFormatter("EUR", rates.rubPerUnit)(449)),
    "2,25€",
  );
  assert.equal(compact(createMoneyFormatter("RUB")(449)), "449₽");
  assert.throws(() => createMoneyFormatter("USD"));
  assert.throws(() => createMoneyFormatter("EUR", { USD: 100, EUR: Infinity }));
});
test("cached rates require valid dates and strictly positive numeric rates", () => {
  assert.equal(validRates(rates), true);
  for (const value of [
    null,
    {},
    { ...rates, date: "2026-02-30" },
    { ...rates, fetchedAt: 123 },
    { ...rates, rubPerUnit: { USD: 0, EUR: 200 } },
    { ...rates, rubPerUnit: { USD: "100", EUR: 200 } },
  ])
    assert.equal(validRates(value), false);
});
test("appearance preferences reject external or executable custom image URLs", () => {
  assert.equal(
    parseAppearance({
      background: "custom",
      customImage: "javascript:alert(1)",
    }).background,
    "mountains",
  );
  assert.equal(
    parseAppearance({
      background: "custom",
      customImage: "https://example.com/photo.png",
    }).background,
    "mountains",
  );
  assert.equal(
    parseAppearance({ dim: 200, blur: -3, gradientFrom: "url(evil)" }).dim,
    DEFAULT_APPEARANCE.dim,
  );
  assert.equal(
    parseAppearance({ dim: 200, blur: -3, gradientFrom: "url(evil)" })
      .gradientFrom,
    DEFAULT_APPEARANCE.gradientFrom,
  );
  const gradient = parseAppearance({
    background: "gradient",
    gradientFrom: "#123456",
    gradientTo: "#abcdef",
    gradientAngle: 90,
  });
  assert.equal(
    wallpaperImage(gradient),
    "linear-gradient(90deg, #123456, #abcdef)",
  );
});
