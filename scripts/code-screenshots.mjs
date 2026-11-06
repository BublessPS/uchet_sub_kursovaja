import { chromium } from "@playwright/test";
import hljs from "highlight.js/lib/core";
import typescript from "highlight.js/lib/languages/typescript";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import path from "node:path";

// Read the real source files; the rendered snippets are never copied by hand.
hljs.registerLanguage("typescript", typescript);
const root = fileURLToPath(new URL("../", import.meta.url));
const output = path.join(root, "docs/code");
const cache = new Map();

async function source(file) {
  if (!cache.has(file)) {
    cache.set(
      file,
      (await readFile(path.join(root, file), "utf8")).replaceAll("\r\n", "\n"),
    );
  }
  return cache.get(file);
}

async function excerpt(file, startMarker, endMarker) {
  const text = await source(file);
  const start = text.indexOf(startMarker);
  if (start === -1)
    throw new Error(`Snippet start not found: ${file}: ${startMarker}`);
  const end = text.indexOf(endMarker, start + startMarker.length);
  if (end === -1)
    throw new Error(`Snippet end not found: ${file}: ${endMarker}`);
  const line = text.slice(0, start).split("\n").length;
  const firstLineStart = text.lastIndexOf("\n", start - 1) + 1;
  const lines = text.slice(firstLineStart, end).trimEnd().split("\n");
  const indent = Math.min(
    ...lines
      .filter((value) => value.trim())
      .map((value) => value.match(/^\s*/)[0].length),
  );
  return {
    file,
    line,
    code: lines.map((value) => value.slice(indent)).join("\n"),
  };
}

const cards = [
  {
    slug: "monthly-cost",
    number: "01",
    accent: "#7771ed",
    wash: "#e5e2ff",
    title: "Каждая подписка — на счету",
    subtitle:
      "Месячные и годовые тарифы в одном расчете. Пауза исключает сервис из расходов.",
    label: "РАСЧЕТ РАСХОДОВ",
    footer: "Годовой тариф ÷ 12 = среднее за месяц",
    alt: "TypeScript: функции monthlyCost и activeSubscriptions рассчитывают месячную стоимость и отбирают активные подписки",
    fragments: [
      await excerpt(
        "src/domain.ts",
        "export function monthlyCost(",
        "\nexport function nextDate(",
      ),
    ],
  },
  {
    slug: "next-payment",
    number: "02",
    accent: "#3c9cb8",
    wash: "#dceff3",
    title: "Продление без потери даты",
    subtitle: "Исходный день оплаты сохраняется даже после короткого февраля.",
    label: "ДАТЫ ПРОДЛЕНИЯ",
    footer: "31 января → 28 февраля → 31 марта",
    alt: "TypeScript: функция nextDate переносит продление на месяц или год и учитывает последний день целевого месяца",
    fragments: [
      await excerpt(
        "src/domain.ts",
        "export function nextDate(",
        "\nexport function occurrences(",
      ),
    ],
  },
  {
    slug: "reminders",
    number: "03",
    accent: "#b279ce",
    wash: "#f0e1f5",
    title: "Вспомним о продлении за вас",
    subtitle:
      "Срок напоминания задается для каждой подписки. Просроченная оплата остается видимой.",
    label: "НАПОМИНАНИЯ",
    footer: "Ближайшие продления + просроченные даты",
    alt: "TypeScript: фильтр reminders выбирает подписки по сроку напоминания, dueLabel показывает сегодня, завтра и просрочку",
    fragments: [
      await excerpt(
        "src/App.tsx",
        "  const reminders = upcoming.filter(",
        "\n  const next =",
      ),
      await excerpt(
        "src/domain.ts",
        "export function dueLabel(",
        "\nexport function monthlyCost(",
      ),
    ],
  },
];

const escape = (value) =>
  value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
const [latin, cyrillic] = await Promise.all(
  ["manrope-5.woff2", "manrope-1.woff2"].map((file) =>
    readFile(path.join(root, "public/fonts", file)),
  ),
);

function render(card) {
  return `<!doctype html><html lang="ru"><head><meta charset="utf-8"><style>
    @font-face{font-family:Manrope;src:url(data:font/woff2;base64,${latin.toString("base64")}) format('woff2');font-weight:200 800;unicode-range:U+0000-00FF,U+2000-206F,U+20AC,U+2122,U+2191,U+2193,U+2212}
    @font-face{font-family:Manrope;src:url(data:font/woff2;base64,${cyrillic.toString("base64")}) format('woff2');font-weight:200 800;unicode-range:U+0301,U+0400-045F,U+0490-0491,U+04B0-04B1,U+2116}
    *{box-sizing:border-box}body{margin:0;background:white;font-family:Manrope,'Segoe UI',sans-serif}
    .canvas{width:1120px;padding:40px 50px 32px;background:radial-gradient(ellipse at 95% 12%,#ffffffa8,transparent 46%),radial-gradient(ellipse at 4% 100%,#ffffff90,transparent 54%),${card.wash};color:#292d45;overflow:hidden}
    .masthead{display:flex;align-items:center;justify-content:space-between;margin-bottom:30px}.logo{font-size:24px;font-weight:800;letter-spacing:-1.1px}.logo span{color:${card.accent}}.masthead-right{display:flex;gap:13px;align-items:center;color:#8986a0;font-size:9px;font-weight:750;letter-spacing:1.7px}.counter{display:inline-flex;gap:5px;border:1px solid #ffffffc9;border-radius:6px;padding:5px 9px;background:#ffffff50;color:${card.accent};letter-spacing:1px}
    .eyebrow{font-size:9px;font-weight:800;color:${card.accent};letter-spacing:2px;margin-bottom:9px}h1{font-size:30px;letter-spacing:-1px;line-height:1.35;margin:0;font-weight:800}.subtitle{font-size:12px;color:#7d7c95;line-height:1.8;margin:10px 0 27px}
    .editor{border:1px solid #ffffff70;border-radius:14px;background:#161c2b;overflow:hidden;box-shadow:0 18px 40px #26233b28,0 2px 5px #26233b18}.editor-bar{display:flex;align-items:center;justify-content:space-between;gap:18px;height:51px;padding:0 21px;background:#1d2435;border-bottom:1px solid #ffffff06}.traffic{display:flex;gap:7px}.traffic i{width:9px;height:9px;border-radius:50%;background:#fb746b}.traffic i:nth-child(2){background:#f1c267}.traffic i:nth-child(3){background:#61c79b}.editor-tab{display:flex;align-items:center;gap:9px;color:#b5bfd5;font:12px Consolas,'Courier New',monospace}.ts-icon{display:inline-flex;align-items:flex-end;justify-content:flex-end;width:19px;height:19px;border-radius:3px;background:#3178c6;padding:2px;color:white;font-family:Arial,sans-serif;font-size:10px;font-weight:bold}.language{font-size:9px;color:#7b87a2;letter-spacing:.4px}.fragment+.fragment{border-top:1px solid #ffffff0a}.fragment-title{padding:13px 26px 0;color:#667690;font:10px Consolas,'Courier New',monospace;display:flex;align-items:center;gap:8px}.fragment-title:before{content:'';height:4px;width:4px;border-radius:50%;background:${card.accent}}
    .code-body{display:flex;gap:24px;padding:22px 27px 25px 20px}.gutter,pre{font-family:Consolas,'Courier New',monospace;font-size:17px;line-height:27px;margin:0;white-space:pre;font-weight:400;letter-spacing:0}.gutter{color:#46526c;text-align:right;min-width:31px;user-select:none}.code{min-width:0;flex:1;color:#d7deef;tab-size:2}code{font:inherit}.editor-status{display:flex;align-items:center;justify-content:space-between;padding:9px 20px;color:#66748d;border-top:1px solid #ffffff08;background:#141a28;font-size:9px}.status-left{display:flex;align-items:center;gap:6px}.status-dot{width:5px;height:5px;border-radius:50%;background:#66b8a0}
    .hljs-keyword,.hljs-literal{color:#c792ea}.hljs-string,.hljs-regexp{color:#c3e88d}.hljs-number{color:#f7aa7b}.hljs-title.function_,.hljs-title{color:#82aaff}.hljs-built_in,.hljs-type{color:#82d8d8}.hljs-params{color:#c9d4e9}.hljs-property,.hljs-variable{color:#d7deef}.hljs-comment{color:#637593;font-style:italic}.hljs-subst{color:#d7deef}.hljs-punctuation,.hljs-operator{color:#89bcd9}
    .caption{display:flex;align-items:center;justify-content:space-between;margin-top:22px;font-size:10px;color:#85829b}.caption strong{font-weight:650;color:#75718e}.caption-note{display:flex;align-items:center;gap:6px;font-size:8px;letter-spacing:1.4px}.caption-note:before{content:'</>';font:11px Consolas,monospace;color:${card.accent};letter-spacing:0}
  </style></head><body><article class="canvas"><div class="masthead"><div class="logo">subly<span>.</span></div><div class="masthead-right">ВНУТРИ ПРОЕКТА<span class="counter">${card.number} / 03</span></div></div><header><div class="eyebrow">${escape(card.label)}</div><h1>${escape(card.title)}</h1><p class="subtitle">${escape(card.subtitle)}</p></header><div class="editor"><div class="editor-bar"><div class="traffic"><i></i><i></i><i></i></div><div class="editor-tab"><span class="ts-icon">TS</span>${card.fragments.length === 1 ? escape(card.fragments[0].file) : "subscription-reminders"}</div><div class="language">TypeScript</div></div>${card.fragments
    .map(
      (fragment) =>
        `<section class="fragment">${card.fragments.length > 1 ? `<div class="fragment-title">${escape(fragment.file)}</div>` : ""}<div class="code-body"><div class="gutter">${fragment.code
          .split("\n")
          .map((_, i) => fragment.line + i)
          .join(
            "\n",
          )}</div><pre class="code"><code>${hljs.highlight(fragment.code, { language: "typescript" }).value}</code></pre></div></section>`,
    )
    .join(
      "",
    )}<div class="editor-status"><div class="status-left"><span class="status-dot"></span>Из исходников Subly</div><span>UTF-8 &nbsp; • &nbsp; TypeScript &nbsp; • &nbsp; 2 spaces</span></div></div><div class="caption"><strong>${escape(card.footer)}</strong><span class="caption-note">РЕАЛЬНЫЙ КОД ПРОЕКТА</span></div></article></body></html>`;
}

const executablePath =
  process.env.PLAYWRIGHT_BROWSER_EXECUTABLE ??
  (process.platform === "win32"
    ? "C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe"
    : undefined);
const browser = await chromium.launch({ executablePath });
await mkdir(output, { recursive: true });
try {
  const page = await browser.newPage({
    viewport: { width: 1120, height: 1400 },
    deviceScaleFactor: 2,
  });
  for (const card of cards) {
    await page.setContent(render(card));
    await page.evaluate(() => document.fonts.ready);
    const overflow = await page
      .locator(".code")
      .evaluateAll((elements) =>
        elements.some((element) => element.scrollWidth > element.clientWidth),
      );
    if (overflow)
      throw new Error(`Code does not fit the screenshot: ${card.slug}`);
    await page
      .locator(".canvas")
      .screenshot({
        path: path.join(output, `${card.slug}.png`),
        animations: "disabled",
      });
    console.log(`Created docs/code/${card.slug}.png`);
  }
} finally {
  await browser.close();
}

const readmePath = path.join(root, "README.md");
const readme = await readFile(readmePath, "utf8");
const startMarker = "<!-- code-screenshots:start -->";
const endMarker = "<!-- code-screenshots:end -->";
const start = readme.indexOf(startMarker),
  end = readme.indexOf(endMarker);
if (start === -1 || end <= start)
  throw new Error("README screenshot section markers are missing.");
const block = `${startMarker}\n\n${cards.map((card) => `![${card.alt}](docs/code/${card.slug}.png)\n\nИсходник: ${card.fragments.map((fragment) => `[${fragment.file}](./${fragment.file}#L${fragment.line})`).join(" и ")}.`).join("\n\n")}\n\n${endMarker}`;
await writeFile(
  readmePath,
  readme.slice(0, start) + block + readme.slice(end + endMarker.length),
);
console.log("Updated README source links.");
