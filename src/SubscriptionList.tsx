import { useMemo, useState } from "react";
import { EmptyState, Icon, ServiceIcon, SubscriptionCard } from "./components";
import {
  CATEGORIES,
  dueLabel,
  money,
  shortDate,
  type Subscription,
} from "./domain";

export default function SubscriptionList({
  subscriptions,
  today,
  onEdit,
  onToggle,
  onPay,
  onAdd,
  compact = false,
  onViewAll,
}: {
  subscriptions: Subscription[];
  today: Date;
  onEdit: (sub: Subscription) => void;
  onToggle: (sub: Subscription) => void;
  onPay: (sub: Subscription) => void;
  onAdd: () => void;
  compact?: boolean;
  onViewAll: () => void;
}) {
  const [status, setStatus] = useState("all");
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("all");
  const [sort, setSort] = useState("date");
  const [layout, setLayout] = useState("grid");
  const filtered = useMemo(
    () =>
      subscriptions
        .filter(
          (sub) =>
            (status === "all" || sub.status === status) &&
            (category === "all" || sub.category === category) &&
            sub.name
              .toLocaleLowerCase("ru")
              .includes(search.trim().toLocaleLowerCase("ru")),
        )
        .sort((a, b) =>
          sort === "price"
            ? b.amount - a.amount
            : sort === "name"
              ? a.name.localeCompare(b.name, "ru")
              : a.nextPayment.localeCompare(b.nextPayment),
        ),
    [subscriptions, status, category, search, sort],
  );
  const displayed = compact ? filtered.slice(0, 6) : filtered;
  return (
    <section className="subscriptions-section">
      <div className="section-heading">
        <h2>
          Мои подписки{" "}
          <span className="count-label">{subscriptions.length}</span>
        </h2>
        {compact ? (
          <button className="text-button" onClick={onViewAll}>
            Все подписки
            <Icon name="arrowRight" size={16} />
          </button>
        ) : (
          <button className="button secondary small-button" onClick={onAdd}>
            <Icon name="plus" size={16} />
            Добавить
          </button>
        )}
      </div>
      <div className="subscription-controls">
        <div className="tabs" aria-label="Статус подписок">
          {[
            ["all", "Все"],
            ["active", "Активные"],
            ["paused", "На паузе"],
          ].map(([value, label]) => (
            <button
              key={value}
              className={status === value ? "selected" : ""}
              aria-pressed={status === value}
              onClick={() => setStatus(value)}
            >
              {label}
            </button>
          ))}
        </div>
        <div className="layout-toggle">
          <button
            aria-label="Показать карточками"
            aria-pressed={layout === "grid"}
            className={layout === "grid" ? "selected" : ""}
            onClick={() => setLayout("grid")}
          >
            <Icon name="grid" size={17} />
          </button>
          <button
            aria-label="Показать списком"
            aria-pressed={layout === "list"}
            className={layout === "list" ? "selected" : ""}
            onClick={() => setLayout("list")}
          >
            <Icon name="list" size={18} />
          </button>
        </div>
      </div>
      <div className="search-controls">
        <label className="search-field">
          <Icon name="search" size={17} />
          <input
            aria-label="Поиск подписок"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Найти подписку…"
          />
          {search && (
            <button
              className="icon-button"
              aria-label="Очистить поиск"
              onClick={() => setSearch("")}
            >
              <Icon name="x" size={14} />
            </button>
          )}
        </label>
        <select
          aria-label="Фильтр по категории"
          value={category}
          onChange={(e) => setCategory(e.target.value)}
        >
          <option value="all">Все категории</option>
          {Object.entries(CATEGORIES).map(([key, cat]) => (
            <option key={key} value={key}>
              {cat.name}
            </option>
          ))}
        </select>
        {!compact && (
          <select
            aria-label="Сортировка подписок"
            value={sort}
            onChange={(e) => setSort(e.target.value)}
          >
            <option value="date">По дате оплаты</option>
            <option value="price">По стоимости</option>
            <option value="name">По названию</option>
          </select>
        )}
      </div>
      {displayed.length === 0 ? (
        <div className="panel">
          <EmptyState
            title={
              subscriptions.length
                ? "Ничего не найдено"
                : "Здесь будут ваши подписки"
            }
            text={
              subscriptions.length
                ? "Измените запрос или выберите другую категорию."
                : "Добавьте первый сервис, а мы поможем следить за продлением."
            }
            action={
              subscriptions.length ? (
                <button
                  className="button secondary"
                  onClick={() => {
                    setSearch("");
                    setCategory("all");
                    setStatus("all");
                  }}
                >
                  Сбросить фильтры
                </button>
              ) : (
                <button className="button primary" onClick={onAdd}>
                  <Icon name="plus" size={17} />
                  Добавить подписку
                </button>
              )
            }
          />
        </div>
      ) : layout === "grid" ? (
        <div className="subscription-grid">
          {displayed.map((sub) => (
            <SubscriptionCard
              key={sub.id}
              sub={sub}
              today={today}
              edit={() => onEdit(sub)}
              toggle={() => onToggle(sub)}
              pay={() => onPay(sub)}
            />
          ))}
        </div>
      ) : (
        <div className="table-wrap panel">
          <table className="subscription-table">
            <thead>
              <tr>
                <th>Сервис</th>
                <th>Стоимость</th>
                <th>Продление</th>
                <th>
                  <span className="sr-only">Действия</span>
                </th>
              </tr>
            </thead>
            <tbody>
              {displayed.map((sub) => (
                <tr key={sub.id}>
                  <td>
                    <button
                      className="table-service"
                      onClick={() => onEdit(sub)}
                    >
                      <ServiceIcon subscription={sub} small />
                      <span>
                        <strong>{sub.name}</strong>
                        <small>
                          {sub.status === "paused"
                            ? "На паузе"
                            : CATEGORIES[sub.category].name}
                        </small>
                      </span>
                    </button>
                  </td>
                  <td>
                    <strong>{money(sub.amount)}</strong>
                    <small>
                      за {sub.cycle === "monthly" ? "месяц" : "год"}
                    </small>
                  </td>
                  <td>
                    {shortDate(sub.nextPayment)}
                    <small>
                      {sub.status === "active"
                        ? dueLabel(sub.nextPayment, today)
                        : "На паузе"}
                    </small>
                  </td>
                  <td>
                    <button
                      className="icon-button"
                      aria-label={`Редактировать ${sub.name}`}
                      onClick={() => onEdit(sub)}
                    >
                      <Icon name="pencil" size={16} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      {compact && filtered.length > 6 && (
        <button className="button secondary show-more" onClick={onViewAll}>
          Показать еще {filtered.length - 6}
          <Icon name="arrowRight" size={16} />
        </button>
      )}
      <div className="section-footnote">
        <Icon name="shield" size={14} />
        Ваши данные хранятся только в этом браузере.
      </div>
    </section>
  );
}
