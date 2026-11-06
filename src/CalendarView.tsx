import { useMemo, useState } from "react";
import { EmptyState, Icon, UpcomingItem } from "./components";
import {
  addDays,
  dateKey,
  money,
  monthName,
  monthStart,
  occurrences,
  shortDate,
  type Subscription,
} from "./domain";

export function MiniCalendar({
  subscriptions,
  today,
  onOpen,
}: {
  subscriptions: Subscription[];
  today: Date;
  onOpen: () => void;
}) {
  const first = monthStart(today),
    last = addDays(monthStart(today, 1), -1);
  const events = occurrences(subscriptions, first, last);
  const offset = (first.getDay() + 6) % 7;
  return (
    <div className="mini-calendar">
      <div className="mini-calendar-title">
        <strong>{monthName(today)}</strong>
        <button
          className="icon-button"
          aria-label="Открыть календарь платежей"
          onClick={onOpen}
        >
          <Icon name="arrowUp" size={17} />
        </button>
      </div>
      <div className="mini-calendar-grid">
        {["Пн", "Вт", "Ср", "Чт", "Пт", "Сб", "Вс"].map((day) => (
          <span key={day} className="weekday">
            {day}
          </span>
        ))}
        {Array.from({ length: offset }, (_, i) => (
          <span key={`empty-${i}`} />
        ))}
        {Array.from({ length: last.getDate() }, (_, i) => {
          const key = dateKey(
            new Date(first.getFullYear(), first.getMonth(), i + 1),
          );
          const hasPayment = events.some((e) => e.date === key);
          return (
            <button
              key={key}
              onClick={onOpen}
              aria-label={`${i + 1}${hasPayment ? ", есть платеж" : ""}`}
              className={`${i + 1 === today.getDate() ? "today" : ""} ${hasPayment ? "has-payment" : ""}`}
            >
              {i + 1}
            </button>
          );
        })}
      </div>
      <div className="calendar-legend">
        <span />
        День продления подписки
      </div>
    </div>
  );
}
export default function CalendarView({
  subscriptions,
  today,
  onEdit,
  onExport,
}: {
  subscriptions: Subscription[];
  today: Date;
  onEdit: (sub: Subscription) => void;
  onExport: () => void;
}) {
  const [month, setMonth] = useState(monthStart(today));
  const [selected, setSelected] = useState(dateKey(today));
  const first = monthStart(month),
    end = addDays(monthStart(month, 1), -1);
  const events = useMemo(
    () => occurrences(subscriptions, first, end),
    [subscriptions, first.getTime(), end.getTime()],
  );
  const selectedEvents = events.filter((e) => e.date === selected);
  const offset = (first.getDay() + 6) % 7;
  const cells = Math.ceil((offset + end.getDate()) / 7) * 7;
  return (
    <div className="calendar-layout">
      <section className="panel calendar-panel">
        <div className="calendar-toolbar">
          <div className="month-switcher">
            <button
              className="icon-button"
              aria-label="Предыдущий месяц"
              disabled={first.getFullYear() <= 2000 && first.getMonth() === 0}
              onClick={() => setMonth(monthStart(month, -1))}
            >
              <Icon name="chevronLeft" />
            </button>
            <h2>{monthName(month)}</h2>
            <button
              className="icon-button"
              aria-label="Следующий месяц"
              disabled={first.getFullYear() >= 2100 && first.getMonth() === 11}
              onClick={() => setMonth(monthStart(month, 1))}
            >
              <Icon name="chevronRight" />
            </button>
          </div>
          <button
            className="button secondary small-button"
            onClick={() => {
              setMonth(monthStart(today));
              setSelected(dateKey(today));
            }}
          >
            Сегодня
          </button>
        </div>
        <div className="calendar-weekdays">
          {[
            "Понедельник",
            "Вторник",
            "Среда",
            "Четверг",
            "Пятница",
            "Суббота",
            "Воскресенье",
          ].map((day) => (
            <span key={day}>{day.slice(0, 2)}</span>
          ))}
        </div>
        <div className="calendar-grid">
          {Array.from({ length: cells }, (_, i) => {
            const date = addDays(first, i - offset);
            const key = dateKey(date);
            const inMonth = date.getMonth() === month.getMonth();
            const dayEvents = events.filter((e) => e.date === key);
            return (
              <button
                key={key}
                aria-label={`${shortDate(key, true)}, платежей: ${dayEvents.length}`}
                aria-pressed={selected === key}
                onClick={() => {
                  setSelected(key);
                  if (!inMonth) setMonth(monthStart(date));
                }}
                className={`calendar-cell ${!inMonth ? "outside" : ""} ${selected === key ? "selected" : ""} ${key === dateKey(today) ? "today" : ""}`}
              >
                <span className="day-number">{date.getDate()}</span>
                <div className="day-events">
                  {dayEvents.slice(0, 2).map((event) => (
                    <span
                      key={event.subscription.id}
                      className="day-event"
                      style={
                        {
                          "--event-color":
                            event.subscription.category === "music"
                              ? "#36a77b"
                              : "#7774de",
                        } as React.CSSProperties
                      }
                    >
                      {event.subscription.name}
                      <b>{money(event.subscription.amount)}</b>
                    </span>
                  ))}
                  {dayEvents.length > 2 && (
                    <small>Еще {dayEvents.length - 2}</small>
                  )}
                </div>
                {dayEvents.length > 0 && <span className="mobile-event-dot" />}
              </button>
            );
          })}
        </div>
        <div className="calendar-summary">
          <span>
            <span className="legend-dot" />
            Плановые продления
          </span>
          <strong>
            {money(events.reduce((sum, e) => sum + e.subscription.amount, 0))}
            <small> / {events.length} платежей за месяц</small>
          </strong>
        </div>
      </section>
      <aside className="calendar-sidebar">
        <section className="panel selected-day">
          <div className="panel-heading">
            <h3>{shortDate(selected, true)}</h3>
            <span className="count-label">{selectedEvents.length}</span>
          </div>
          {selectedEvents.length ? (
            selectedEvents.map((e) => (
              <UpcomingItem
                key={e.subscription.id}
                sub={e.subscription}
                date={e.date}
                today={today}
                onClick={() => onEdit(e.subscription)}
              />
            ))
          ) : (
            <EmptyState
              title="Без платежей"
              text="На этот день продлений не запланировано."
            />
          )}
        </section>
        <section className="tip-card">
          <span className="tip-icon">
            <Icon name="calendar" size={25} />
          </span>
          <h3>Напоминания всегда рядом</h3>
          <p>
            Перенесите план продлений на год в свой календарь. В каждом событии
            уже есть напоминание.
          </p>
          <button className="button secondary" onClick={onExport}>
            <Icon name="download" size={16} />
            Скачать .ics
          </button>
        </section>
        <p className="aside-note">
          Календарь показывает будущие продления активных подписок. После
          изменения данных экспортируйте файл заново.
        </p>
      </aside>
    </div>
  );
}
