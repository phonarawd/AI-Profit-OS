/**
 * verify:home-closure — REL-105
 * Home freeze 유지 + committed Playwright 실브라우저. skip/NOT_RUN 위조 0.
 */
"use strict";

const fs = require("node:fs");
const path = require("node:path");
const { spawnSync } = require("node:child_process");

const root = path.resolve(__dirname, "../..");
const fails = [];
const { assertNoRuntimeMasquerade } = require("./lib/evidence-class.cjs");
for (const msg of assertNoRuntimeMasquerade(
  fs.readFileSync(__filename, "utf8"),
  "home-closure",
)) {
  fails.push(msg);
}

function fail(msg) {
  fails.push(msg);
}

function read(rel) {
  const fp = path.join(root, rel);
  if (!fs.existsSync(fp)) {
    fail(`missing: ${rel}`);
    return "";
  }
  return fs.readFileSync(fp, "utf8");
}

const freeze = read("governance/consumer-home-approval/home-approval-freeze.v1.json");
const homeClient = read("apps/web/app/HomeDesktopClient.tsx");
const page = read("apps/web/app/page.tsx");
const rootLayout = read("apps/web/app/layout.tsx");
const guest = read("apps/web/app/GuestFirstVisit.tsx");
const guestCss = read("apps/web/app/guest-first-visit.css");
const emptyMap = read("apps/web/components/spark-dash-home/map-runtime.ts");
const format = read("apps/web/components/spark-dash-home/format.ts");
const desktop = read("apps/web/components/spark-dash-home/HomeDesktop.tsx");
const mobile = read("apps/web/components/spark-dash-home/HomeMobile.tsx");
const spec = read("tooling/e2e/specs/home-closure.spec.cjs");
const runtime = read("tooling/e2e/lib/local-web-runtime.cjs");
const stubs = read("tooling/e2e/lib/consumer-route-stubs.cjs");
const pkg = read("package.json");
const catalog = read("tooling/verify/CATALOG.md");
const domain = read("tooling/verify/domain-by-path.cjs");

if (freeze && !freeze.includes('"LOCKED"')) {
  fail("Home freeze LOCKED must remain");
}
if (page && !page.includes("HomeDesktopClient")) {
  fail("`/` must stay HomeDesktopClient");
}
if (rootLayout.includes("AppShellRoot") || rootLayout.includes("USER_TABS")) {
  fail("root layout must not own legacy AppShellRoot chrome");
}
if (guest.includes("GuestChrome") || /fixed inset-0 z-50/.test(guest)) {
  fail("GuestFirstVisit must not hide legacy chrome with an overlay");
}
if (!guestCss.includes(".gfv") || !guestCss.includes("#07101d") || !guestCss.includes("#ff2d6b")) {
  fail("guest-first-visit.css must keep Spark Dash navy/pink DNA, scoped to .gfv");
}
if (guestCss.includes(".sd-root") || guestCss.includes(".sdm-root")) {
  fail("guest CSS must not bind to Home geometry selectors");
}
if (!spec.includes("app-shell") || !spec.includes("toHaveCount(0)")) {
  fail("home-closure spec must prove legacy shell is absent on /");
}
if (
  !spec.includes("/dev/spark-dash-desktop") ||
  !spec.includes("/dev/spark-dash-mobile")
) {
  fail("home-closure spec must isolate /dev visual fixtures from legacy chrome");
}
for (const rel of [
  "apps/web/app/profits/layout.tsx",
  "apps/web/app/trades/layout.tsx",
]) {
  const src = fs.existsSync(path.join(root, rel)) ? read(rel) : "";
  if (src.includes("AppShellRoot") || src.includes("LegacyAppShell")) {
    fail(`${rel} must not inherit leftover AppShell (REL-106+ boundary)`);
  }
}
if (!homeClient.includes("fetchHomeReadModel")) {
  fail("Home must keep fetchHomeReadModel wiring");
}
if (!homeClient.includes("GuestFirstVisit") || !homeClient.includes("emptyRuntimeModel")) {
  fail("unauthorized Home must keep GuestFirstVisit + emptyRuntimeModel");
}
if (!homeClient.includes("unavailable") || !homeClient.includes("HomeSessionUnavailable")) {
  fail("API/network failure must be distinct from confirmed guest");
}
if (/catch\s*\{[\s\S]{0,180}setGate\(["']guest["']\)/.test(homeClient)) {
  fail("catch path must not mark the session as confirmed guest");
}
if (homeClient.includes("SPARK_DASH_DESKTOP_VISUAL_FIXTURE")) {
  fail("HomeDesktopClient must not import the visual fixture");
}
if (!homeClient.includes("home-authenticated")) {
  fail("authenticated Home needs a stable test hook (geometry-neutral)");
}

const emptyFn = emptyMap.slice(emptyMap.indexOf("export function emptyRuntimeModel"));
const emptySlice = emptyFn.slice(0, 1800);
if (emptySlice.includes('"0"') || /usdt:\s*"0/.test(emptySlice)) {
  fail("emptyRuntimeModel must not coerce missing money to 0");
}
if (!emptySlice.includes("usdt: null") || !emptySlice.includes("hero: null")) {
  fail("emptyRuntimeModel must keep money/hero null");
}
if (!format.includes("UNAVAILABLE") || !format.includes("moneyOrDash")) {
  fail("Home money formatter must keep UNAVAILABLE / dash");
}
if (!desktop.includes('href="/profits"') || !mobile.includes('hrefFallback: "/profits"')) {
  fail("Home must keep navigation into /profits");
}

if (!runtime.includes("loopback") || !runtime.includes("production host denied")) {
  fail("local-web-runtime must deny production hosts");
}
if (!stubs.includes("todayPossibleProfitUsdt") || stubs.includes("2450")) {
  fail("auth stub must not invent profit");
}
if (!spec.includes("ensureLocalWebRuntime")) {
  fail("home-closure spec must start/use local web runtime");
}
if (spec.includes('test.skip(!base') || spec.includes("PLAYWRIGHT_BASE_URL 없으면")) {
  fail("REL-105 must not skip browser runtime for missing PLAYWRIGHT_BASE_URL");
}
for (const token of ["390", "1440", "2560", "3440", "3840"]) {
  if (!spec.includes(token)) fail(`home-closure spec must cover ${token}`);
}
if (!spec.includes("axe") || !spec.includes("blockingViolations")) {
  fail("home-closure must reuse the REL-012 axe harness");
}
if (!pkg.includes('"verify:home-closure"')) {
  fail("package.json missing verify:home-closure");
}
if (!catalog.includes("home-closure")) {
  fail("CATALOG.md must list home-closure");
}
if (!domain.includes("home-closure.cjs")) {
  fail("domain-by-path must trigger home-closure");
}

function finish(extra) {
  if (fails.length) {
    console.error("[verify:home-closure] FAIL\n- " + fails.join("\n- "));
    process.exit(1);
  }
  const evidence =
    extra === "browser"
      ? "BROWSER_PASS"
      : extra === "static-only" || extra === "ci-static"
        ? "STATIC_VERIFIER_PASS"
        : "STATIC_VERIFIER_PASS";
  console.log(
    "[verify:home-closure] " +
      evidence +
      " (freeze · empty money · /profits nav" +
      (extra ? ` · ${extra}` : "") +
      ") · RUNTIME_BEHAVIOR_PASS=NOT_CLAIMED · REMOTE_CI_PASS=NOT_PROVEN",
  );
}

if (
  process.env.HOME_CLOSURE_STATIC_ONLY === "1" ||
  process.env.CI === "true" ||
  process.env.CI === "1"
) {
  finish(process.env.HOME_CLOSURE_STATIC_ONLY === "1" ? "static-only" : "ci-static");
  process.exit(0);
}

const { ensureLocalWebRuntime } = require("../e2e/lib/local-web-runtime.cjs");

async function runBrowser() {
  const web = await ensureLocalWebRuntime({ timeoutMs: 180000 });
  const result = spawnSync(
    process.execPath,
    [
      path.join(root, "node_modules/@playwright/test/cli.js"),
      "test",
      "--config",
      "tooling/e2e/playwright.config.cjs",
      "home-closure.spec.cjs",
    ],
    {
      cwd: root,
      encoding: "utf8",
      env: {
        ...process.env,
        PLAYWRIGHT_BASE_URL: web.baseUrl,
        NODE_OPTIONS: process.env.NODE_OPTIONS || "--max-old-space-size=1536",
      },
      timeout: 420000,
    },
  );
  await web.stop();
  return result;
}

runBrowser()
  .then((result) => {
    process.stdout.write(result.stdout || "");
    process.stderr.write(result.stderr || "");
    if (result.status !== 0) {
      fail("committed Playwright home-closure runtime failed");
    }
    if (
      (result.stdout || "").includes("skipped") &&
      (result.stdout || "").includes("PLAYWRIGHT_BASE_URL")
    ) {
      fail("runtime tests skipped — REL-105 forbids NOT_RUN");
    }
    finish("browser");
  })
  .catch((err) => {
    fail(err && err.message ? err.message : String(err));
    finish("browser");
  });
