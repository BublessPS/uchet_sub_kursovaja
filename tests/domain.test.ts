import test from "node:test";
import assert from "node:assert/strict";
import {
  activeSubscriptions,
  addDays,
  calendarExport,
  createDemoData,
  csvExport,
  dateKey,
  daysUntil,
  isDate,
  monthlyCost,
  nextDate,
  occurrences,
  parseDate,
  recordPayment,
  validateData,
  upgradeDemoSubscriptions,
} from "../src/domain.ts";

const today = new Date(2026, 10, 6, 12);

test("monthly and annual prices have a consistent monthly equivalent", () => {
  const data = createDemoData(today);
  const total = activeSubscriptions(data).reduce(
    (sum, sub) => sum + monthlyCost(sub),
    0,
  );
  assert.equal(Math.round(total * 100), 199517);
  assert.equal(
    monthlyCost({ ...data.subscriptions[0], amount: 12000, cycle: "yearly" }),
    1000,
  );
});
test("monthly renewals keep the original 31st after short months", () => {
  const sub = {
    ...createDemoData(today).subscriptions[0],
    nextPayment: "2027-01-31",
    billingDay: 31,
  };
  assert.equal(nextDate(sub), "2027-02-28");
  assert.equal(nextDate(sub, "2027-02-28"), "2027-03-31");
  assert.equal(nextDate(sub, "2027-12-31"), "2028-01-31");
});
test("annual leap-day renewals return to February 29 in leap years", () => {
  const sub = {
    ...createDemoData(today).subscriptions[0],
    cycle: "yearly" as const,
    nextPayment: "2024-02-29",
    billingDay: 29,
    billingMonth: 1,
  };
  assert.equal(nextDate(sub), "2025-02-28");
  assert.equal(nextDate(sub, "2027-02-28"), "2028-02-29");
});
test("date validation rejects rollover dates and invalid inputs", () => {
  for (const value of [
    "2026-02-29",
    "2026-13-01",
    "2026-04-31",
    "2026-00-01",
    "abc",
    null,
    2026,
  ])
    assert.equal(isDate(value), false);
  assert.equal(isDate("2028-02-29"), true);
  assert.equal(dateKey(parseDate("2026-11-06")), "2026-11-06");
});
test("day differences use calendar days across month and year boundaries", () => {
  assert.equal(daysUntil("2026-11-06", today), 0);
  assert.equal(daysUntil("2026-11-05", today), -1);
  assert.equal(daysUntil("2027-01-01", new Date(2026, 11, 31, 23, 59)), 1);
});
test("forecast excludes paused services, includes repeated renewals, and recovers overdue schedules", () => {
  const sub = {
    ...createDemoData(today).subscriptions[0],
    nextPayment: "2025-01-31",
    billingDay: 31,
  };
  const paused = { ...sub, id: "paused", status: "paused" as const };
  const events = occurrences(
    [sub, paused],
    new Date(2027, 0, 1),
    new Date(2027, 2, 31),
  );
  assert.deepEqual(
    events.map((e) => e.date),
    ["2027-01-31", "2027-02-28", "2027-03-31"],
  );
});
test("payment is recorded separately and advances exactly one billing period", () => {
  const data = createDemoData(today);
  data.subscriptions[0].nextPayment = "2026-10-08";
  const result = recordPayment(data, "demo-0", today);
  assert.equal(result.subscriptions[0].nextPayment, "2026-11-08");
  assert.equal(result.payments.length, 1);
  assert.equal(result.payments[0].scheduledDate, "2026-10-08");
  assert.equal(result.payments[0].paidOn, "2026-11-06");
  assert.equal(data.payments.length, 0);
  assert.equal(recordPayment(data, "missing"), data);
  assert.equal(recordPayment(data, "demo-4"), data);
});
test("backup validator checks amounts, IDs, categories, URLs, dates and settings before restoring", () => {
  assert.deepEqual(validateData(createDemoData(today)), createDemoData(today));
  const changes = [
    (d: ReturnType<typeof createDemoData>) => {
      d.subscriptions[0].amount = -1;
    },
    (d: ReturnType<typeof createDemoData>) => {
      d.subscriptions[0].amount = 1.001;
    },
    (d: ReturnType<typeof createDemoData>) => {
      d.subscriptions[0].nextPayment = "2026-02-30";
    },
    (d: ReturnType<typeof createDemoData>) => {
      d.subscriptions[0].sourceUrl = "javascript:alert(1)";
    },
    (d: ReturnType<typeof createDemoData>) => {
      d.subscriptions[0].category = "__proto__" as never;
    },
    (d: ReturnType<typeof createDemoData>) => {
      d.subscriptions[0].id = d.subscriptions[1].id;
    },
    (d: ReturnType<typeof createDemoData>) => {
      d.subscriptions[0].id = "evil\r\nBEGIN:VEVENT";
    },
    (d: ReturnType<typeof createDemoData>) => {
      d.settings.budget = 0;
    },
    (d: ReturnType<typeof createDemoData>) => {
      d.subscriptions[0].priceType = "official";
      d.subscriptions[0].sourceUrl = "";
    },
  ];
  for (const change of changes) {
    const data = createDemoData(today);
    change(data);
    assert.throws(() => validateData(data));
  }
});
test("CSV escapes spreadsheet formulas, quotes, delimiters, and preserves Unicode", () => {
  const data = createDemoData(today);
  data.subscriptions[0].name = '=SUM(1;2) "test"';
  const csv = csvExport(data);
  assert.ok(csv.startsWith("\ufeff"));
  assert.ok(csv.includes('"\'=SUM(1;2) ""test"""'));
  assert.ok(csv.includes("Кино и видео"));
});
test("calendar contains only active events, proper alarms, escaped text and UTF-8 folding", () => {
  const data = createDemoData(today);
  data.subscriptions[0].name =
    "Кино; музыка, облако\\ и еще очень длинное название";
  const ics = calendarExport(data, today);
  assert.ok(ics.startsWith("BEGIN:VCALENDAR\r\n"));
  assert.ok(ics.includes("TRIGGER:-P3D"));
  assert.ok(ics.includes("DTSTART;VALUE=DATE:20261108"));
  assert.ok(!ics.includes("Продление: Okko"));
  assert.ok(ics.includes("Кино\\; музыка\\,"));
  for (const line of ics.split("\r\n"))
    assert.ok(new TextEncoder().encode(line).length <= 75);
  const unfolded = ics.replaceAll("\r\n ", "");
  assert.ok(unfolded.includes("DTEND;VALUE=DATE:20261109"));
});
test("an empty portfolio has no forecast or calendar events", () => {
  const data = createDemoData(today);
  data.subscriptions = [];
  assert.deepEqual(occurrences([], today, addDays(today, 366)), []);
  assert.ok(!calendarExport(data, today).includes("BEGIN:VEVENT"));
});

test("legacy sample upgrade preserves custom subscriptions, dates, pauses and payments", () => {
  const data = createDemoData(today);
  data.subscriptions[0] = {
    ...data.subscriptions[0],
    name: "Кинолента",
    amount: 399,
    priceType: "demo",
    sourceUrl: "",
    note: "Демонстрационная подписка. Название и цена приведены для примера.",
    nextPayment: "2027-01-31",
    status: "paused",
  };
  data.subscriptions[1] = {
    ...data.subscriptions[1],
    name: "Мой сервис",
    amount: 777,
    priceType: "manual",
  };
  data.payments.push({
    id: "saved-payment",
    subscriptionId: "demo-0",
    name: "Кинолента",
    amount: 399,
    paidOn: "2026-10-01",
    scheduledDate: "2026-10-01",
  });
  const updated = upgradeDemoSubscriptions(data);
  assert.equal(updated.subscriptions[0].name, "Кинопоиск");
  assert.equal(updated.subscriptions[0].amount, 449);
  assert.equal(updated.subscriptions[0].priceType, "official");
  assert.equal(updated.subscriptions[0].nextPayment, "2027-01-31");
  assert.equal(updated.subscriptions[0].status, "paused");
  assert.equal(updated.subscriptions[1], data.subscriptions[1]);
  assert.equal(updated.payments, data.payments);
  assert.equal(upgradeDemoSubscriptions(updated), updated);
  assert.equal(validateData(updated), updated);
});
