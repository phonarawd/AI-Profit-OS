/**
 * Phase 13 — /profits real runtime. NO INTERCEPT.
 * Next + Nest + DB가 살아 있을 때만 PASS.
 * Home/승인 baseline overwrite 금지.
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
const apiCalls = [];
page.on("pageerror", (e) => errors.push(`pageerror:${e}`));
page.on("console", (msg) => {
  if (msg.type() === "error") errors.push(`console:${msg.text()}`);
});
page.on("response", (res) => {
  const u = res.url();
  if (u.includes("/api/v1/opportunities") && !/\/opportunities\/[^/?]+/.test(u)) {
    apiCalls.push({ status: res.status(), url: u.split("?")[0] });
  }
});

await page.goto(url, { waitUntil: "domcontentloaded", timeout: 90000 });
await page.waitForSelector("[data-sdp='root']", { timeout: 30000 });
await page.addStyleTag({ content: hideChrome });
await page.waitForTimeout(900);
await page.screenshot({
  path: path.join(outDir, "profits-desktop-runtime-1440.png"),
  fullPage: false,
});

const measure = await page.evaluate(() => {
  const sidebar = document.querySelector(".sd-sidebar");
  const header = document.querySelector(".sd-header");
  const root = document.querySelector("[data-sdp='root']");
  const cards = [...document.querySelectorAll("[data-sdp='card']")].map((el) => {
    const r = el.getBoundingClientRect();
    return {
      w: Math.round(r.width),
      h: Math.round(r.height),
      bottom: Math.round(r.bottom),
    };
  });
  return {
    owner: root?.getAttribute("data-owner") ?? null,
    viewState: root?.getAttribute("data-sdp-state") ?? null,
    overflowX: document.documentElement.scrollWidth > window.innerWidth + 1,
    scrollWidth: document.documentElement.scrollWidth,
    innerWidth: window.innerWidth,
    sidebarW: sidebar ? Math.round(sidebar.getBoundingClientRect().width) : null,
    headerH: header ? Math.round(header.getBoundingClientRect().height) : null,
    officialChip: [...document.querySelectorAll("[data-sdp-filter]")].some(
      (el) => el.getAttribute("data-sdp-filter") === "official" || el.textContent === "공식 파트너",
    ),
    fixtureNike: document.body.innerText.includes("Nike Air Force 1"),
    sortLabel: document.querySelector("[data-sdp='sort']")?.textContent?.trim() ?? null,
    cardCount: cards.length,
    featured: Boolean(document.querySelector(".sdp-card.is-featured")),
    firstViewportCards: cards.filter((c) => c.bottom <= 1080 + 8).length,
  };
});

await browser.close();

const layoutOk =
  measure.overflowX === false &&
  measure.sidebarW === 220 &&
  measure.headerH === 72;
const fixtureFree =
  measure.owner !== "visual_fixture" && measure.fixtureNike === false;
const apiReal = apiCalls.length >= 1;
const report = {
  schema: "profits.playwright-real-runtime.v1",
  intercept: false,
  url,
  errors,
  apiCalls,
  ...measure,
  layoutOk,
  fixtureFree,
  apiReal,
  shot: path.join(outDir, "profits-desktop-runtime-1440.png"),
  verdict:
    apiReal && fixtureFree && layoutOk && !measure.officialChip
      ? "PASS"
      : "FAIL",
};

fs.writeFileSync(
  path.join(outDir, "profits-desktop-runtime-1440.json"),
  `${JSON.stringify(report, null, 2)}\n`,
);
console.log(JSON.stringify(report, null, 2));
if (report.verdict !== "PASS") process.exit(1);
