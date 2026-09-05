/**
 * Home freeze sanity — 승인 baseline을 덮어쓰지 않는다.
 * Desktop 1440×1080 + Mobile 390×693 fixture preview only.
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { createRequire } from "node:module";

const here = path.dirname(fileURLToPath(import.meta.url));
const require = createRequire(path.join(here, "../../../tooling/verify/stack-lock.cjs"));
const { chromium } = require("@playwright/test");

const outDir = path.join(here, "../../../governance/consumer-home-approval");
const desktopUrl =
  process.env.SD_URL ?? "http://localhost:3000/dev/spark-dash-desktop";
const mobileUrl =
  process.env.SD_MOBILE_URL ?? "http://localhost:3000/dev/spark-dash-mobile";
const hideChrome =
  "nextjs-portal, [data-next-mark-loading], #__next-build-watcher { display: none !important; }";

function pickBox(sel) {
  const el = document.querySelector(sel);
  if (!el) return null;
  const r = el.getBoundingClientRect();
  return {
    x: Math.round(r.x),
    y: Math.round(r.y),
    w: Math.round(r.width),
    h: Math.round(r.height),
    bottom: Math.round(r.bottom),
    right: Math.round(r.right),
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
  await page.evaluate(() => {
    document.querySelector("nextjs-portal")?.remove();
  });
  await page.waitForTimeout(700);
  return { page, errors };
}

const browser = await chromium.launch({ headless: true });

const desktop = await openPage(browser, desktopUrl, 1440, 1080, ".sd-root");
const desktopMeasure = await desktop.page.evaluate(() => {
  const root = document.querySelector(".sd-root");
  const heroCta = document.querySelector(".sd-cta-primary");
  const important = [".sd-sidebar", ".sd-header", ".sd-hero", ".sd-wallet", ".sd-ai"];
  const missing = important.filter((sel) => !document.querySelector(sel));
  return {
    overflowX: document.documentElement.scrollWidth > window.innerWidth + 1,
    scrollWidth: document.documentElement.scrollWidth,
    innerWidth: window.innerWidth,
    rootW: root ? Math.round(root.getBoundingClientRect().width) : null,
    heroCtaVisible: heroCta
      ? heroCta.getBoundingClientRect().bottom <= window.innerHeight + 2
      : null,
    missing,
  };
});
await desktop.page.close();

const mobile = await openPage(browser, mobileUrl, 390, 693, ".sdm-root");
const mobileMeasure = await mobile.page.evaluate((pickSrc) => {
  const pick = eval(`(${pickSrc})`);
  const cta = pick("[data-sdm='cta']");
  const nav = pick("[data-sdm='nav']");
  const text = document.body.innerText;
  const moneyNodes = [
    ...document.querySelectorAll(
      ".sdm-usdt, .sdm-metric .v, .sdm-wallet-amt, .sdm-pop-amt, .sdm-capital",
    ),
  ];
  const moneyWrap = moneyNodes.some((el) => {
    const s = getComputedStyle(el);
    return s.whiteSpace !== "nowrap" && el.scrollWidth > el.clientWidth + 2;
  });
  return {
    overflowX: document.documentElement.scrollWidth > window.innerWidth + 1,
    scrollWidth: document.documentElement.scrollWidth,
    innerWidth: window.innerWidth,
    hero: pick("[data-sdm='hero']"),
    cta,
    nav,
    ctaClipped: cta
      ? cta.right > window.innerWidth + 1 || cta.x < -1
      : true,
    navOverlap: cta && nav ? cta.bottom > nav.y + 1 : null,
    moneyWrap,
    durationTexts: [...document.querySelectorAll(".sdm-metric .k, .sdm-pop-foot .k")]
      .filter((el) => el.textContent?.trim() === "예상 소요 시간")
      .map((el) => {
        const value = el.parentElement?.querySelector(".v");
        return value?.textContent?.trim() ?? "";
      }),
    fakeFomo: /\d{2}:\d{2}:\d{2}|마감 임박|남은 시간|명 참여|매칭\s*\d+%/.test(text),
    fakeDurationRange: /30\s*~\s*60\s*분/.test(text),
    zeroMinute: /0분/.test(text),
  };
}, pickBox.toString());
await mobile.page.close();
await browser.close();

const durationTruthful = mobileMeasure.durationTexts.every(
  (v) => v === "—" || /^\d{1,3}(,\d{3})*분$/.test(v),
);

const desktopPass =
  desktop.errors.length === 0 &&
  desktopMeasure.overflowX === false &&
  desktopMeasure.missing.length === 0;
const mobilePass =
  mobile.errors.length === 0 &&
  mobileMeasure.overflowX === false &&
  mobileMeasure.ctaClipped === false &&
  mobileMeasure.navOverlap === false &&
  mobileMeasure.moneyWrap === false &&
  mobileMeasure.fakeFomo === false &&
  mobileMeasure.fakeDurationRange === false &&
  mobileMeasure.zeroMinute === false &&
  durationTruthful;

const report = {
  schema: "governance.consumer-home-approval.freeze-qa.v1",
  measuredAt: new Date().toISOString(),
  desktop: {
    viewport: "1440x1080",
    url: desktopUrl,
    errors: desktop.errors,
    ...desktopMeasure,
    pass: desktopPass,
  },
  mobile: {
    viewport: "390x693",
    url: mobileUrl,
    errors: mobile.errors,
    ...mobileMeasure,
    durationTruthful,
    pass: mobilePass,
  },
  verdict: desktopPass && mobilePass ? "HOME_FREEZE_QA_PASS" : "HOME_FREEZE_QA_FAIL",
};

fs.writeFileSync(
  path.join(outDir, "freeze-qa.v1.json"),
  `${JSON.stringify(report, null, 2)}\n`,
);
console.log(JSON.stringify(report, null, 2));
if (!desktopPass || !mobilePass) process.exit(1);
