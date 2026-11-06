import {
  CATEGORIES,
  activeSubscriptions,
  addDays,
  dateKey,
  money,
  monthStart,
  monthlyCost,
  occurrences,
  shortDate,
  type AppData,
} from "./domain";
import { EmptyState, Icon, ServiceIcon } from "./components";

export function CategoryBreakdown({
  data,
  compact = false,
}: {
  data: AppData;
  compact?: boolean;
}) {
  const active = activeSubscriptions(data);
  const total = active.reduce((sum, s) => sum + monthlyCost(s), 0);
  const categories = Object.entries(CATEGORIES)
    .map(([key, meta]) => ({
      key,
      ...meta,
      amount: active
        .filter((s) => s.category === key)
        .reduce((sum, s) => sum + monthlyCost(s), 0),
    }))
    .filter((c) => c.amount > 0)
    .sort((a, b) => b.amount - a.amount);
  return (
    <section className={`panel category-panel ${compact ? "compact" : ""}`}>
      <div className="panel-heading">
        <h3>Расходы по категориям</h3>
        <span className="muted-label">в месяц</span>
      </div>
      {total > 0 ? (
        <>
          <div
            className="category-strip"
            aria-label="Распределение месячных расходов"
          >
            {categories.map((cat) => (
              <span
                key={cat.key}
                style={{
                  width: `${(cat.amount / total) * 100}%`,
                  background: cat.color,
                }}
                title={`${cat.name}: ${money(cat.amount, true)}`}
              />
            ))}
          </div>
          <div className="category-legend">
            {categories.map((cat) => (
              <div key={cat.key}>
                <span
                  className="legend-dot"
                  style={{ background: cat.color }}
                />
                <span>{cat.name}</span>
                <strong>{money(cat.amount)}</strong>
                {!compact && (
                  <small>{Math.round((cat.amount / total) * 100)}%</small>
                )}
              </div>
            ))}
          </div>
        </>
      ) : (
        <EmptyState
          title="Пока нет расходов"
          text="Добавьте активную подписку для расчета."
        />
      )}
    </section>
  );
}
export default function AnalyticsView({
  data,
  today,
  onExport,
}: {
  data: AppData;
  today: Date;
  onExport: () => void;
}) {
  const active = activeSubscriptions(data);
  const monthly = active.reduce((sum, sub) => sum + monthlyCost(sub), 0);
  const months = Array.from({ length: 6 }, (_, i) => {
    const first = monthStart(today, i),
      last = addDays(monthStart(today, i + 1), -1);
    const events = occurrences(active, i === 0 ? today : first, last);
    return {
      date: first,
      total: events.reduce((sum, e) => sum + e.subscription.amount, 0),
      count: events.length,
    };
  });
  const max = Math.max(...months.map((m) => m.total), 1);
  const paidThisMonth = data.payments
    .filter((p) => p.paidOn.slice(0, 7) === dateKey(today).slice(0, 7))
    .reduce((sum, p) => sum + p.amount, 0);
  const sorted = [...active].sort((a, b) => monthlyCost(b) - monthlyCost(a));
  return (
    <>
      <div className="analytics-stats">
        <section className="panel analytics-stat">
          <span className="stat-symbol violet">
            <Icon name="wallet" />
          </span>
          <span>
            Средний расход в месяц<strong>{money(monthly, true)}</strong>
            <small>Годовые тарифы разделены на 12</small>
          </span>
        </section>
        <section className="panel analytics-stat">
          <span className="stat-symbol green">
            <Icon name="checks" />
          </span>
          <span>
            Отмечено оплат в этом месяце<strong>{money(paidThisMonth)}</strong>
            <small>По вашему журналу платежей</small>
          </span>
        </section>
        <section className="panel analytics-stat">
          <span className="stat-symbol orange">
            <Icon name="target" />
          </span>
          <span>
            Свободно в месячном бюджете
            <strong>{money(data.settings.budget - monthly)}</strong>
            <small>Бюджет: {money(data.settings.budget)}</small>
          </span>
        </section>
      </div>
      <div className="analytics-columns">
        <section className="panel forecast-panel">
          <div className="panel-heading">
            <div>
              <h3>План предстоящих платежей</h3>
              <p>Ближайшие 6 месяцев</p>
            </div>
            <span className="tag">Прогноз</span>
          </div>
          <div className="bar-chart">
            {months.map((month, i) => (
              <div className="bar-column" key={month.date.toISOString()}>
                <span className="bar-value">{money(month.total)}</span>
                <div className="bar-track">
                  <div
                    className={`chart-bar ${i === 0 ? "current" : ""}`}
                    style={{
                      height: `${Math.max(month.total > 0 ? 3 : 0, (month.total / max) * 100)}%`,
                    }}
                  />
                </div>
                <span className="bar-label">
                  {month.date
                    .toLocaleDateString("ru-RU", { month: "short" })
                    .replace(".", "")}
                </span>
                <small>{month.count} плат.</small>
              </div>
            ))}
          </div>
          <p className="chart-caption">
            <Icon name="info" size={14} />
            Текущий месяц — с сегодняшнего дня. Паузы и уже отмеченные оплаты
            исключены.
          </p>
        </section>
        <CategoryBreakdown data={data} />
      </div>
      <div className="analytics-columns">
        <section className="panel">
          <div className="panel-heading">
            <h3>Самые затратные подписки</h3>
            <span className="muted-label">в месяц</span>
          </div>
          {sorted.length ? (
            <div className="rank-list">
              {sorted.slice(0, 5).map((sub, i) => (
                <div className="rank-item" key={sub.id}>
                  <span className="rank-number">
                    {String(i + 1).padStart(2, "0")}
                  </span>
                  <ServiceIcon subscription={sub} small />
                  <div>
                    <strong>{sub.name}</strong>
                    <div className="rank-progress">
                      <span
                        style={{
                          width: `${(monthlyCost(sub) / monthlyCost(sorted[0])) * 100}%`,
                          background: CATEGORIES[sub.category].color,
                        }}
                      />
                    </div>
                  </div>
                  <strong>{money(monthlyCost(sub), true)}</strong>
                </div>
              ))}
            </div>
          ) : (
            <EmptyState
              title="Добавьте подписки"
              text="Здесь появится рейтинг ваших расходов."
            />
          )}
        </section>
        <section className="panel payment-history">
          <div className="panel-heading">
            <h3>Журнал оплат</h3>
            <button
              className="icon-button"
              onClick={onExport}
              aria-label="Скачать резервную копию с журналом оплат"
            >
              <Icon name="download" size={17} />
            </button>
          </div>
          {data.payments.length ? (
            <div className="history-list">
              {data.payments.slice(0, 20).map((payment) => (
                <div key={payment.id}>
                  <span className="payment-check">
                    <Icon name="check" size={16} />
                  </span>
                  <span>
                    <strong>{payment.name}</strong>
                    <small>
                      {shortDate(payment.paidOn, true)} · за{" "}
                      {shortDate(payment.scheduledDate)}
                    </small>
                  </span>
                  <strong>{money(payment.amount)}</strong>
                </div>
              ))}
            </div>
          ) : (
            <EmptyState
              title="История начинается с первой оплаты"
              text="Нажмите галочку на карточке подписки, когда оплатите сервис."
            />
          )}
          {data.payments.length > 20 && (
            <p className="chart-caption">
              Последние 20 записей. Полная история доступна в JSON-копии.
            </p>
          )}
        </section>
      </div>
    </>
  );
}
