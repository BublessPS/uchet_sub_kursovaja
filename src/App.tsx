import { useEffect, useState } from "react";
import { CategoryBreakdown } from "./AnalyticsView";
import AnalyticsView from "./AnalyticsView";
import CalendarView, { MiniCalendar } from "./CalendarView";
import {
  EmptyState,
  Icon,
  Modal,
  UpcomingItem,
  type IconName,
} from "./components";
import SettingsView from "./SettingsView";
import SubscriptionForm from "./SubscriptionForm";
import SubscriptionList from "./SubscriptionList";
import {
  activeSubscriptions,
  addDays,
  calendarExport,
  createDemoData,
  csvExport,
  dateKey,
  daysUntil,
  dueLabel,
  money,
  monthlyCost,
  nextDate,
  recordPayment,
  shortDate,
  validateData,
  type AppData,
  type Subscription,
} from "./domain";
import { useAppData } from "./useAppData";

type View =
  "overview" | "subscriptions" | "calendar" | "analytics" | "settings";
const NAV: Array<{ id: View; label: string; icon: IconName }> = [
  { id: "overview", label: "Обзор", icon: "overview" },
  { id: "subscriptions", label: "Мои подписки", icon: "subscriptions" },
  { id: "calendar", label: "Календарь", icon: "calendar" },
  { id: "analytics", label: "Аналитика", icon: "analytics" },
];
const PAGE_TITLES: Record<View, [string, string]> = {
  overview: [
    "Всё о ваших подписках",
    "Меньше неожиданных списаний. Больше спокойствия.",
  ],
  subscriptions: ["Мои подписки", "Все любимые сервисы — в одном месте."],
  calendar: [
    "Календарь платежей",
    "Знайте заранее, когда продлевается каждый сервис.",
  ],
  analytics: ["Аналитика расходов", "Понимайте, куда уходит ваш бюджет."],
  settings: ["Настройки", "Ваш бюджет, напоминания и данные."],
};
interface Confirmation {
  title: string;
  text: string;
  label: string;
  dangerous?: boolean;
  action: () => void;
}

function download(content: string, filename: string, type: string) {
  const url = URL.createObjectURL(new Blob([content], { type }));
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  document.body.append(anchor);
  anchor.click();
  anchor.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export default function App() {
  const { data, setData, storageError } = useAppData();
  const [view, setView] = useState<View>("overview");
  const [today, setToday] = useState(new Date());
  const [editing, setEditing] = useState<Subscription | "new" | null>(null);
  const [mobileMenu, setMobileMenu] = useState(false);
  const [toast, setToast] = useState("");
  const [confirmation, setConfirmation] = useState<Confirmation | null>(null);
  const [showReminders, setShowReminders] = useState(false);
  const [showHelp, setShowHelp] = useState(false);
  const active = activeSubscriptions(data);
  const monthly = active.reduce((total, sub) => total + monthlyCost(sub), 0);
  const upcoming = [...active].sort((a, b) =>
    a.nextPayment.localeCompare(b.nextPayment),
  );
  const reminders = upcoming.filter(
    (sub) => daysUntil(sub.nextPayment, today) <= sub.reminderDays,
  );
  const next = upcoming[0];
  const demoCount = data.subscriptions.filter(
    (sub) => sub.priceType === "demo",
  ).length;
  const budgetPercent = (monthly / data.settings.budget) * 100;
  const currentViewName = [...NAV, { id: "settings", label: "Настройки" }].find(
    (n) => n.id === view,
  )!.label;

  useEffect(() => {
    const timer = setInterval(() => setToday(new Date()), 60000);
    return () => clearInterval(timer);
  }, []);
  useEffect(() => {
    if (!toast) return;
    const timer = setTimeout(() => setToast(""), 5500);
    return () => clearTimeout(timer);
  }, [toast]);
  useEffect(() => {
    if (
      !data.settings.notifications ||
      typeof Notification === "undefined" ||
      Notification.permission !== "granted"
    )
      return;
    for (const sub of reminders) {
      const key = `subly-notified:${sub.id}:${sub.nextPayment}`;
      try {
        if (localStorage.getItem(key)) continue;
        const notification = new Notification(`Скоро продление: ${sub.name}`, {
          body: `${dueLabel(sub.nextPayment, today)} · ${money(sub.amount)}. Проверьте подписку в Subly.`,
          icon: "/favicon.svg",
          tag: key,
        });
        notification.onclick = () => {
          window.focus();
          setShowReminders(true);
          notification.close();
        };
        localStorage.setItem(key, "1");
      } catch {
        /* The in-app reminder list remains available if the OS blocks notifications. */
      }
    }
  }, [data, today]);

  function navigate(nextView: View) {
    setView(nextView);
    setMobileMenu(false);
    window.scrollTo({ top: 0, behavior: "instant" });
  }
  function saveSubscription(sub: Subscription) {
    const exists = data.subscriptions.some((s) => s.id === sub.id);
    setData((current) => ({
      ...current,
      subscriptions: exists
        ? current.subscriptions.map((s) => (s.id === sub.id ? sub : s))
        : [...current.subscriptions, sub],
    }));
    setEditing(null);
    setToast(exists ? "Изменения сохранены" : "Подписка добавлена");
  }
  function toggleSubscription(sub: Subscription) {
    setData((current) => ({
      ...current,
      subscriptions: current.subscriptions.map((s) =>
        s.id === sub.id
          ? { ...s, status: s.status === "active" ? "paused" : "active" }
          : s,
      ),
    }));
    setToast(
      sub.status === "active"
        ? `${sub.name}: учет приостановлен. Отмена подписки у сервиса выполняется отдельно.`
        : `${sub.name}: учет возобновлен`,
    );
  }
  function deleteSubscription(sub: Subscription) {
    setEditing(null);
    setConfirmation({
      title: "Удалить подписку?",
      text: `«${sub.name}» исчезнет из списка и напоминаний. Записи об уже отмеченных оплатах останутся в журнале.`,
      label: "Удалить подписку",
      dangerous: true,
      action: () => {
        setData((current) => ({
          ...current,
          subscriptions: current.subscriptions.filter((s) => s.id !== sub.id),
        }));
        setToast("Подписка удалена");
      },
    });
  }
  function pay(sub: Subscription) {
    setConfirmation({
      title: "Отметить оплату?",
      text: `Запишем ${money(sub.amount, true)} за «${sub.name}» в журнал. Следующая дата продления — ${shortDate(nextDate(sub), true)}. Деньги через сайт не списываются.`,
      label: "Да, оплачено",
      action: () => {
        setData((current) => recordPayment(current, sub.id, today));
        setToast("Оплата записана. Дата продления перенесена.");
      },
    });
  }
  function exportJson() {
    download(
      JSON.stringify(data, null, 2),
      `subly-backup-${dateKey(today)}.json`,
      "application/json",
    );
    setToast("Резервная копия подготовлена");
  }
  function exportCsv() {
    download(
      csvExport(data),
      `subly-subscriptions-${dateKey(today)}.csv`,
      "text/csv;charset=utf-8",
    );
    setToast("Таблица подписок подготовлена");
  }
  function exportCalendar() {
    if (!active.length) {
      setToast("Добавьте активную подписку для экспорта календаря");
      return;
    }
    if (!active.some((s) => s.nextPayment <= dateKey(addDays(today, 366)))) {
      setToast("В ближайший год нет запланированных продлений");
      return;
    }
    download(
      calendarExport(data, today),
      "subly-reminders.ics",
      "text/calendar;charset=utf-8",
    );
    setToast("Календарь на год подготовлен. Откройте .ics в своем календаре.");
  }
  async function importJson(file: File) {
    if (file.size > 5000000) {
      setToast("Файл слишком большой. Максимальный размер — 5 МБ.");
      return;
    }
    try {
      const imported = validateData(JSON.parse(await file.text()));
      setConfirmation({
        title: "Восстановить данные?",
        text: `В копии ${imported.subscriptions.length} подписок и ${imported.payments.length} записей об оплатах. Текущие данные будут заменены. Сначала скачайте копию, если хотите их сохранить.`,
        label: "Восстановить",
        action: () => {
          setData(imported);
          setToast("Данные восстановлены");
          navigate("overview");
        },
      });
    } catch (error) {
      setToast(
        error instanceof SyntaxError
          ? "Не удалось прочитать JSON. Выберите резервную копию Subly."
          : error instanceof Error
            ? error.message
            : "Не удалось открыть файл.",
      );
    }
  }
  async function notifications() {
    if (data.settings.notifications) {
      setData((current) => ({
        ...current,
        settings: { ...current.settings, notifications: false },
      }));
      setToast("Уведомления отключены");
      return;
    }
    if (typeof Notification === "undefined") {
      setToast(
        "Браузер не поддерживает уведомления. Используйте экспорт календаря.",
      );
      return;
    }
    try {
      const permission = await Notification.requestPermission();
      if (permission === "granted") {
        setData((current) => ({
          ...current,
          settings: { ...current.settings, notifications: true },
        }));
        setToast(
          "Уведомления включены. Оставьте сайт открытым для проверки сроков.",
        );
      } else
        setToast(
          permission === "denied"
            ? "Уведомления запрещены браузером. Разрешите их в настройках сайта."
            : "Разрешение не выдано. Напоминания доступны по значку колокольчика.",
        );
    } catch {
      setToast(
        "Не удалось включить уведомления. Используйте напоминания в календаре.",
      );
    }
  }
  function replaceData(kind: "demo" | "clear") {
    setConfirmation({
      title:
        kind === "demo"
          ? "Вернуть демонстрационный пример?"
          : "Очистить все данные?",
      text: "Текущие подписки, журнал оплат и настройки будут заменены. При необходимости сначала скачайте JSON-копию.",
      label: kind === "demo" ? "Вернуть пример" : "Очистить данные",
      dangerous: true,
      action: () => {
        const replacement: AppData = createDemoData(today);
        if (kind === "clear") replacement.subscriptions = [];
        setData(replacement);
        navigate("overview");
        setToast(
          kind === "demo"
            ? "Демонстрационный пример восстановлен"
            : "Данные очищены. Можно добавить свои подписки.",
        );
      },
    });
  }

  const list = (compact: boolean) => (
    <SubscriptionList
      subscriptions={data.subscriptions}
      today={today}
      onEdit={setEditing}
      onToggle={toggleSubscription}
      onPay={pay}
      onAdd={() => setEditing("new")}
      compact={compact}
      onViewAll={() => navigate("subscriptions")}
    />
  );

  return (
    <div className="app-shell">
      {mobileMenu && (
        <button
          className="sidebar-backdrop"
          aria-label="Закрыть меню"
          onClick={() => setMobileMenu(false)}
        />
      )}
      <aside className={`sidebar ${mobileMenu ? "open" : ""}`}>
        <button
          className="brand"
          aria-label="Subly — на обзор"
          onClick={() => navigate("overview")}
        >
          <span className="brand-mark">
            <Icon name="layers" size={25} />
          </span>
          <span>
            subly<span className="brand-period">.</span>
          </span>
        </button>
        <div className="workspace-label">ЛИЧНОЕ ПРОСТРАНСТВО</div>
        <nav aria-label="Основная навигация">
          {NAV.map((item) => (
            <button
              className={`nav-item ${view === item.id ? "active" : ""}`}
              key={item.id}
              aria-label={item.label}
              onClick={() => navigate(item.id)}
              aria-current={view === item.id ? "page" : undefined}
            >
              <Icon name={item.icon} size={20} />
              <span>{item.label}</span>
              {item.id === "subscriptions" && (
                <span className="nav-count">{data.subscriptions.length}</span>
              )}
            </button>
          ))}
        </nav>
        <div className="sidebar-bottom">
          <div className="sidebar-tip">
            <div className="sidebar-tip-art">
              <span className="art-orbit" />
              <span className="art-card">
                <Icon name="subscriptions" size={30} />
              </span>
              <span className="art-check">
                <Icon name="check" size={12} />
              </span>
              <span className="art-spark">✦</span>
            </div>
            <h3>
              Подписки в порядке.
              <br />
              Голова свободна.
            </h3>
            <p>Планируйте расходы и не пропускайте важное.</p>
            <button onClick={() => setShowHelp(true)}>
              Как это работает
              <Icon name="arrowRight" size={14} />
            </button>
          </div>
          <button
            className={`nav-item ${view === "settings" ? "active" : ""}`}
            aria-label="Настройки"
            onClick={() => navigate("settings")}
            aria-current={view === "settings" ? "page" : undefined}
          >
            <Icon name="settings" size={20} />
            <span>Настройки</span>
          </button>
          <div className="sidebar-footer">
            <span className="online-dot" />
            Учебный проект<span>v1.0</span>
          </div>
        </div>
      </aside>
      <div className="main-shell">
        <header className="topbar">
          <div className="topbar-left">
            <button
              className="icon-button mobile-menu"
              aria-label="Открыть меню"
              onClick={() => setMobileMenu(true)}
            >
              <Icon name="menu" />
            </button>
            <span className="breadcrumb-root">Мое пространство</span>
            <span className="breadcrumb-divider">/</span>
            <span>{currentViewName}</span>
          </div>
          <div className="topbar-right">
            <span className={`saved-status ${storageError ? "has-error" : ""}`}>
              <span className="online-dot" />
              {storageError ? "Не сохранено" : "Данные сохранены"}
            </span>
            <button
              className="icon-button help-button"
              aria-label="Как работает Subly"
              onClick={() => setShowHelp(true)}
            >
              <Icon name="help" size={20} />
            </button>
            <button
              className="icon-button notification-button"
              aria-label={`Напоминания: ${reminders.length}`}
              onClick={() => setShowReminders(true)}
            >
              <Icon name="bell" size={21} />
              {reminders.length > 0 && <span className="notification-dot" />}
            </button>
            <span className="topbar-separator" />
            <button
              className="profile-avatar"
              title="Открыть настройки"
              onClick={() => navigate("settings")}
              aria-label="Открыть настройки"
            >
              ВЫ
            </button>
          </div>
        </header>
        <main className="main-content">
          <div className="page-title-row">
            <div>
              <div className="page-eyebrow">ВАШ ЦИФРОВОЙ ПОРЯДОК</div>
              <h1>{PAGE_TITLES[view][0]}</h1>
              <p>{PAGE_TITLES[view][1]}</p>
            </div>
            {view !== "settings" && (
              <button
                className="button primary add-subscription"
                onClick={() => setEditing("new")}
              >
                <Icon name="plus" size={18} />
                Добавить подписку
              </button>
            )}
          </div>
          {storageError && (
            <div className="storage-error" role="alert">
              <Icon name="alert" size={20} />
              <span>{storageError}</span>
              <button className="text-button" onClick={exportJson}>
                Скачать копию
              </button>
            </div>
          )}
          {demoCount > 0 && view !== "settings" && (
            <div className="demo-banner">
              <span className="demo-banner-icon">
                <Icon name="sparkles" size={17} />
              </span>
              <p>
                <strong>Ваши сервисы — в рублях</strong>
                <span>
                  {" "}
                  · Подписок с примерной ценой: {demoCount}. Источники и условия
                  доступны в карточках.
                </span>
              </p>
              <span className="demo-label">Все суммы в ₽</span>
            </div>
          )}
          {view === "overview" && (
            <>
              <div className="stats-grid">
                <section className="stat-card featured">
                  <div className="stat-card-head">
                    <span>Расходы в месяц</span>
                    <span className="stat-icon">
                      <Icon name="wallet" size={20} />
                    </span>
                  </div>
                  <strong className="stat-value">{money(monthly)}</strong>
                  <div className="stat-card-bottom">
                    <span className="stat-chip">
                      <Icon name="subscriptions" size={12} />
                      {active.length} активных
                    </span>
                    <span>в среднем за месяц</span>
                  </div>
                </section>
                <section className="stat-card">
                  <div className="stat-card-head">
                    <span>Расходы в год</span>
                    <span className="stat-icon violet">
                      <Icon name="analytics" size={20} />
                    </span>
                  </div>
                  <strong className="stat-value">{money(monthly * 12)}</strong>
                  <div className="stat-card-bottom">
                    <span className="muted-label">При текущих тарифах</span>
                  </div>
                </section>
                <section className="stat-card">
                  <div className="stat-card-head">
                    <span>Активные подписки</span>
                    <span className="stat-icon green">
                      <Icon name="subscriptions" size={20} />
                    </span>
                  </div>
                  <strong className="stat-value">
                    {String(active.length).padStart(2, "0")}
                    <span className="stat-total">
                      / {data.subscriptions.length}
                    </span>
                  </strong>
                  <div className="stat-card-bottom">
                    <span className="status-dot active" />
                    <span className="muted-label">
                      {data.subscriptions.length - active.length} на паузе
                    </span>
                  </div>
                </section>
                <section className="stat-card next-stat">
                  <div className="stat-card-head">
                    <span>Ближайшая оплата</span>
                    <span className="stat-icon orange">
                      <Icon name="calendar" size={20} />
                    </span>
                  </div>
                  <strong className="stat-value">
                    {next ? money(next.amount) : "—"}
                  </strong>
                  <div className="stat-card-bottom">
                    <span className="next-service">
                      {next?.name ?? "Нет активных подписок"}
                    </span>
                    {next && (
                      <span className="next-date">
                        {dueLabel(next.nextPayment, today)}
                      </span>
                    )}
                  </div>
                </section>
              </div>
              <div className="overview-layout">
                <div className="overview-primary">
                  {list(true)}
                  <CategoryBreakdown data={data} compact />
                </div>
                <aside className="overview-aside">
                  <section className="panel upcoming-panel">
                    <div className="panel-heading">
                      <h3>На горизонте</h3>
                      <span className="soft-icon">
                        <Icon name="calendar" size={17} />
                      </span>
                    </div>
                    <p className="panel-subtitle">Ближайшие продления</p>
                    <MiniCalendar
                      subscriptions={data.subscriptions}
                      today={today}
                      onOpen={() => navigate("calendar")}
                    />
                    <div className="upcoming-list">
                      {upcoming.length ? (
                        upcoming
                          .slice(0, 3)
                          .map((sub) => (
                            <UpcomingItem
                              key={sub.id}
                              sub={sub}
                              today={today}
                              onClick={() => setEditing(sub)}
                            />
                          ))
                      ) : (
                        <EmptyState
                          title="Пока всё спокойно"
                          text="Будущие продления появятся здесь."
                        />
                      )}
                    </div>
                    <button
                      className="calendar-open"
                      onClick={() => navigate("calendar")}
                    >
                      Открыть календарь
                      <Icon name="arrowRight" size={15} />
                    </button>
                  </section>
                  <section
                    className={`budget-card ${budgetPercent > 100 ? "over-budget" : ""}`}
                  >
                    <div className="panel-heading">
                      <span className="budget-title">
                        <Icon name="target" size={18} />
                        Месячный бюджет
                      </span>
                      <button
                        className="icon-button"
                        aria-label="Изменить месячный бюджет"
                        onClick={() => navigate("settings")}
                      >
                        <Icon name="sliders" size={16} />
                      </button>
                    </div>
                    <div className="budget-amount">
                      <strong>{money(monthly)}</strong>
                      <span>из {money(data.settings.budget)}</span>
                    </div>
                    <div
                      className="budget-track"
                      role="progressbar"
                      aria-label="Использование бюджета"
                      aria-valuenow={Math.round(Math.min(budgetPercent, 100))}
                      aria-valuemin={0}
                      aria-valuemax={100}
                    >
                      <span
                        style={{ width: `${Math.min(budgetPercent, 100)}%` }}
                      />
                    </div>
                    <p>
                      {budgetPercent > 100
                        ? `Бюджет превышен на ${money(monthly - data.settings.budget)}`
                        : `В запасе еще ${money(data.settings.budget - monthly)}`}
                      <Icon
                        name={budgetPercent > 100 ? "alert" : "sparkles"}
                        size={15}
                      />
                    </p>
                  </section>
                  <div className="aside-tip">
                    <span className="aside-tip-icon">
                      <Icon name="bell" size={19} />
                    </span>
                    <p>
                      <strong>Вспомним за вас</strong>Напоминания о продлении
                      уже ждут в колокольчике.
                    </p>
                  </div>
                </aside>
              </div>
            </>
          )}
          {view === "subscriptions" && (
            <>
              <div className="list-summary">
                <span>
                  <Icon name="subscriptions" size={18} />
                  <strong>{data.subscriptions.length}</strong> всего
                </span>
                <span>
                  <span className="status-dot active" />
                  <strong>{active.length}</strong> активных
                </span>
                <span className="list-summary-cost">
                  В среднем <strong>{money(monthly, true)}</strong> / мес.
                </span>
                <button className="text-button" onClick={exportCsv}>
                  <Icon name="download" size={16} />
                  Экспорт CSV
                </button>
              </div>
              {list(false)}
            </>
          )}
          {view === "calendar" && (
            <CalendarView
              subscriptions={data.subscriptions}
              today={today}
              onEdit={setEditing}
              onExport={exportCalendar}
            />
          )}
          {view === "analytics" && (
            <AnalyticsView data={data} today={today} onExport={exportJson} />
          )}
          {view === "settings" && (
            <SettingsView
              key={JSON.stringify(data.settings)}
              data={data}
              onSave={(settings) => {
                setData((current) => ({ ...current, settings }));
                setToast("Настройки сохранены");
              }}
              onNotifications={notifications}
              onExport={exportJson}
              onCsv={exportCsv}
              onImport={importJson}
              onReset={() => replaceData("demo")}
              onClear={() => replaceData("clear")}
            />
          )}
          <footer className="page-footer">
            <span>С заботой о вашем бюджете</span>
            <span>
              subly<span className="brand-period">.</span>
            </span>
          </footer>
        </main>
      </div>
      {editing && (
        <SubscriptionForm
          key={editing === "new" ? "new" : editing.id}
          sub={editing === "new" ? undefined : editing}
          reminderDays={data.settings.reminderDays}
          onClose={() => setEditing(null)}
          onSave={saveSubscription}
          onDelete={deleteSubscription}
        />
      )}
      {confirmation && (
        <Modal title={confirmation.title} onClose={() => setConfirmation(null)}>
          <p className="confirmation-text">{confirmation.text}</p>
          <div className="modal-footer">
            <button
              className="button secondary"
              onClick={() => setConfirmation(null)}
            >
              Отмена
            </button>
            <button
              className={`button ${confirmation.dangerous ? "danger-button" : "primary"}`}
              onClick={() => {
                confirmation.action();
                setConfirmation(null);
              }}
            >
              {confirmation.label}
            </button>
          </div>
        </Modal>
      )}
      {showReminders && (
        <Modal
          title="Напоминания о продлении"
          eyebrow="ДЕРЖИМ В КУРСЕ"
          onClose={() => setShowReminders(false)}
        >
          <p className="modal-intro">
            Здесь подписки, до продления которых осталось не больше выбранного
            срока напоминания, и просроченные оплаты.
          </p>
          <div className="reminders-list">
            {reminders.length ? (
              reminders.map((sub) => (
                <div key={sub.id}>
                  <UpcomingItem
                    sub={sub}
                    today={today}
                    onClick={() => {
                      setShowReminders(false);
                      setEditing(sub);
                    }}
                  />
                  <button
                    className="button secondary small-button"
                    onClick={() => {
                      setShowReminders(false);
                      pay(sub);
                    }}
                  >
                    <Icon name="check" size={15} />
                    Оплачено
                  </button>
                </div>
              ))
            ) : (
              <EmptyState
                title="Всё под контролем"
                text="Ближайших напоминаний нет. Сообщим здесь, когда подойдет срок."
              />
            )}
          </div>
          <div className="form-note">
            <Icon name="info" size={17} />
            <span>
              Уведомления браузера работают при открытом сайте. Для напоминаний
              вне сайта импортируйте .ics в календарь.
            </span>
          </div>
          <div className="modal-footer">
            <button
              className="button secondary"
              onClick={() => {
                setShowReminders(false);
                navigate("settings");
              }}
            >
              Настроить
            </button>
            <button className="button primary" onClick={exportCalendar}>
              <Icon name="calendar" size={16} />В календарь
            </button>
          </div>
        </Modal>
      )}
      {showHelp && (
        <Modal
          title="Порядок в подписках — это просто"
          eyebrow="ДОБРО ПОЖАЛОВАТЬ В SUBLY"
          onClose={() => setShowHelp(false)}
        >
          <div className="help-steps">
            <div>
              <span>01</span>
              <section>
                <h3>Добавьте свои сервисы</h3>
                <p>
                  Укажите стоимость, период, дату следующего продления и срок
                  напоминания.
                </p>
              </section>
            </div>
            <div>
              <span>02</span>
              <section>
                <h3>Планируйте расходы</h3>
                <p>
                  На обзоре — средний расход в месяц. В календаре — полная сумма
                  каждого платежа. Годовые тарифы учитываются в месячном среднем
                  как 1/12 цены.
                </p>
              </section>
            </div>
            <div>
              <span>03</span>
              <section>
                <h3>Отмечайте оплату</h3>
                <p>
                  Галочка на карточке добавляет запись в журнал и переносит
                  продление на следующий период. Просроченные даты автоматически
                  не меняются.
                </p>
              </section>
            </div>
            <div>
              <span>04</span>
              <section>
                <h3>Получайте напоминания</h3>
                <p>
                  Колокольчик собирает ближайшие продления. Уведомления работают
                  при открытом сайте. Файл .ics перенесет напоминания в ваш
                  календарь.
                </p>
              </section>
            </div>
          </div>
          <div className="form-note">
            <Icon name="info" size={17} />
            <span>
              Пауза в Subly отключает учет и напоминания. Для отмены реальной
              подписки обратитесь к самому сервису.
            </span>
          </div>
          <div className="modal-footer">
            <span className="muted-label">
              Учебный проект · без подключения к банкам
            </span>
            <button
              className="button primary"
              onClick={() => setShowHelp(false)}
            >
              Понятно
              <Icon name="check" size={16} />
            </button>
          </div>
        </Modal>
      )}
      {toast && (
        <div role="status" className="toast">
          <span className="toast-icon">
            <Icon name="info" size={17} />
          </span>
          <span>{toast}</span>
          <button
            className="icon-button"
            aria-label="Закрыть сообщение"
            onClick={() => setToast("")}
          >
            <Icon name="x" size={16} />
          </button>
        </div>
      )}
    </div>
  );
}
