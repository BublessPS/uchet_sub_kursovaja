// Optional asset refresh. Normal installation and builds do not require Google Fonts.
import { mkdir, writeFile } from "node:fs/promises";

const response = await fetch(
  "https://fonts.googleapis.com/css2?family=Manrope:wght@400..800&display=swap",
  {
    headers: {
      "User-Agent":
        "Mozilla/5.0 AppleWebKit/537.36 Chrome/130.0.0.0 Safari/537.36",
    },
  },
);
if (!response.ok) throw new Error(`Font CSS: ${response.status}`);
let css = await response.text();
await mkdir("public/fonts", { recursive: true });
const urls = [
  ...new Set(
    [...css.matchAll(/url\((https:\/\/[^)]+)\)/g)].map((match) => match[1]),
  ),
];
for (const [index, url] of urls.entries()) {
  const font = await fetch(url);
  if (!font.ok) throw new Error(`Font file: ${font.status}`);
  const filename = `manrope-${index}.woff2`;
  await writeFile(
    `public/fonts/${filename}`,
    new Uint8Array(await font.arrayBuffer()),
  );
  css = css.replaceAll(url, `/fonts/${filename}`);
}
await writeFile("src/fonts.css", css);
const license = await fetch(
  "https://raw.githubusercontent.com/google/fonts/main/ofl/manrope/OFL.txt",
);
if (!license.ok) throw new Error(`Font license: ${license.status}`);
await writeFile("public/fonts/OFL.txt", await license.text());
console.log(`Saved ${urls.length} local font subsets and OFL license.`);
