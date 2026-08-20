/**
 * /profits Desktop 1440×1080 visual QA.
 * Home approved baseline은 덮어쓰지 않는다.
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { createRequire } from "node:module";

const here = path.dirname(fileURLToPath(import.meta.url));
const require = createRequire(path.join(here, "../../../tooling/verify/stack-lock.cjs"));
const { chromium } = require("@playwright/test");
const outDir = path.join(here, "../../../_tmp_spark_dash_refs");
const url = process.env.SD_PROFITS_URL ?? "http://localhost:3000/profits";
const hideChrome =
  "nextjs-portal, [data-next-mark-loading], #__next-build-watcher { display: none !important; }";

fs.mkdirSync(outDir, { recursive: true });

const browser = await chromium.launch({ headless: true });
const page = await browser.newPage({
  viewport: { width: 1440, height: 1080 },
  deviceScaleFactor: 1,
});
const errors = [];
page.on("pageerror", (e) => errors.push(`pageerror:${e}`));
page.on("console", (msg) => {
  if (msg.type() === "error") errors.push(`console:${msg.text()}`);
});
await page.goto(url, { waitUntil: "domcontentloaded", timeout: 90000 });
await page.waitForSelector("[data-sdp='root']", { timeout: 30000 });
await page.addStyleTag({ content: hideChrome });
await page.waitForTimeout(800);
await page.screenshot({
  path: path.join(outDir, "profits-desktop-1440.png"),
  fullPage: false,
});

const measure = await page.evaluate(() => {
  const sidebar = document.querySelector(".sd-sidebar");
  const header = document.querySelector(".sd-header");
  const cards = [...document.querySelectorAll("[data-sdp='card']")].map((el) => {
    const r = el.getBoundingClientRect();
    return {
      w: Math.round(r.width),
      h: Math.round(r.height),
      bottom: Math.round(r.bottom),
    };
  });
  return {
    overflowX: document.documentElement.scrollWidth > window.innerWidth + 1,
    scrollWidth: document.documentElement.scrollWidth,
    innerWidth: window.innerWidth,
    sidebarW: sidebar ? Math.round(sidebar.getBoundingClientRect().width) : null,
    headerH: header ? Math.round(header.getBoundingClientRect().height) : null,
    cards,
    cardCount: cards.length,
    firstViewportCards: cards.filter((c) => c.bottom <= 1080 + 8).length,
  };
});

await browser.close();
const report = {
  url,
  errors,
  ...measure,
  shot: path.join(outDir, "profits-desktop-1440.png"),
};
fs.writeFileSync(
  path.join(outDir, "profits-desktop-1440.json"),
  `${JSON.stringify(report, null, 2)}\n`,
);
console.log(JSON.stringify(report, null, 2));
const fatal = errors.filter((e) => !e.includes("status of 500"));
if (fatal.length || measure.overflowX) process.exit(1);
