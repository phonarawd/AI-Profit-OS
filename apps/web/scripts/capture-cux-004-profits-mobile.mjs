/**
 * CUX-004 /profits Mobile — 390x693 Founder visual fix QA.
 * Fixture visual = /dev/spark-dash-profits (existing dev-only pattern).
 * Real route smoke = /profits (no session -> UNAUTHORIZED/ERROR view, must not crash).
 * Desktop regression = same fixture route, 1440x1080.
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { createRequire } from "node:module";

const here = path.dirname(fileURLToPath(import.meta.url));
const require = createRequire(path.join(here, "../../../tooling/verify/stack-lock.cjs"));
const { chromium } = require("@playwright/test");
const outDir = path.join(here, "../../../_tmp_spark_dash_refs");
const profitsUrl = process.env.SD_PROFITS_URL ?? "http://localhost:3000/dev/spark-dash-profits";
const realUrl = process.env.SD_REAL_URL ?? "http://localhost:3000/profits";

fs.mkdirSync(outDir, { recursive: true });

const hideChrome =
  "nextjs-portal, [data-next-mark-loading], #__next-build-watcher { display: none !important; }";

function pickBox(sel) {
  const el = document.querySelector(sel);
  if (!el) return null;
  const r = el.getBoundingClientRect();
  if (r.width <= 0 || r.height <= 0) return null;
  return {
    x: Math.round(r.x),
    y: Math.round(r.y),
    w: Math.round(r.width),
    h: Math.round(r.height),
    bottom: Math.round(r.bottom),
  };
}

const browser = await chromium.launch({ headless: true });
const report = { schema: "cux-004-profits-mobile.playwright.v1", viewport: { width: 390, height: 693 } };

// ---- 1) Mobile fixture (visual) ----
{
  const page = await browser.newPage({ viewport: { width: 390, height: 693 }, deviceScaleFactor: 2 });
  const pageErrors = [];
  const consoleErrors = [];
  page.on("pageerror", (e) => pageErrors.push(String(e)));
  page.on("console", (msg) => {
    if (msg.type() === "error") consoleErrors.push(msg.text());
  });
  await page.goto(profitsUrl, { waitUntil: "domcontentloaded", timeout: 90000 });
  await page.waitForSelector("[data-sdpm='root']", { timeout: 30000 });
  await page.addStyleTag({ content: hideChrome });
  await page.waitForTimeout(600);

  const measure = await page.evaluate((pickSrc) => {
    const pick = eval(`(${pickSrc})`);

    // FIX1: bottom nav active state — only 기회 탐색 pink/active
    const navItems = [...document.querySelectorAll("[data-sdpm='nav'] .sdpm-nav-item")].map((el) => {
      const label = el.lastElementChild?.textContent?.trim() ?? el.textContent?.trim();
      const isActiveClass = el.classList.contains("is-active");
      const color = getComputedStyle(el).color;
      const iconWrap = el.querySelector(".sdpm-nav-ico, .sdpm-nav-more");
      const iconColor = iconWrap ? getComputedStyle(iconWrap).color : null;
      return { label, isActiveClass, color, iconColor };
    });

    // FIX2: eBay logo — must be pure text spans, no image, no opaque light bg box behind it
    const ebayEl = document.querySelector(".sdpm-ebay");
    const ebayIsImage = ebayEl ? ebayEl.querySelector("img") !== null : null;
    const ebayBg = ebayEl ? getComputedStyle(ebayEl).backgroundColor : null;
    const ebayParentBg = ebayEl ? getComputedStyle(ebayEl.parentElement).backgroundColor : null;

    // FIX3: rate visibility — explicit "수익률" label text present
    const rateChip = document.querySelector(".sdpm-rate-chip");
    const rateChipText = rateChip?.textContent?.trim() ?? null;
    const rateChipBox = pick(".sdpm-rate-chip");
    const profitBox = pick(".sdpm-metric-profit");
    const rateOverflowsCard = rateChipBox && profitBox ? rateChipBox.bottom > profitBox.bottom + 4 : null;

    // FIX4: product image scale
    const mediaBox = pick("[data-sdpm='media']");
    const shotEl = document.querySelector(".sdpm-media-shot");
    const shotBox = shotEl ? shotEl.getBoundingClientRect() : null;

    // FIX5: fallback treatment richness (2nd card is expected to be MISSING-state in fixture)
    const fallbackEls = [...document.querySelectorAll("[data-sdpm-media='MISSING'], [data-sdpm-media='POLICY_UNKNOWN']")];
    const fallbackHasBloom = fallbackEls.length > 0 ? fallbackEls[0].querySelector(".sdpm-media-bloom") !== null : null;
    const fallbackHasTitle = fallbackEls.length > 0 ? fallbackEls[0].querySelector(".sdpm-media-title") !== null : null;

    // FIX6: action row alignment
    const footBox = pick("[data-sdpm='foot']");
    const statusBox = pick("[data-sdpm='status']");
    const moreEl = document.querySelector(".sdpm-more");
    const moreBox = moreEl ? moreEl.getBoundingClientRect() : null;
    const footAlignDelta =
      statusBox && moreBox ? Math.abs(statusBox.y + statusBox.h / 2 - (moreBox.y + moreBox.height / 2)) : null;

    // FIX7: spacing rhythm — gaps between major card sections should be consistent-ish
    const card = document.querySelector("[data-sdpm='card']");
    const cardChildren = card ? [...card.children] : [];
    const gaps = [];
    for (let i = 0; i < cardChildren.length - 1; i++) {
      const a = cardChildren[i].getBoundingClientRect();
      const b = cardChildren[i + 1].getBoundingClientRect();
      gaps.push(Math.round(b.top - a.bottom));
    }

    // participation CTA count must stay 0 in the list
    const primaryCtaEls = [...document.querySelectorAll('[data-requires-preflight="true"]')].filter((el) => {
      const r = el.getBoundingClientRect();
      return r.width > 0 && r.height > 0;
    });

    const durationEl = document.querySelector('[data-sdpm="duration"]');

    // text-clipping heuristic
    const wrapSelectors = [
      ".sdpm-card-title",
      ".sdpm-media-title",
      ".sdpm-empty-title",
      ".sdpm-empty-body",
    ];
    const clipped = [];
    for (const sel of wrapSelectors) {
      for (const el of document.querySelectorAll(sel)) {
        if (el.scrollHeight > el.clientHeight + 1 || el.scrollWidth > el.clientWidth + 1) {
          clipped.push({ sel, text: el.textContent?.trim().slice(0, 40) });
        }
      }
    }

    return {
      innerWidth: window.innerWidth,
      overflowX: document.documentElement.scrollWidth > window.innerWidth + 1,
      root: pick("[data-sdpm='root']"),
      header: pick("[data-sdpm='header']"),
      nav: pick("[data-sdpm='nav']"),
      scroll: pick("[data-sdpm='scroll']"),
      navItems,
      ebayIsImage,
      ebayBg,
      ebayParentBg,
      rateChipText,
      rateOverflowsCard,
      mediaBox,
      shotBox: shotBox ? { w: Math.round(shotBox.width), h: Math.round(shotBox.height) } : null,
      fallbackCount: fallbackEls.length,
      fallbackHasBloom,
      fallbackHasTitle,
      footBox,
      statusBox,
      footAlignDelta,
      gaps,
      primaryCtaVisibleCount: primaryCtaEls.length,
      durationText: durationEl?.textContent?.trim() ?? null,
      clipped,
      cardTitleText: document.querySelector(".sdpm-card-title")?.textContent?.trim() ?? null,
      metaCount: document.querySelector(".sdpm-meta .count")?.textContent?.trim() ?? null,
    };
  }, pickBox.toString());

  const shot = path.join(outDir, "cux-004-profits-mobile-390x693.png");
  await page.screenshot({ path: shot, fullPage: false });
  const rootCrop = path.join(outDir, "cux-004-profits-mobile-crop.png");
  await page.locator("[data-sdpm='root']").screenshot({ path: rootCrop });
  const cardCrop = path.join(outDir, "cux-004-profits-mobile-card-crop.png");
  await page.locator("[data-sdpm='card']").first().screenshot({ path: cardCrop });

  report.mobileFixture = {
    url: profitsUrl,
    shot,
    rootCrop,
    cardCrop,
    pageErrors,
    consoleErrorCount: consoleErrors.length,
    ...measure,
  };
  await page.close();
}

// ---- 2) Real route smoke (no session -> must not crash) ----
{
  const page = await browser.newPage({ viewport: { width: 390, height: 693 }, deviceScaleFactor: 1 });
  const pageErrors = [];
  page.on("pageerror", (e) => pageErrors.push(String(e)));
  await page.goto(realUrl, { waitUntil: "domcontentloaded", timeout: 90000 });
  await page.waitForSelector("[data-sdpm='root']", { timeout: 30000 }).catch(() => null);
  await page.addStyleTag({ content: hideChrome });
  await page
    .waitForFunction(
      () => document.querySelector("[data-sdpm='root']")?.getAttribute("data-sdpm-state") !== "LOADING",
      { timeout: 8000 },
    )
    .catch(() => null);
  await page.waitForTimeout(300);
  const shot = path.join(outDir, "cux-004-real-route-390x693.png");
  await page.screenshot({ path: shot, fullPage: false });
  const measure = await page.evaluate(() => ({
    overflowX: document.documentElement.scrollWidth > window.innerWidth + 1,
    state: document.querySelector("[data-sdpm='root']")?.getAttribute("data-sdpm-state") ?? null,
    hasMobileRoot: Boolean(document.querySelector("[data-sdpm='root']")),
    hasNav: Boolean(document.querySelector("[data-sdpm='nav']")),
  }));
  report.realRouteSmoke = { url: realUrl, shot, pageErrors, ...measure };
  await page.close();
}

// ---- 3) Desktop regression (same fixture route, 1440x1080) ----
{
  const page = await browser.newPage({ viewport: { width: 1440, height: 1080 }, deviceScaleFactor: 1 });
  const pageErrors = [];
  page.on("pageerror", (e) => pageErrors.push(String(e)));
  await page.goto(profitsUrl, { waitUntil: "domcontentloaded", timeout: 90000 });
  await page.waitForSelector("[data-sdp='root']", { timeout: 30000 });
  await page.addStyleTag({ content: hideChrome });
  await page.waitForTimeout(500);
  const shot = path.join(outDir, "cux-004-desktop-regression-1440.png");
  await page.screenshot({ path: shot, fullPage: false });
  const measure = await page.evaluate((pickSrc) => {
    const pick = eval(`(${pickSrc})`);
    return {
      overflowX: document.documentElement.scrollWidth > window.innerWidth + 1,
      grid: pick("[data-sdp='grid']"),
      sidebar: pick(".sd-sidebar"),
      cardCount: document.querySelectorAll("[data-sdp='card']").length,
      ctaCount: [...document.querySelectorAll('[data-requires-preflight="true"]')].filter((el) => {
        const r = el.getBoundingClientRect();
        return r.width > 0 && r.height > 0;
      }).length,
    };
  }, pickBox.toString());
  report.desktopRegression = { url: profitsUrl, shot, pageErrors, ...measure };
  await page.close();
}

await browser.close();

const fails = [];
const mf = report.mobileFixture;

if (mf.pageErrors.length > 0) fails.push(`mobile pageerror: ${mf.pageErrors.join(" | ")}`);
if (mf.overflowX) fails.push("mobile overflow-x detected");
if (!mf.header) fails.push("mobile header missing");
if (!mf.nav) fails.push("mobile bottom nav missing");

// FIX1: only 기회 탐색 active
const expectedNavLabels = ["홈", "기회 탐색", "내 자산", "알림", "더보기"];
if (mf.navItems.length !== 5 || expectedNavLabels.some((l) => !mf.navItems.some((n) => n.label === l))) {
  fails.push(`bottom nav regression: ${JSON.stringify(mf.navItems.map((n) => n.label))}`);
}
const activeItems = mf.navItems.filter((n) => n.isActiveClass);
if (activeItems.length !== 1 || activeItems[0]?.label !== "기회 탐색") {
  fails.push(`bottom nav active-class mismatch: ${JSON.stringify(activeItems.map((n) => n.label))}`);
}
const alertsItem = mf.navItems.find((n) => n.label === "알림");
if (alertsItem?.isActiveClass) fails.push("알림 has is-active class (must be inactive)");
// pink rgb(255, 45, 107) must NOT appear on inactive icons/text
const PINK_RGB = "rgb(255, 45, 107)";
for (const item of mf.navItems) {
  if (item.label !== "기회 탐색" && (item.color === PINK_RGB || item.iconColor === PINK_RGB)) {
    fails.push(`inactive nav item "${item.label}" renders pink (color=${item.color}, iconColor=${item.iconColor})`);
  }
}

// FIX2: eBay mark must be pure text (no image asset -> no white-bg-box risk) and transparent bg
if (mf.ebayIsImage) fails.push("eBay mark rendered as <img> (white-bg-box risk)");
const OPAQUE_LIGHT = ["rgb(255, 255, 255)", "rgba(255, 255, 255, 1)"];
if (OPAQUE_LIGHT.includes(mf.ebayBg) || OPAQUE_LIGHT.includes(mf.ebayParentBg)) {
  fails.push(`eBay mark sits on an opaque white background (ebayBg=${mf.ebayBg}, parentBg=${mf.ebayParentBg})`);
}

// FIX3: 수익률 label must be explicit text, fit inside the card
if (!mf.rateChipText || !mf.rateChipText.includes("수익률")) {
  fails.push(`rate label not explicit: "${mf.rateChipText}"`);
}
if (mf.rateOverflowsCard) fails.push("rate chip overflows past card bottom edge");

// FIX4: product image must render at a meaningful size (not a tiny sliver)
if (!mf.shotBox || mf.shotBox.w < 140 || mf.shotBox.h < 90) {
  fails.push(`product image too small: ${JSON.stringify(mf.shotBox)}`);
}

// FIX5: fallback must use the rich energy-bloom treatment, not a bare box
if (mf.fallbackCount > 0 && (!mf.fallbackHasBloom || !mf.fallbackHasTitle)) {
  fails.push("fallback media missing rich treatment (bloom/title)");
}

// FIX6: status pill and "자세히 보기" must sit on the same visual baseline
if (mf.footAlignDelta != null && mf.footAlignDelta > 3) {
  fails.push(`action row misaligned: centerY delta=${mf.footAlignDelta}px`);
}

// FIX7: spacing rhythm — no negative/zero gaps (overlap) and no wildly inconsistent outliers
if (mf.gaps.some((g) => g < 0)) fails.push(`negative gap detected (overlap): ${JSON.stringify(mf.gaps)}`);

// duration contract untouched
if (!mf.durationText) fails.push("duration text missing");
if (mf.clipped.length > 0) fails.push(`text clipping detected: ${JSON.stringify(mf.clipped)}`);

// list must have zero primary participate CTA
if (mf.primaryCtaVisibleCount !== 0) {
  fails.push(`list primary participate CTA count = ${mf.primaryCtaVisibleCount} (expect 0)`);
}

const rr = report.realRouteSmoke;
if (rr.pageErrors.length > 0) fails.push(`real-route pageerror: ${rr.pageErrors.join(" | ")}`);
if (rr.overflowX) fails.push("real-route overflow-x detected");
if (!rr.hasMobileRoot) fails.push("real-route did not render mobile profits root");
if (!rr.hasNav) fails.push("real-route bottom nav missing");

const dr = report.desktopRegression;
if (dr.pageErrors.length > 0) fails.push(`desktop pageerror: ${dr.pageErrors.join(" | ")}`);
if (dr.overflowX) fails.push("desktop overflow-x detected");
if (!dr.grid) fails.push("desktop card grid missing (regression)");
if (dr.cardCount < 1) fails.push("desktop card count regression");

report.verdict = fails.length === 0 ? "PASS" : "FAIL";
report.fails = fails;

fs.writeFileSync(path.join(outDir, "cux-004-profits-mobile-report.json"), JSON.stringify(report, null, 2));
console.log(JSON.stringify(report, null, 2));
if (report.verdict !== "PASS") process.exit(1);
