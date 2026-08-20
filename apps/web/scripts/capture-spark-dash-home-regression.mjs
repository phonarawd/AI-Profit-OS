/**
 * Phase 15 — Home zero-visual regression.
 * /dev/spark-dash-desktop 1440 + /dev/spark-dash-mobile 390.
 * 승인 baseline overwrite 금지. pixel-diff 단독 FAIL 금지.
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { createRequire } from "node:module";

const here = path.dirname(fileURLToPath(import.meta.url));
const require = createRequire(path.join(here, "../../../tooling/verify/stack-lock.cjs"));
const { chromium } = require("@playwright/test");
const outDir = path.join(here, "../../../_tmp_spark_dash_refs");
const baselineDir = path.join(here, "../../../governance/consumer-home-approval/baselines");
const desktopUrl =
  process.env.SD_URL ?? "http://localhost:3000/dev/spark-dash-desktop";
const mobileUrl =
  process.env.SD_MOBILE_URL ?? "http://localhost:3000/dev/spark-dash-mobile";
const hideChrome =
  "nextjs-portal, [data-next-mark-loading], #__next-build-watcher { display: none !important; }";

fs.mkdirSync(outDir, { recursive: true });

function pickBox(sel) {
  const el = document.querySelector(sel);
  if (!el) return null;
  const r = el.getBoundingClientRect();
  return {
    x: Math.round(r.x),
    y: Math.round(r.y),
    w: Math.round(r.width),
    h: Math.round(r.height),
  };
}

async function openPage(browser, url, width, height, selector) {
  const page = await browser.newPage({
    viewport: { width, height },
    deviceScaleFactor: 1,
  });
  const errors = [];
  page.on("pageerror", (e) => errors.push(`pageerror:${e}`));
  page.on("console", (msg) => {
    if (msg.type() === "error") errors.push(`console:${msg.text()}`);
  });
  await page.goto(url, { waitUntil: "domcontentloaded", timeout: 90000 });
  await page.waitForSelector(selector, { timeout: 30000 });
  await page.addStyleTag({ content: hideChrome });
  await page.waitForTimeout(700);
  return { page, errors };
}

const browser = await chromium.launch({ headless: true });

const desktop = await openPage(browser, desktopUrl, 1440, 1080, ".sd-root");
const desktopShot = path.join(outDir, "home-regression-desktop-1440.png");
await desktop.page.screenshot({ path: desktopShot, fullPage: false });
const desktopMeasure = await desktop.page.evaluate((pickSrc) => {
  const pick = eval(`(${pickSrc})`);
  const text = document.body.innerText;
  return {
    overflowX: document.documentElement.scrollWidth > window.innerWidth + 1,
    sidebar: pick(".sd-sidebar"),
    header: pick(".sd-header"),
    hero: pick(".sd-hero"),
    missing: [".sd-sidebar", ".sd-header", ".sd-hero", ".sd-wallet", ".sd-ai"].filter(
      (sel) => !document.querySelector(sel),
    ),
    hasBrand: text.includes("퍼뜩"),
    fakeFomo: /\d{2}:\d{2}:\d{2}|마감 임박|명 참여/.test(text),
  };
}, pickBox.toString());
await desktop.page.close();

const mobile = await openPage(browser, mobileUrl, 390, 693, ".sdm-root");
const mobileShot = path.join(outDir, "home-regression-mobile-390.png");
await mobile.page.screenshot({ path: mobileShot, fullPage: false });
const mobileMeasure = await mobile.page.evaluate((pickSrc) => {
  const pick = eval(`(${pickSrc})`);
  const text = document.body.innerText;
  const cta = pick("[data-sdm='cta']");
  const nav = pick("[data-sdm='nav']");
  return {
    overflowX: document.documentElement.scrollWidth > window.innerWidth + 1,
    hero: pick("[data-sdm='hero']"),
    cta,
    nav,
    missing: ["[data-sdm='hero']", "[data-sdm='cta']", "[data-sdm='nav']"].filter(
      (sel) => !document.querySelector(sel),
    ),
    hasBrand: text.includes("퍼뜩"),
    fakeFomo: /\d{2}:\d{2}:\d{2}|마감 임박|명 참여/.test(text),
  };
}, pickBox.toString());
await mobile.page.close();
await browser.close();

const desktopGeomOk =
  desktopMeasure.overflowX === false &&
  desktopMeasure.missing.length === 0 &&
  desktopMeasure.sidebar?.w === 220 &&
  desktopMeasure.header?.h === 72 &&
  desktopMeasure.hasBrand &&
  desktopMeasure.fakeFomo === false;
const mobileGeomOk =
  mobileMeasure.overflowX === false &&
  mobileMeasure.missing.length === 0 &&
  mobileMeasure.hasBrand &&
  mobileMeasure.fakeFomo === false;

const baselineDesktop = path.join(baselineDir, "approved-home-desktop-1440.png");
const baselineMobile = path.join(baselineDir, "approved-home-mobile-390.png");
const baselinesUntouched =
  fs.existsSync(baselineDesktop) &&
  fs.existsSync(baselineMobile) &&
  fs.statSync(baselineDesktop).mtimeMs > 0;

const report = {
  schema: "profits.home-visual-regression.v1",
  baselineOverwrite: false,
  pixelDiffAloneIsNotFailure: true,
  baselinesUntouched,
  desktop: {
    url: desktopUrl,
    shot: desktopShot,
    errors: desktop.errors,
    ...desktopMeasure,
    pass: desktopGeomOk && desktop.errors.length === 0,
  },
  mobile: {
    url: mobileUrl,
    shot: mobileShot,
    errors: mobile.errors,
    ...mobileMeasure,
    pass: mobileGeomOk && mobile.errors.length === 0,
  },
  verdict:
    desktopGeomOk &&
    mobileGeomOk &&
    desktop.errors.length === 0 &&
    mobile.errors.length === 0
      ? "PASS"
      : "FAIL",
};

fs.writeFileSync(
  path.join(outDir, "home-regression-after-profits.json"),
  `${JSON.stringify(report, null, 2)}\n`,
);
console.log(JSON.stringify(report, null, 2));
if (report.verdict !== "PASS") process.exit(1);
