export const CATEGORIES = {
  entertainment: { name: "Кино и видео", color: "#8b6ce4", icon: "play" },
  music: { name: "Музыка", color: "#36a77b", icon: "music" },
  storage: { name: "Облако", color: "#4f9bdc", icon: "cloud" },
  productivity: { name: "Работа", color: "#ed9a4b", icon: "briefcase" },
  education: { name: "Обучение", color: "#df758a", icon: "book" },
  other: { name: "Другое", color: "#7b849c", icon: "sparkles" },
} as const;

export type Category = keyof typeof CATEGORIES;
export type Cycle = "monthly" | "yearly";
export interface Subscription {
  id: string;
  name: string;
  category: Category;
  amount: number;
  cycle: Cycle;
  nextPayment: string;
  billingDay: number;
  billingMonth: number;
  status: "active" | "paused";
  reminderDays: number;
  note: string;
  sourceUrl: string;
  priceType: "demo" | "manual" | "official";
}
export interface Payment {
  id: string;
  subscriptionId: string;
  name: string;
  amount: number;
  paidOn: string;
  scheduledDate: string;
}
export interface Settings {
  budget: number;
  reminderDays: number;
  notifications: boolean;
}
export interface AppData {
  version: 1;
  subscriptions: Subscription[];
  payments: Payment[];
  settings: Settings;
}
export interface Occurrence {
  subscription: Subscription;
  date: string;
}
export const STORAGE_KEY = "subly-data-v1";
export const DEFAULT_SETTINGS: Settings = {
  budget: 3000,
  reminderDays: 3,
  notifications: false,
};

export function dateKey(date: Date): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}
export function parseDate(value: string): Date {
  const [year, month, day] = value.split("-").map(Number);
  return new Date(year, month - 1, day, 12);
}
export function isDate(value: unknown): value is string {
  return (
    typeof value === "string" &&
    /^\d{4}-\d{2}-\d{2}$/.test(value) &&
    value >= "2000-01-01" &&
    value <= "2100-12-31" &&
    dateKey(parseDate(value)) === value
  );
}
export function daysUntil(value: string, today = new Date()): number {
  const target = parseDate(value);
  return Math.round(
    (Date.UTC(target.getFullYear(), target.getMonth(), target.getDate()) -
      Date.UTC(today.getFullYear(), today.getMonth(), today.getDate())) /
      86400000,
  );
}
export function addDays(date: Date, count: number): Date {
  const next = new Date(date);
  next.setDate(next.getDate() + count);
  return next;
}
export function monthStart(date: Date, offset = 0): Date {
  return new Date(date.getFullYear(), date.getMonth() + offset, 1, 12);
}
export function money(amount: number, precise = false): string {
  return new Intl.NumberFormat("ru-RU", {
    style: "currency",
    currency: "RUB",
    maximumFractionDigits: precise ? 2 : 0,
  }).format(amount);
}
export function shortDate(value: string, year = false): string {
  return parseDate(value)
    .toLocaleDateString("ru-RU", {
      day: "numeric",
      month: "short",
      ...(year ? { year: "numeric" } : {}),
    })
    .replace(" г.", "");
}
export function monthName(value: Date): string {
  return value
    .toLocaleDateString("ru-RU", { month: "long", year: "numeric" })
    .replace(" г.", "");
}
export function dueLabel(value: string, today = new Date()): string {
  const days = daysUntil(value, today);
  if (days < 0) return `Просрочено на ${Math.abs(days)} дн.`;
  if (days === 0) return "Сегодня";
  if (days === 1) return "Завтра";
  return `Через ${days} дн.`;
}
export function monthlyCost(sub: Subscription): number {
  return sub.amount / (sub.cycle === "yearly" ? 12 : 1);
}
export function activeSubscriptions(data: AppData): Subscription[] {
  return data.subscriptions.filter((s) => s.status === "active");
}
export function nextDate(sub: Subscription, from = sub.nextPayment): string {
  const current = parseDate(from);
  const year = current.getFullYear() + (sub.cycle === "yearly" ? 1 : 0);
  const month =
    sub.cycle === "yearly" ? sub.billingMonth : current.getMonth() + 1;
  const first = new Date(year, month, 1, 12);
  const lastDay = new Date(
    first.getFullYear(),
    first.getMonth() + 1,
    0,
  ).getDate();
  return dateKey(
    new Date(
      first.getFullYear(),
      first.getMonth(),
      Math.min(sub.billingDay, lastDay),
      12,
    ),
  );
}
export function occurrences(
  subscriptions: Subscription[],
  start: Date,
  end: Date,
): Occurrence[] {
  const result: Occurrence[] = [];
  const from = dateKey(start),
    to = dateKey(end);
  for (const sub of subscriptions.filter((s) => s.status === "active")) {
    let date = sub.nextPayment;
    // A bounded loop also handles records with an overdue date many years ago.
    for (let i = 0; date <= to && i < 1300; i++) {
      if (date >= from) result.push({ subscription: sub, date });
      date = nextDate(sub, date);
    }
  }
  return result.sort((a, b) => a.date.localeCompare(b.date));
}
export function createDemoData(today = new Date()): AppData {
  // Ruble prices checked on 2026-11-06. Spotify and Telegram amounts are
  // explicitly examples: neither public source confirms these RUB amounts.
  const entries: Array<{
    name: string;
    category: Category;
    amount: number;
    cycle: Cycle;
    offset: number;
    status: Subscription["status"];
    sourceUrl: string;
    priceType: Subscription["priceType"];
    note: string;
  }> = [
    {
      name: "Кинопоиск",
      category: "entertainment",
      amount: 449,
      cycle: "monthly",
      offset: 2,
      status: "active",
      sourceUrl: "https://plus.yandex.ru/action/plus_update_2026",
      priceType: "official",
      note: "Кинопоиск в составе Яндекс Плюса, без дополнительных опций. Базовый месячный тариф 449 ₽, без пробного периода и персональных скидок. Источник проверен 06.11.2026.",
    },
    {
      name: "Spotify Premium",
      category: "music",
      amount: 599,
      cycle: "monthly",
      offset: 5,
      status: "active",
      sourceUrl: "https://www.spotify.com/us/premium/",
      priceType: "demo",
      note: "599 ₽ — условный пример суммы для учета, не официальный тариф и не пересчет валюты. На официальной странице США цена указана в долларах. Российский рублевый тариф не подтвержден. Укажите свою фактическую сумму.",
    },
    {
      name: "Telegram Premium",
      category: "other",
      amount: 299,
      cycle: "monthly",
      offset: 9,
      status: "active",
      sourceUrl:
        "https://telegram.org/faq_premium#q-can-i-pay-in-my-local-currency",
      priceType: "demo",
      note: "299 ₽ — условный пример суммы для учета, не подтвержденная текущая цена. Telegram определяет стоимость по региону и способу оформления; точную сумму показывает приложение или @PremiumBot. Укажите цену из своего аккаунта.",
    },
    {
      name: "START",
      category: "entertainment",
      amount: 2990,
      cycle: "yearly",
      offset: 15,
      status: "active",
      sourceUrl: "https://start.ru/legal/subscription_price",
      priceType: "official",
      note: "Годовая подписка START: 2 990 ₽ за 12 месяцев по опубликованным условиям для новых пользователей (платформа Start Next). Предложение зависит от способа покупки и территории; проверьте сумму при оформлении. Источник проверен 06.11.2026.",
    },
    {
      name: "Okko",
      category: "entertainment",
      amount: 399,
      cycle: "monthly",
      offset: 18,
      status: "paused",
      sourceUrl: "https://okko.tv/subscriptions",
      priceType: "official",
      note: "Базовая месячная подписка Okko: 399 ₽. Расширенная подписка с START и Amediateka в эту сумму не входит. Источник проверен 06.11.2026. Пауза в примере демонстрирует исключение из расходов.",
    },
    {
      name: "Иви",
      category: "entertainment",
      amount: 399,
      cycle: "monthly",
      offset: 22,
      status: "active",
      sourceUrl:
        "https://ask.ivi.ru/knowledge-bases/10/articles/41176-chto-takoe-podpiska-i-zachem-ona-nuzhna",
      priceType: "official",
      note: "Подписка Иви: 399 ₽ в месяц по официальной справке. Пробные периоды, дополнительные пакеты и персональные предложения не учитываются. Источник проверен 06.11.2026.",
    },
  ];
  return {
    version: 1,
    subscriptions: entries.map(({ offset, ...entry }, i) => {
      const next = addDays(today, offset);
      return {
        ...entry,
        id: `demo-${i}`,
        nextPayment: dateKey(next),
        billingDay: next.getDate(),
        billingMonth: next.getMonth(),
        reminderDays: 3,
      };
    }),
    payments: [],
    settings: { ...DEFAULT_SETTINGS },
  };
}

export function upgradeDemoSubscriptions(data: AppData): AppData {
  const old: Array<[string, Category, number, Cycle]> = [
    ["Кинолента", "entertainment", 399, "monthly"],
    ["Ритм", "music", 199, "monthly"],
    ["Облако+", "storage", 149, "monthly"],
    ["Заметки Pro", "productivity", 2990, "yearly"],
    ["Lingua", "education", 990, "monthly"],
    ["Дизайн Studio", "productivity", 490, "monthly"],
  ];
  const replacement = createDemoData().subscriptions;
  let changed = false;
  const subscriptions = data.subscriptions.map((sub) => {
    const index = old.findIndex(
      ([name, category, amount, cycle], i) =>
        sub.id === `demo-${i}` &&
        sub.priceType === "demo" &&
        sub.name === name &&
        sub.category === category &&
        sub.amount === amount &&
        sub.cycle === cycle &&
        sub.sourceUrl === "" &&
        sub.note ===
          "Демонстрационная подписка. Название и цена приведены для примера.",
    );
    if (index === -1) return sub;
    const current = replacement[index];
    changed = true;
    // Preserve the user's dates, payment history, reminders and pause state.
    return {
      ...sub,
      name: current.name,
      category: current.category,
      amount: current.amount,
      cycle: current.cycle,
      sourceUrl: current.sourceUrl,
      priceType: current.priceType,
      note: current.note,
    };
  });
  return changed ? { ...data, subscriptions } : data;
}
function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
function validAmount(value: unknown): value is number {
  return (
    typeof value === "number" &&
    Number.isFinite(value) &&
    value > 0 &&
    value <= 10000000 &&
    Math.abs(value * 100 - Math.round(value * 100)) < 0.000001
  );
}
export function isHttpUrl(value: string): boolean {
  try {
    const url = new URL(value);
    return ["https:", "http:"].includes(url.protocol);
  } catch {
    return false;
  }
}
export function validateData(value: unknown): AppData {
  if (
    !isRecord(value) ||
    value.version !== 1 ||
    !Array.isArray(value.subscriptions) ||
    value.subscriptions.length > 1000 ||
    !Array.isArray(value.payments) ||
    value.payments.length > 10000 ||
    !isRecord(value.settings)
  )
    throw new Error("Неверный формат резервной копии Subly.");
  const ids = new Set<string>();
  for (const sub of value.subscriptions) {
    if (
      !isRecord(sub) ||
      typeof sub.id !== "string" ||
      !/^[a-zA-Z0-9_-]{1,100}$/.test(sub.id) ||
      ids.has(sub.id) ||
      typeof sub.name !== "string" ||
      !sub.name.trim() ||
      sub.name.length > 60 ||
      typeof sub.category !== "string" ||
      !Object.hasOwn(CATEGORIES, sub.category) ||
      !validAmount(sub.amount) ||
      !["monthly", "yearly"].includes(String(sub.cycle)) ||
      !isDate(sub.nextPayment) ||
      !Number.isInteger(sub.billingDay) ||
      Number(sub.billingDay) < 1 ||
      Number(sub.billingDay) > 31 ||
      !Number.isInteger(sub.billingMonth) ||
      Number(sub.billingMonth) < 0 ||
      Number(sub.billingMonth) > 11 ||
      !["active", "paused"].includes(String(sub.status)) ||
      !Number.isInteger(sub.reminderDays) ||
      Number(sub.reminderDays) < 0 ||
      Number(sub.reminderDays) > 30 ||
      typeof sub.note !== "string" ||
      sub.note.length > 1000 ||
      typeof sub.sourceUrl !== "string" ||
      sub.sourceUrl.length > 2000 ||
      (sub.sourceUrl !== "" && !isHttpUrl(sub.sourceUrl)) ||
      !["demo", "manual", "official"].includes(String(sub.priceType)) ||
      (sub.priceType === "official" && !sub.sourceUrl)
    )
      throw new Error(
        "В копии есть некорректная подписка. Проверьте даты, суммы и ссылки.",
      );
    ids.add(sub.id);
  }
  const paymentIds = new Set<string>();
  for (const payment of value.payments) {
    if (
      !isRecord(payment) ||
      typeof payment.id !== "string" ||
      !payment.id ||
      paymentIds.has(payment.id) ||
      payment.id.length > 100 ||
      typeof payment.subscriptionId !== "string" ||
      payment.subscriptionId.length > 100 ||
      typeof payment.name !== "string" ||
      !payment.name.trim() ||
      payment.name.length > 60 ||
      !validAmount(payment.amount) ||
      !isDate(payment.paidOn) ||
      !isDate(payment.scheduledDate)
    )
      throw new Error("В копии есть некорректная запись об оплате.");
    paymentIds.add(payment.id);
  }
  const settings = value.settings;
  if (
    typeof settings.budget !== "number" ||
    !Number.isFinite(settings.budget) ||
    settings.budget < 1 ||
    settings.budget > 10000000 ||
    !Number.isInteger(settings.reminderDays) ||
    Number(settings.reminderDays) < 0 ||
    Number(settings.reminderDays) > 30 ||
    typeof settings.notifications !== "boolean"
  )
    throw new Error("В копии некорректные настройки.");
  return value as unknown as AppData;
}
export function recordPayment(
  data: AppData,
  id: string,
  today = new Date(),
): AppData {
  const sub = data.subscriptions.find(
    (s) => s.id === id && s.status === "active",
  );
  if (!sub) return data;
  return {
    ...data,
    subscriptions: data.subscriptions.map((s) =>
      s.id === id ? { ...s, nextPayment: nextDate(s) } : s,
    ),
    payments: [
      {
        id: crypto.randomUUID(),
        subscriptionId: id,
        name: sub.name,
        amount: sub.amount,
        paidOn: dateKey(today),
        scheduledDate: sub.nextPayment,
      },
      ...data.payments,
    ],
  };
}
export function csvExport(data: AppData): string {
  const cell = (text: string) =>
    `"${text.replace(/^\s*[=+@\-\t\r]/, "'$&").replaceAll('"', '""')}"`;
  return (
    "\ufeff" +
    [
      [
        "Название",
        "Категория",
        "Цена, RUB",
        "Период",
        "Следующая оплата",
        "Статус",
        "Источник цены",
      ],
      ...data.subscriptions.map((s) => [
        s.name,
        CATEGORIES[s.category].name,
        String(s.amount).replace(".", ","),
        s.cycle === "monthly" ? "Месяц" : "Год",
        s.nextPayment,
        s.status === "active" ? "Активна" : "На паузе",
        s.sourceUrl,
      ]),
    ]
      .map((row) => row.map(cell).join(";"))
      .join("\r\n")
  );
}
export function calendarExport(data: AppData, now = new Date()): string {
  const escape = (value: string) =>
    value
      .replaceAll("\\", "\\\\")
      .replaceAll("\n", "\\n")
      .replaceAll(";", "\\;")
      .replaceAll(",", "\\,")
      .replaceAll("\r", "");
  const events = occurrences(data.subscriptions, now, addDays(now, 366));
  // Fold at 75 UTF-8 octets as required by RFC 5545 (Cyrillic is multi-byte).
  const fold = (line: string) => {
    const lines: string[] = [];
    let part = "";
    let bytes = 0;
    for (const char of line) {
      const size = new TextEncoder().encode(char).length;
      if (bytes + size > 75) {
        lines.push(part);
        part = " ";
        bytes = 1;
      }
      part += char;
      bytes += size;
    }
    lines.push(part);
    return lines.join("\r\n");
  };
  return (
    [
      "BEGIN:VCALENDAR",
      "VERSION:2.0",
      "PRODID:-//Subly//Subscriptions//RU",
      "CALSCALE:GREGORIAN",
      "METHOD:PUBLISH",
      ...events.flatMap(({ subscription: sub, date }) => [
        "BEGIN:VEVENT",
        `UID:${sub.id}-${date}@subly.local`,
        `DTSTAMP:${now.toISOString().replace(/[-:]/g, "").replace(/\.\d+/, "")}`,
        `DTSTART;VALUE=DATE:${date.replaceAll("-", "")}`,
        `DTEND;VALUE=DATE:${dateKey(addDays(parseDate(date), 1)).replaceAll("-", "")}`,
        `SUMMARY:${escape(`Продление: ${sub.name}`)}`,
        `DESCRIPTION:${escape(`К оплате: ${money(sub.amount, true)}. Напоминание Subly.`)}`,
        "BEGIN:VALARM",
        "ACTION:DISPLAY",
        `DESCRIPTION:${escape(`Продление ${sub.name}`)}`,
        `TRIGGER:-P${sub.reminderDays}D`,
        "END:VALARM",
        "END:VEVENT",
      ]),
      "END:VCALENDAR",
    ]
      .map(fold)
      .join("\r\n") + "\r\n"
  );
}
