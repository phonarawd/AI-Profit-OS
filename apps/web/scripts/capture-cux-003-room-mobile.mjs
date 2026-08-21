/**
 * CUX-003 Opportunity Room Mobile — 390x693 visual + wiring QA.
 * Fixture visual = /dev/spark-dash-room (existing dev-only pattern).
 * Real route smoke = /profits/[id] (no session/API -> ERROR view, still must not crash).
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { createRequire } from "node:module";

const here = path.dirname(fileURLToPath(import.meta.url));
const require = createRequire(path.join(here, "../../../tooling/verify/stack-lock.cjs"));
const { chromium } = require("@playwright/test");
const outDir = path.join(here, "../../../_tmp_spark_dash_refs");
const roomUrl = process.env.SD_ROOM_URL ?? "http://localhost:3000/dev/spark-dash-room";
const realUrl = process.env.SD_REAL_URL ?? "http://localhost:3000/profits/cux-003-qa-smoke";

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

const CTA_DETAIL = "이 기회로 수익 벌기";

const browser = await chromium.launch({ headless: true });
const report = { schema: "cux-003-room-mobile.playwright.v1", viewport: { width: 390, height: 693 } };

// ---- 1) Mobile fixture (visual) ----
{
  const page = await browser.newPage({ viewport: { width: 390, height: 693 }, deviceScaleFactor: 2 });
  const pageErrors = [];
  const consoleErrors = [];
  page.on("pageerror", (e) => pageErrors.push(String(e)));
  page.on("console", (msg) => {
    if (msg.type() === "error") consoleErrors.push(msg.text());
  });
  await page.goto(roomUrl, { waitUntil: "domcontentloaded", timeout: 90000 });
  await page.waitForSelector("[data-sdrm='root']", { timeout: 30000 });
  await page.addStyleTag({ content: hideChrome });
  await page.waitForTimeout(500);

  const measure = await page.evaluate(
    ({ pickSrc, ctaText }) => {
      const pick = eval(`(${pickSrc})`);
      const kpis = [...document.querySelectorAll(".sdrm-kpi")];
      const kpiGeom = kpis.map((kpi) => {
        const head = kpi.querySelector(".sdrm-kpi-head");
        const val = kpi.children[1];
        const sub = kpi.querySelector(".sdrm-kpi-sub");
        return {
          headTop: head ? Math.round(head.getBoundingClientRect().top) : null,
          valTop: val ? Math.round(val.getBoundingClientRect().top) : null,
          subTop: sub ? Math.round(sub.getBoundingClientRect().top) : null,
          overflowX: kpi.scrollWidth > kpi.clientWidth + 1,
          valOverflowX: val ? val.scrollWidth > val.clientWidth + 1 : false,
          valText: val ? val.textContent?.trim() : null,
        };
      });

      const primaryCtaEls = [...document.querySelectorAll('[data-requires-preflight="true"]')].filter(
        (el) => {
          const r = el.getBoundingClientRect();
          return r.width > 0 && r.height > 0;
        },
      );
      const ctaTextMatches = [...document.querySelectorAll("button, a")].filter((el) => {
        const r = el.getBoundingClientRect();
        if (r.width <= 0 || r.height <= 0) return false;
        return el.textContent?.trim() === ctaText;
      });

      const durationEl = document.querySelector('[data-sdrm="duration"]');
      const kpiLabels = [...document.querySelectorAll(".sdrm-kpi-head .lab")].map((el) =>
        el.textContent?.trim(),
      );

      const ctaBar = document.querySelector("[data-sdrm='cta-bar']");
      const ctaBarStyle = ctaBar ? getComputedStyle(ctaBar) : null;
      const capitalEl = document.querySelector("[data-sdrm='decision']");
      const capitalStyle = capitalEl ? getComputedStyle(capitalEl) : null;
      const navItems = [...document.querySelectorAll("[data-sdrm='nav'] .sdrm-nav-item")].map(
        (el) => el.lastElementChild?.textContent?.trim() ?? el.textContent?.trim(),
      );
      const stepConnectors = [...document.querySelectorAll(".sdrm-step")].map((li, i, arr) => {
        const before = getComputedStyle(li, "::before");
        const isLast = i === arr.length - 1;
        const hasVisibleLine =
          before.content !== "none" &&
          before.content !== "" &&
          before.backgroundColor !== "rgba(0, 0, 0, 0)" &&
          before.backgroundColor !== "transparent";
        return { isLast, hasVisibleLine };
      });

      // text-clipping heuristic: scrollHeight>clientHeight on wrap-intended text blocks
      const wrapSelectors = [
        ".sdrm-title",
        ".sdrm-subtitle",
        ".sdrm-why-body",
        ".sdrm-why-title",
        ".sdrm-step-d",
        ".sdrm-step-t",
        ".sdrm-compare-note",
        ".sdrm-kpi-sub",
        ".sdrm-cta-note",
      ];
      const clipped = [];
      for (const sel of wrapSelectors) {
        for (const el of document.querySelectorAll(sel)) {
          if (el.scrollHeight > el.clientHeight + 1) {
            clipped.push({ sel, text: el.textContent?.trim().slice(0, 40) });
          }
        }
      }

      return {
        innerWidth: window.innerWidth,
        overflowX: document.documentElement.scrollWidth > window.innerWidth + 1,
        root: pick("[data-sdrm='root']"),
        header: pick("[data-sdrm='header']"),
        nav: pick("[data-sdrm='nav']"),
        scroll: pick("[data-sdrm='scroll']"),
        hero: pick("[data-sdrm='hero']"),
        decision: pick("[data-sdrm='decision']"),
        kpiRow: pick("[data-sdrm='kpi-row']"),
        compare: pick("[data-sdrm='compare']"),
        why: pick("[data-sdrm='why']"),
        steps: pick("[data-sdrm='steps']"),
        ctaBar: pick("[data-sdrm='cta-bar']"),
        capitalBg: capitalStyle ? capitalStyle.backgroundColor : null,
        navItems,
        stepConnectors,
        ctaNoteCount: document.querySelectorAll(".sdrm-cta-note").length,
        status: document.querySelector("[data-sdrm='status']")?.textContent?.trim() ?? null,
        kpiLabels,
        kpiGeom,
        durationText: durationEl?.textContent?.trim() ?? null,
        primaryCtaVisibleCount: primaryCtaEls.length,
        ctaTextMatchCount: ctaTextMatches.length,
        compareSides: [...document.querySelectorAll(".sdrm-compare-side")].map((el) => {
          const r = el.getBoundingClientRect();
          return { y: Math.round(r.y), bottom: Math.round(r.bottom), h: Math.round(r.height) };
        }),
        compareChipText: document.querySelector(".sdrm-compare-chip")?.textContent?.trim() ?? null,
        compareNoteText: document.querySelector(".sdrm-compare-note")?.textContent?.trim() ?? null,
        whyTitleText: document.querySelector(".sdrm-why-title")?.textContent?.trim() ?? null,
        ctaNoteText: document.querySelector(".sdrm-cta-note")?.textContent?.trim() ?? null,
        ctaBarPaddingBottom: ctaBarStyle ? ctaBarStyle.paddingBottom : null,
        clipped,
        titleText: document.querySelector(".sdrm-title")?.textContent?.trim() ?? null,
        capitalAmtText:
          document.querySelector("[data-sdrm='decision'] .sdrm-money .amt")?.textContent?.trim() ??
          null,
      };
    },
    { pickSrc: pickBox.toString(), ctaText: CTA_DETAIL },
  );

  const shot = path.join(outDir, "cux-003-room-mobile-390x693.png");
  await page.screenshot({ path: shot, fullPage: false });

  const rootCrop = path.join(outDir, "cux-003-room-mobile-crop.png");
  await page.locator("[data-sdrm='root']").screenshot({ path: rootCrop });

  await page.evaluate(() => {
    const scroller = document.querySelector("[data-sdrm='scroll']");
    if (scroller) scroller.scrollTop = scroller.scrollHeight;
  });
  await page.waitForTimeout(250);
  const scrolledShot = path.join(outDir, "cux-003-room-mobile-scrolled.png");
  await page.screenshot({ path: scrolledShot, fullPage: false });
  await page.evaluate(() => {
    const scroller = document.querySelector("[data-sdrm='scroll']");
    if (scroller) scroller.scrollTop = 0;
  });
  await page.waitForTimeout(150);

  const kpiTopsEqual = (key, tol = 2) => {
    const vals = measure.kpiGeom.map((g) => g[key]).filter((v) => v != null);
    if (vals.length < 2) return true;
    return Math.max(...vals) - Math.min(...vals) <= tol;
  };

  report.mobileFixture = {
    url: roomUrl,
    shot,
    rootCrop,
    pageErrors,
    consoleErrorCount: consoleErrors.length,
    overflowX: measure.overflowX,
    headerBox: measure.header,
    navBox: measure.nav,
    scrollBox: measure.scroll,
    heroBox: measure.hero,
    decisionBox: measure.decision,
    kpiRowBox: measure.kpiRow,
    compareBox: measure.compare,
    whyBox: measure.why,
    stepsBox: measure.steps,
    ctaBarBox: measure.ctaBar,
    ctaBarPaddingBottom: measure.ctaBarPaddingBottom,
    scrolledShot,
    statusLabel: measure.status,
    kpiLabels: measure.kpiLabels,
    kpiGeom: measure.kpiGeom,
    kpiHeadBaselineAligned: kpiTopsEqual("headTop"),
    kpiValueBaselineAligned: kpiTopsEqual("valTop"),
    kpiSubBaselineAligned: kpiTopsEqual("subTop"),
    kpiAnyOverflowX: measure.kpiGeom.some((g) => g.overflowX || g.valOverflowX),
    durationText: measure.durationText,
    primaryCtaVisibleCount: measure.primaryCtaVisibleCount,
    ctaTextMatchCount: measure.ctaTextMatchCount,
    compareSides: measure.compareSides,
    compareVertical:
      Array.isArray(measure.compareSides) &&
      measure.compareSides.length >= 2 &&
      measure.compareSides[0].bottom <= measure.compareSides[1].y + 2,
    compareChipText: measure.compareChipText,
    compareNoteText: measure.compareNoteText,
    whyTitleText: measure.whyTitleText,
    ctaNoteText: measure.ctaNoteText,
    ctaNoteCount: measure.ctaNoteCount,
    capitalBg: measure.capitalBg,
    navItems: measure.navItems,
    stepConnectors: measure.stepConnectors,
    clipped: measure.clipped,
    titleText: measure.titleText,
    capitalAmtText: measure.capitalAmtText,
    navPinnedToBottom: measure.nav ? measure.nav.bottom >= 693 - 2 : false,
    scrollEndsBeforeFooter: measure.scroll && measure.ctaBar ? measure.scroll.bottom <= measure.ctaBar.y + 1 : null,
  };

  await page.close();
}

// ---- 2) Real route smoke (no session/API -> must not crash, must render mobile ERROR state) ----
{
  const page = await browser.newPage({ viewport: { width: 390, height: 693 }, deviceScaleFactor: 1 });
  const pageErrors = [];
  page.on("pageerror", (e) => pageErrors.push(String(e)));
  await page.goto(realUrl, { waitUntil: "domcontentloaded", timeout: 90000 });
  await page.waitForSelector("[data-sdrm='root']", { timeout: 30000 }).catch(() => null);
  await page.addStyleTag({ content: hideChrome });
  await page
    .waitForFunction(
      () => document.querySelector("[data-sdrm='root']")?.getAttribute("data-sdrm-state") !== "LOADING",
      { timeout: 8000 },
    )
    .catch(() => null);
  await page.waitForTimeout(300);
  const shot = path.join(outDir, "cux-003-real-route-390x693.png");
  await page.screenshot({ path: shot, fullPage: false });
  const measure = await page.evaluate(() => ({
    overflowX: document.documentElement.scrollWidth > window.innerWidth + 1,
    state: document.querySelector("[data-sdrm='root']")?.getAttribute("data-sdrm-state") ?? null,
    hasMobileRoot: Boolean(document.querySelector("[data-sdrm='root']")),
    bodyText: document.body.innerText.slice(0, 200),
  }));
  report.realRouteSmoke = { url: realUrl, shot, pageErrors, ...measure };
  await page.close();
}

// ---- 3) Desktop regression (same fixture route, 1440x1080) ----
{
  const page = await browser.newPage({ viewport: { width: 1440, height: 1080 }, deviceScaleFactor: 1 });
  const pageErrors = [];
  page.on("pageerror", (e) => pageErrors.push(String(e)));
  await page.goto(roomUrl, { waitUntil: "domcontentloaded", timeout: 90000 });
  await page.waitForSelector("[data-sdr='root']", { timeout: 30000 });
  await page.addStyleTag({ content: hideChrome });
  await page.waitForTimeout(500);
  const shot = path.join(outDir, "cux-003-desktop-regression-1440.png");
  await page.screenshot({ path: shot, fullPage: false });
  const measure = await page.evaluate((pickSrc) => {
    const pick = eval(`(${pickSrc})`);
    return {
      overflowX: document.documentElement.scrollWidth > window.innerWidth + 1,
      hero: pick("[data-sdr='hero']"),
      facts: pick("[data-sdr='facts']"),
      compare: pick("[data-sdr='compare']"),
      context: pick("[data-sdr='context']"),
      sidebar: pick(".sd-sidebar"),
      ctaCount: [...document.querySelectorAll('[data-requires-preflight="true"]')].filter((el) => {
        const r = el.getBoundingClientRect();
        return r.width > 0 && r.height > 0;
      }).length,
    };
  }, pickBox.toString());
  report.desktopRegression = { url: roomUrl, shot, pageErrors, ...measure };
  await page.close();
}

await browser.close();

const fails = [];
const mf = report.mobileFixture;
if (mf.pageErrors.length > 0) fails.push(`mobile pageerror: ${mf.pageErrors.join(" | ")}`);
if (mf.overflowX) fails.push("mobile overflow-x detected");
if (!mf.kpiHeadBaselineAligned) fails.push("KPI head baseline misaligned");
if (!mf.kpiValueBaselineAligned) fails.push("KPI value baseline misaligned");
if (!mf.kpiSubBaselineAligned) fails.push("KPI sub baseline misaligned");
if (mf.kpiAnyOverflowX) fails.push("KPI column text overflow");
if (mf.primaryCtaVisibleCount !== 1)
  fails.push(`primary CTA visible count = ${mf.primaryCtaVisibleCount} (expect 1)`);
if (mf.ctaTextMatchCount !== 1) fails.push(`CTA text match count = ${mf.ctaTextMatchCount} (expect 1)`);
if (!mf.kpiLabels.includes("예상 시간")) fails.push('missing "예상 시간" label');
if (mf.kpiLabels.includes("예상 기간")) fails.push('forbidden "예상 기간" label present');
if (mf.durationText !== "—")
  fails.push(`duration text = "${mf.durationText}" (expect "—" for fixture null duration)`);
if (mf.clipped.length > 0) fails.push(`text clipping detected: ${JSON.stringify(mf.clipped)}`);
if (!mf.headerBox) fails.push("room header missing");
if (!mf.navBox) fails.push("room bottom nav missing");
if (mf.kpiRowBox && mf.ctaBarBox && mf.kpiRowBox.bottom > mf.ctaBarBox.y + 4) {
  fails.push("KPI row clipped by sticky CTA on first fold");
}
// Real overlap guard: the scroll viewport must end at (not past) the sticky footer —
// a partial next-section peeking at the fold before scrolling is normal, expected
// scrollable-page UX and is NOT an overlap bug.
if (mf.scrollEndsBeforeFooter === false) {
  fails.push("scroll content overlaps sticky CTA/nav footer");
}
if (mf.whyTitleText !== "가격 차이 기회") {
  fails.push(`why title = "${mf.whyTitleText}" (expect "가격 차이 기회")`);
}
if (!mf.compareVertical) fails.push("compare layout is not vertical");
// Founder Visual Final Fix #2: helper copy under CTA must be fully removed.
if (mf.ctaNoteCount !== 0) {
  fails.push(`cta helper copy count = ${mf.ctaNoteCount} (expect 0)`);
}
if (!mf.compareChipText?.includes("차익")) fails.push(`compare chip missing 차익: ${mf.compareChipText}`);
if (!/^[0-9]+(\.[0-9]+)?px$/.test(mf.ctaBarPaddingBottom ?? "")) {
  fails.push(`cta bar padding-bottom unexpected: ${mf.ctaBarPaddingBottom}`);
}
// Founder Visual Final Fix #1: capital surface must no longer be a white slab.
if (mf.capitalBg === "rgb(255, 255, 255)" || mf.capitalBg === "#ffffff") {
  fails.push(`capital surface still white: ${mf.capitalBg}`);
}
// Bottom navigation must be untouched (5 items, same labels, unchanged behavior).
const expectedNavLabels = ["홈", "기회 탐색", "내 자산", "알림", "더보기"];
if (mf.navItems.length !== 5 || expectedNavLabels.some((l) => !mf.navItems.includes(l))) {
  fails.push(`bottom nav regression: ${JSON.stringify(mf.navItems)}`);
}
// Founder Visual Final Fix #3: step connector must be visible between non-last steps.
const nonLastConnectors = mf.stepConnectors.filter((s) => !s.isLast);
if (nonLastConnectors.length === 0 || !nonLastConnectors.every((s) => s.hasVisibleLine)) {
  fails.push(`step connector not visible: ${JSON.stringify(mf.stepConnectors)}`);
}
const rr = report.realRouteSmoke;
if (rr.pageErrors.length > 0) fails.push(`real-route pageerror: ${rr.pageErrors.join(" | ")}`);
if (rr.overflowX) fails.push("real-route overflow-x detected");
if (!rr.hasMobileRoot) fails.push("real-route did not render mobile room root");
const dr = report.desktopRegression;
if (dr.pageErrors.length > 0) fails.push(`desktop pageerror: ${dr.pageErrors.join(" | ")}`);
if (dr.overflowX) fails.push("desktop overflow-x detected");
if (dr.ctaCount !== 1) fails.push(`desktop primary CTA visible count = ${dr.ctaCount} (expect 1)`);
if (!dr.hero || !dr.facts) fails.push("desktop hero/facts geometry missing (regression)");

report.verdict = fails.length === 0 ? "PASS" : "FAIL";
report.fails = fails;

fs.writeFileSync(path.join(outDir, "cux-003-room-mobile-report.json"), JSON.stringify(report, null, 2));
console.log(JSON.stringify(report, null, 2));
if (report.verdict !== "PASS") process.exit(1);
