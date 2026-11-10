import type { IncomingMessage, ServerResponse } from "node:http";
import type { ExchangeRates } from "../src/currency.ts";

const ENDPOINT = "https://www.cbr.ru/scripts/XML_daily.asp";
let cached: ExchangeRates | undefined;
let pending: Promise<ExchangeRates> | undefined;
const CACHE_MS = 60 * 60 * 1000;

export function parseCbrRates(
  xml: string,
  fetchedAt = new Date().toISOString(),
): ExchangeRates {
  const date = xml.match(
    /<ValCurs\b[^>]*\bDate=["'](\d{2})\.(\d{2})\.(\d{4})["']/,
  );
  if (!date) throw new Error("В ответе Банка России отсутствует дата курса.");
  const dateKey = `${date[3]}-${date[2]}-${date[1]}`;
  const parsed = new Date(`${dateKey}T12:00:00Z`);
  if (
    !Number.isFinite(parsed.getTime()) ||
    parsed.toISOString().slice(0, 10) !== dateKey
  )
    throw new Error("Банк России вернул некорректную дату.");
  const records = [...xml.matchAll(/<Valute\b[^>]*>([\s\S]*?)<\/Valute>/g)].map(
    (match) => match[1],
  );
  const rate = (code: "USD" | "EUR") => {
    const entry = records.find((record) =>
      record.includes(`<CharCode>${code}</CharCode>`),
    );
    const nominal = Number(
      entry?.match(/<Nominal>\s*([^<]+)<\/Nominal>/)?.[1].replace(/\s/g, ""),
    );
    const value = Number(
      entry
        ?.match(/<Value>\s*([^<]+)<\/Value>/)?.[1]
        .replace(/\s/g, "")
        .replace(",", "."),
    );
    if (
      !Number.isFinite(nominal) ||
      nominal <= 0 ||
      !Number.isFinite(value) ||
      value <= 0
    )
      throw new Error(`Не получен корректный курс ${code}.`);
    return value / nominal;
  };
  return {
    base: "RUB",
    date: dateKey,
    fetchedAt,
    rubPerUnit: { USD: rate("USD"), EUR: rate("EUR") },
  };
}

export async function getExchangeRates(): Promise<ExchangeRates> {
  if (cached && Date.now() - Date.parse(cached.fetchedAt) < CACHE_MS)
    return cached;
  if (pending) return pending;
  pending = (async () => {
    try {
      const response = await fetch(ENDPOINT, {
        headers: { Accept: "application/xml" },
        signal: AbortSignal.timeout(12000),
      });
      if (!response.ok) throw new Error(`Банк России: HTTP ${response.status}`);
      const bytes = await response.arrayBuffer();
      if (bytes.byteLength > 1000000)
        throw new Error("Неожиданно большой ответ Банка России.");
      cached = parseCbrRates(new TextDecoder("windows-1251").decode(bytes));
      return cached;
    } catch (error) {
      if (cached) return { ...cached, stale: true };
      throw error;
    } finally {
      pending = undefined;
    }
  })();
  return pending;
}

export async function handleExchangeRates(
  request: IncomingMessage,
  response: ServerResponse,
) {
  response.setHeader("Content-Type", "application/json; charset=utf-8");
  response.setHeader("X-Content-Type-Options", "nosniff");
  if (request.method !== "GET" && request.method !== "HEAD") {
    response.statusCode = 405;
    response.setHeader("Allow", "GET, HEAD");
    response.end(JSON.stringify({ error: "Допустим только GET-запрос." }));
    return;
  }
  try {
    const rates = await getExchangeRates();
    response.setHeader(
      "Cache-Control",
      rates.stale
        ? "no-store"
        : "public, max-age=300, s-maxage=3600, stale-while-revalidate=86400",
    );
    response.statusCode = 200;
    response.end(request.method === "HEAD" ? undefined : JSON.stringify(rates));
  } catch {
    response.statusCode = 503;
    response.setHeader("Cache-Control", "no-store");
    response.end(
      request.method === "HEAD"
        ? undefined
        : JSON.stringify({
            error:
              "Сейчас не удалось получить курс Банка России. Повторите попытку позже.",
          }),
    );
  }
}
