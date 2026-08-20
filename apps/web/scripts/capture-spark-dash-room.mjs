/**
 * Opportunity Room Desktop 1440×1080 visual QA.
 * Home approved baseline은 덮어쓰지 않는다. /profits list redesign 0.
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { createRequire } from "node:module";

const here = path.dirname(fileURLToPath(import.meta.url));
const require = createRequire(path.join(here, "../../../tooling/verify/stack-lock.cjs"));
const { chromium } = require("@playwright/test");
const outDir = path.join(here, "../../../_tmp_spark_dash_refs");
const listUrl = process.env.SD_PROFITS_URL ?? "http://localhost:3000/profits";
const roomUrl =
  process.env.SD_ROOM_URL ?? "http://localhost:3000/dev/spark-dash-room";
const hideChrome =
  "nextjs-portal, [data-next-mark-loading], #__next-build-watcher { display: none !important; }";

fs.mkdirSync(outDir, { recursive: true });

const browser = await chromium.launch({ headless: true });
const page = await browser.newPage({
  viewport: { width: 1440, height: 1080 },
  deviceScaleFactor: 1,
});
const errors = [];
const api = [];
page.on("pageerror", (e) => errors.push(`pageerror:${e}`));
page.on("console", (msg) => {
  if (msg.type() === "error") errors.push(`console:${msg.text()}`);
});
page.on("request", (req) => {
  const u = req.url();
  if (u.includes("/api/v1/opportunities")) {
    api.push({ method: req.method(), url: u.split("?")[0] });
  }
});

if (roomUrl) {
  await page.goto(roomUrl, { waitUntil: "domcontentloaded", timeout: 90000 });
} else {
  await page.goto(listUrl, { waitUntil: "domcontentloaded", timeout: 90000 });
  await page.waitForSelector("[data-sdp='root']", { timeout: 30000 });
  const href = await page.evaluate(() => {
    const a = document.querySelector("a.sdp-card");
    return a?.getAttribute("href") ?? null;
  });
  if (!href) {
    await browser.close();
    console.log(JSON.stringify({ ok: false, reason: "no-card", errors }, null, 2));
    process.exit(1);
  }
  await page.goto(new URL(href, listUrl).toString(), {
    waitUntil: "domcontentloaded",
    timeout: 90000,
  });
}

await page.waitForSelector("[data-sdr='root'], .sdr-message", { timeout: 30000 });
await page.addStyleTag({ content: hideChrome });
await page.waitForTimeout(800);
await page.screenshot({
  path: path.join(outDir, "opportunity-room-desktop-1440.png"),
  fullPage: false,
});

const measure = await page.evaluate(() => {
  const sidebar = document.querySelector(".sd-sidebar");
  const header = document.querySelector(".sd-header");
  const hero = document.querySelector("[data-sdr='hero']");
  const facts = document.querySelector("[data-sdr='facts']");
  const duration = document.querySelector("[data-sdr='duration']");
  return {
    overflowX: document.documentElement.scrollWidth > window.innerWidth + 1,
    scrollWidth: document.documentElement.scrollWidth,
    innerWidth: window.innerWidth,
    sidebarW: sidebar ? Math.round(sidebar.getBoundingClientRect().width) : null,
    headerH: header ? Math.round(header.getBoundingClientRect().height) : null,
    heroH: hero ? Math.round(hero.getBoundingClientRect().height) : null,
    factsH: facts ? Math.round(facts.getBoundingClientRect().height) : null,
    duration: duration?.textContent?.trim() ?? null,
    state: document.querySelector("[data-sdr='root']")?.getAttribute("data-sdr-state") ?? null,
    title: document.querySelector(".sdr-title")?.textContent?.trim() ?? null,
    hasCta: Boolean(document.querySelector("[data-requires-preflight='true']")),
  };
});

await browser.close();
const report = {
  url: roomUrl || listUrl,
  errors,
  api,
  ...measure,
  shot: path.join(outDir, "opportunity-room-desktop-1440.png"),
};
fs.writeFileSync(
  path.join(outDir, "opportunity-room-desktop-1440.json"),
  `${JSON.stringify(report, null, 2)}\n`,
);
console.log(JSON.stringify(report, null, 2));
const fatal = errors.filter((e) => !e.includes("status of 500"));
if (fatal.length || measure.overflowX) process.exit(1);
