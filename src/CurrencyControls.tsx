import { CBR_SOURCE, type Currency } from "./currency";
import { useCurrency } from "./CurrencyProvider";
import { Icon } from "./components";

export function CurrencySelect() {
  const { currency, selectCurrency, rates } = useCurrency();
  return (
    <label className="currency-select">
      <span className="sr-only">Валюта отображения</span>
      <select
        aria-label="Валюта отображения"
        value={currency}
        onChange={(e) => selectCurrency(e.target.value as Currency)}
        title="Пересчет по официальному курсу ЦБ"
      >
        <option value="RUB">₽ RUB</option>
        <option value="USD" disabled={!rates}>
          $ USD
        </option>
        <option value="EUR" disabled={!rates}>
          € EUR
        </option>
      </select>
    </label>
  );
}
export function CurrencyStatus() {
  const { rates, loading, error, refresh, currency } = useCurrency();
  const rate = (amount: number) =>
    new Intl.NumberFormat("ru-RU", { maximumFractionDigits: 4 }).format(amount);
  const date = rates?.date.split("-").reverse().join(".");
  return (
    <div
      className={`currency-status ${error || rates?.stale ? "rate-stale" : ""}`}
    >
      <Icon name={error ? "info" : "refresh"} size={12} />
      <span>
        {rates ? (
          <>
            <a href={CBR_SOURCE} target="_blank" rel="noopener noreferrer">
              ЦБ · {date}
            </a>
            <span className="exchange-values">
              1 $ = {rate(rates.rubPerUnit.USD)} ₽ <i />1 € ={" "}
              {rate(rates.rubPerUnit.EUR)} ₽
            </span>
            {rates.stale && (
              <span className="rate-cache-label">Сохраненный курс</span>
            )}
          </>
        ) : loading ? (
          "Получаем курс Банка России…"
        ) : (
          "Курс недоступен · суммы пока в рублях"
        )}
      </span>
      <button
        className="icon-button"
        aria-label="Обновить курс валют"
        title={error || "Обновить курс Банка России"}
        disabled={loading}
        onClick={refresh}
      >
        <Icon name="refresh" size={12} />
      </button>
      {currency !== "RUB" && <small>Пересчет для отображения</small>}
    </div>
  );
}
