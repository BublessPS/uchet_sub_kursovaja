import { useState, type FormEvent } from "react";
import { Icon, Modal } from "./components";
import {
  CATEGORIES,
  dateKey,
  isHttpUrl,
  parseDate,
  type Category,
  type Cycle,
  type Subscription,
} from "./domain";

export default function SubscriptionForm({
  sub,
  reminderDays,
  onClose,
  onSave,
  onDelete,
}: {
  sub?: Subscription;
  reminderDays: number;
  onClose: () => void;
  onSave: (sub: Subscription) => void;
  onDelete: (sub: Subscription) => void;
}) {
  const [name, setName] = useState(sub?.name ?? "");
  const [category, setCategory] = useState<Category>(
    sub?.category ?? "entertainment",
  );
  const [amount, setAmount] = useState(String(sub?.amount ?? ""));
  const [cycle, setCycle] = useState<Cycle>(sub?.cycle ?? "monthly");
  const [date, setDate] = useState(sub?.nextPayment ?? dateKey(new Date()));
  const [reminder, setReminder] = useState(sub?.reminderDays ?? reminderDays);
  const [status, setStatus] = useState(sub?.status ?? "active");
  const [note, setNote] = useState(sub?.note ?? "");
  const [source, setSource] = useState(sub?.sourceUrl ?? "");
  const [priceType, setPriceType] = useState(sub?.priceType ?? "manual");
  const [error, setError] = useState("");
  function submit(e: FormEvent) {
    e.preventDefault();
    const value = Number(amount.replace(",", "."));
    if (!name.trim()) {
      setError("Введите название сервиса.");
      return;
    }
    if (
      !Number.isFinite(value) ||
      value <= 0 ||
      value > 10000000 ||
      Math.abs(value * 100 - Math.round(value * 100)) > 0.000001
    ) {
      setError(
        "Введите сумму от 0,01 до 10 000 000 ₽, не более двух знаков после запятой.",
      );
      return;
    }
    if (
      (source && !isHttpUrl(source)) ||
      (priceType === "official" && !source)
    ) {
      setError("Укажите ссылку на официальный тариф, начиная с https://.");
      return;
    }
    const next = parseDate(date);
    const preserveAnchor =
      sub && date === sub.nextPayment && cycle === sub.cycle;
    onSave({
      id: sub?.id ?? crypto.randomUUID(),
      name: name.trim(),
      category,
      amount: value,
      cycle,
      nextPayment: date,
      billingDay: preserveAnchor ? sub.billingDay : next.getDate(),
      billingMonth: preserveAnchor ? sub.billingMonth : next.getMonth(),
      reminderDays: reminder,
      status,
      note: note.trim(),
      sourceUrl: source.trim(),
      priceType,
    });
  }
  return (
    <Modal
      title={sub ? "Редактировать подписку" : "Новая подписка"}
      eyebrow="ВАШИ СЕРВИСЫ"
      onClose={onClose}
    >
      <form onSubmit={submit} className="subscription-form">
        {priceType === "demo" && (
          <div className="price-example-note">
            <Icon name="info" size={17} />
            <span>
              Пример суммы в рублях. Уточните цену в своем аккаунте и измените
              ее для точного учета.
            </span>
          </div>
        )}
        <label>
          Название сервиса
          <input
            data-autofocus
            required
            maxLength={60}
            placeholder="Например, музыкальный сервис"
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
        </label>
        <div className="form-row">
          <label>
            Категория
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value as Category)}
            >
              {Object.entries(CATEGORIES).map(([key, value]) => (
                <option key={key} value={key}>
                  {value.name}
                </option>
              ))}
            </select>
          </label>
          <label>
            Статус
            <select
              value={status}
              onChange={(e) =>
                setStatus(e.target.value as Subscription["status"])
              }
            >
              <option value="active">Активна</option>
              <option value="paused">На паузе</option>
            </select>
          </label>
        </div>
        <div className="form-row">
          <label>
            Стоимость, ₽
            <input
              required
              inputMode="decimal"
              placeholder="0,00"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              maxLength={12}
            />
          </label>
          <label>
            Период оплаты
            <select
              value={cycle}
              onChange={(e) => setCycle(e.target.value as Cycle)}
            >
              <option value="monthly">Каждый месяц</option>
              <option value="yearly">Каждый год</option>
            </select>
          </label>
        </div>
        <div className="form-row">
          <label>
            Следующая оплата
            <input
              type="date"
              required
              min="2000-01-01"
              max="2100-12-31"
              value={date}
              onChange={(e) => setDate(e.target.value)}
            />
          </label>
          <label>
            Напомнить за
            <select
              value={reminder}
              onChange={(e) => setReminder(Number(e.target.value))}
            >
              {Array.from(new Set([0, 1, 3, 5, 7, 14, 30, reminder]))
                .sort((a, b) => a - b)
                .map((d) => (
                  <option key={d} value={d}>
                    {d === 0 ? "В день оплаты" : `${d} дн. до оплаты`}
                  </option>
                ))}
            </select>
          </label>
        </div>
        <details
          className="form-details"
          open={
            Boolean(sub?.sourceUrl) || priceType === "official" || undefined
          }
        >
          <summary>
            Источник цены и заметка
            <Icon name="chevronDown" size={16} />
          </summary>
          <div className="detail-fields">
            <label>
              Источник стоимости
              <select
                value={priceType}
                onChange={(e) =>
                  setPriceType(e.target.value as Subscription["priceType"])
                }
              >
                <option value="manual">Указана вручную</option>
                <option value="official">Официальный тариф</option>
                {sub?.priceType === "demo" && (
                  <option value="demo">Демонстрационная цена</option>
                )}
              </select>
            </label>
            <label>
              Ссылка на тариф
              <input
                type="url"
                maxLength={2000}
                placeholder="https://example.com/pricing"
                value={source}
                onChange={(e) => setSource(e.target.value)}
                required={priceType === "official"}
              />
              {isHttpUrl(source.trim()) && (
                <a
                  className="source-page-link"
                  href={source.trim()}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  <Icon name="external" size={13} />
                  Открыть официальный источник
                </a>
              )}
            </label>
            <label>
              Заметка
              <textarea
                rows={2}
                maxLength={1000}
                placeholder="Название тарифа, условия продления…"
                value={note}
                onChange={(e) => setNote(e.target.value)}
              />
            </label>
          </div>
        </details>
        {error && (
          <p role="alert" className="form-error">
            {error}
          </p>
        )}
        <div className="form-note">
          <Icon name="shield" size={16} />
          <span>
            Подписка сохраняется в этом браузере. Оплата отмечается вручную.
          </span>
        </div>
        <div className="modal-footer">
          {sub && (
            <button
              type="button"
              className="icon-button danger"
              aria-label={`Удалить ${sub.name}`}
              onClick={() => onDelete(sub)}
            >
              <Icon name="trash" />
            </button>
          )}
          <div className="footer-right">
            <button
              type="button"
              className="button secondary"
              onClick={onClose}
            >
              Отмена
            </button>
            <button className="button primary" type="submit">
              <Icon name="check" size={17} />
              {sub ? "Сохранить" : "Добавить подписку"}
            </button>
          </div>
        </div>
      </form>
    </Modal>
  );
}
