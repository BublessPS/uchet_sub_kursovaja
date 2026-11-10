import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import {
  CURRENCY_KEY,
  RATES_CACHE_KEY,
  createMoneyFormatter,
  validRates,
  type Currency,
  type ExchangeRates,
} from "./currency";

interface CurrencyContextValue {
  currency: Currency;
  selectCurrency: (currency: Currency) => void;
  rates?: ExchangeRates;
  loading: boolean;
  error: string;
  refresh: () => void;
  money: ReturnType<typeof createMoneyFormatter>;
}
const CurrencyContext = createContext<CurrencyContextValue | null>(null);
export function CurrencyProvider({ children }: { children: ReactNode }) {
  const [preferred, setPreferred] = useState<Currency>(() => {
    try {
      const saved = localStorage.getItem(CURRENCY_KEY);
      return saved === "USD" || saved === "EUR" ? saved : "RUB";
    } catch {
      return "RUB";
    }
  });
  const [rates, setRates] = useState<ExchangeRates | undefined>(() => {
    try {
      const saved: unknown = JSON.parse(
        localStorage.getItem(RATES_CACHE_KEY) ?? "null",
      );
      return validRates(saved) ? { ...saved, stale: true } : undefined;
    } catch {
      return undefined;
    }
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [refreshIndex, setRefreshIndex] = useState(0);
  useEffect(() => {
    const controller = new AbortController();
    async function load() {
      setLoading(true);
      setError("");
      try {
        const response = await fetch("/api/exchange-rates", {
          signal: controller.signal,
          cache: "no-cache",
        });
        if (!response.ok) throw new Error("Сервис курса временно недоступен.");
        const result: unknown = await response.json();
        if (!validRates(result))
          throw new Error("Получен некорректный ответ о курсе валют.");
        if (controller.signal.aborted) return;
        setRates(result);
        try {
          localStorage.setItem(RATES_CACHE_KEY, JSON.stringify(result));
        } catch {
          /* Conversion still works in memory. */
        }
        if (result.stale)
          setError("Источник недоступен. Используется сохраненный курс.");
      } catch (error) {
        if (controller.signal.aborted) return;
        setError(
          error instanceof Error ? error.message : "Курс временно недоступен.",
        );
        setRates((current) =>
          current ? { ...current, stale: true } : undefined,
        );
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
    }
    void load();
    return () => controller.abort();
  }, [refreshIndex]);
  // Refresh daily rates while the app stays open; the server caches for one hour.
  useEffect(() => {
    const timer = setInterval(
      () => setRefreshIndex((value) => value + 1),
      60 * 60 * 1000,
    );
    return () => clearInterval(timer);
  }, []);
  const selectCurrency = useCallback((currency: Currency) => {
    setPreferred(currency);
    try {
      localStorage.setItem(CURRENCY_KEY, currency);
    } catch {
      /* Session-only preference. */
    }
  }, []);
  const refresh = useCallback(() => setRefreshIndex((value) => value + 1), []);
  const currency = preferred === "RUB" || rates ? preferred : "RUB";
  const money = useMemo(
    () => createMoneyFormatter(currency, rates?.rubPerUnit),
    [currency, rates],
  );
  const value = useMemo(
    () => ({ currency, selectCurrency, rates, loading, error, refresh, money }),
    [currency, selectCurrency, rates, loading, error, refresh, money],
  );
  return (
    <CurrencyContext.Provider value={value}>
      {children}
    </CurrencyContext.Provider>
  );
}
export function useCurrency() {
  const context = useContext(CurrencyContext);
  if (!context) throw new Error("CurrencyProvider отсутствует.");
  return context;
}
export function useMoney() {
  return useCurrency().money;
}
