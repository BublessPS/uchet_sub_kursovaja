export type Currency = "RUB" | "USD" | "EUR";
export interface ExchangeRates {
  base: "RUB";
  date: string;
  fetchedAt: string;
  rubPerUnit: { USD: number; EUR: number };
  stale?: boolean;
}
export const CBR_SOURCE = "https://www.cbr.ru/currency_base/daily/";
export const RATES_CACHE_KEY = "subly-rates-v1";
export const CURRENCY_KEY = "subly-currency-v1";
export function validRates(value: unknown): value is ExchangeRates {
  if (typeof value !== "object" || value === null) return false;
  const data = value as ExchangeRates;
  if (
    data.base !== "RUB" ||
    typeof data.date !== "string" ||
    !/^\d{4}-\d{2}-\d{2}$/.test(data.date) ||
    typeof data.fetchedAt !== "string" ||
    !Number.isFinite(Date.parse(data.fetchedAt)) ||
    typeof data.rubPerUnit !== "object" ||
    !data.rubPerUnit
  )
    return false;
  const date = new Date(`${data.date}T12:00:00Z`);
  if (
    !Number.isFinite(date.getTime()) ||
    date.toISOString().slice(0, 10) !== data.date
  )
    return false;
  return [data.rubPerUnit.USD, data.rubPerUnit.EUR].every(
    (rate) =>
      typeof rate === "number" &&
      Number.isFinite(rate) &&
      rate > 0 &&
      rate < 100000000,
  );
}
export function createMoneyFormatter(
  currency: Currency,
  rates?: ExchangeRates["rubPerUnit"],
) {
  if (
    currency !== "RUB" &&
    (!rates || !Number.isFinite(rates[currency]) || !(rates[currency] > 0))
  )
    throw new Error("Для пересчета нужен полученный курс валют.");
  return (rubles: number, precise = false) =>
    new Intl.NumberFormat("ru-RU", {
      style: "currency",
      currency,
      maximumFractionDigits: precise || currency !== "RUB" ? 2 : 0,
    }).format(currency === "RUB" ? rubles : rubles / rates![currency]);
}
