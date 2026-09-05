/**
 * verify:profits-live-wire — REL-106 /profits
 * live feed · error≠empty · requiredCapital owner · Playwright
 */
const fs = require("fs");
const path = require("path");
const { spawnSync } = require("node:child_process");

const root = path.resolve(__dirname, "../..");
const fails = [];

function fail(msg) {
  fails.push(msg);
}

function mustExist(rel) {
  if (!fs.existsSync(path.join(root, rel))) fail(`missing: ${rel}`);
}

function read(rel) {
  const p = path.join(root, rel);
  if (!fs.existsSync(p)) {
    fail(`missing: ${rel}`);
    return "";
  }
  return fs.readFileSync(p, "utf8");
}

const files = [
  "apps/web/app/profits/page.tsx",
  "apps/web/app/ProfitsDesktopClient.tsx",
  "apps/web/app/profits/[id]/page.tsx",
  "apps/web/components/spark-dash-profits/map-runtime.ts",
  "apps/web/components/spark-dash-profits/ProfitsDesktop.tsx",
  "apps/web/components/spark-dash-profits/ProfitsMobile.tsx",
  "packages/sdk/src/user-feed/fetch.ts",
  "packages/sdk/package.json",
  "tooling/e2e/specs/profits-closure.spec.cjs",
];
for (const f of files) mustExist(f);

const listPage = read("apps/web/app/profits/page.tsx");
const desktopClient = read("apps/web/app/ProfitsDesktopClient.tsx");
// live surface owner = governance/runtime-surfaces.v1.json surfaces.profits.
// apps/web/app/profits/ProfitsPageClient.tsx is a registered legacyOwner
// (unreachable from apps/web/app/profits/page.tsx) and must not be consulted
// here, existsSync or otherwise (verify:live-surface-integrity enforces this).
const listSrc = `${listPage}\n${desktopClient}`;
const detailPage = read("apps/web/app/profits/[id]/page.tsx");
const feed = read("packages/sdk/src/user-feed/fetch.ts");
const types = read("packages/sdk/src/user-feed/types.ts");
const sdkPkg = read("packages/sdk/package.json");
const mapRuntime = read("apps/web/components/spark-dash-profits/map-runtime.ts");
const desktop = read("apps/web/components/spark-dash-profits/ProfitsDesktop.tsx");
const mobile = read("apps/web/components/spark-dash-profits/ProfitsMobile.tsx");
const metrics = read("apps/web/components/spark-dash-profits/OpportunityMetrics.tsx");
const spec = read("tooling/e2e/specs/profits-closure.spec.cjs");
const pkg = read("package.json");

if (!sdkPkg.includes('"./user-feed"')) {
  fail("@aipo/sdk must export ./user-feed (PART9a)");
}
if (!feed.includes("fetchOpportunityFeed")) {
  fail("user-feed must export fetchOpportunityFeed");
}
if (!feed.includes("fetchOpportunityDetail")) {
  fail("user-feed must export fetchOpportunityDetail");
}
if (!feed.includes("OpportunityFeedError") || !types.includes("OpportunityFeedError")) {
  fail("feed failures must be typed (401 vs network vs HTTP)");
}

if (!listPage.includes("ProfitsDesktopClient")) {
  fail("/profits must mount ProfitsDesktopClient");
}
if (listPage.includes("opportunities-desktop") || listPage.includes("opportunities-mobile")) {
  fail("do not create separate desktop/mobile production routes");
}
if (!desktopClient.includes("fetchOpportunityFeed")) {
  fail("ProfitsDesktopClient must call fetchOpportunityFeed");
}
if (!desktopClient.includes("UNAUTHORIZED") || !desktopClient.includes("ERROR")) {
  fail("feed 401 and other failures must stay distinct");
}
if (desktopClient.includes("SPARK_DASH") && desktopClient.includes("VISUAL_FIXTURE")) {
  fail("production /profits must not import the visual fixture");
}
if (!mapRuntime.includes("requiredCapitalUsdt")) {
  fail("map-runtime must pass through requiredCapitalUsdt");
}
if (mapRuntime.includes('capitalUsdt: "0"') || /capitalUsdt:\s*"0/.test(mapRuntime)) {
  fail("missing required capital must not become 0");
}
if (!metrics.includes("최소 참여 원금") && !mobile.includes("필요 원금")) {
  fail("list must show required capital in product language");
}
if (!metrics.includes("확인할 수 없음") || !mobile.includes("확인할 수 없음")) {
  fail("missing required capital must be unavailable, not 0");
}
if (!desktop.includes("onQuery") || !desktop.includes("onFilter")) {
  fail("search/filter controls must be wired");
}
if (!spec.includes("applyOpportunitySearch") || !spec.includes("zzz-no-match")) {
  fail("profits-closure must type a non-matching query and prove filter-empty");
}
if (
  !spec.includes("filter-empty") ||
  !spec.includes("toHaveCount(0)")
) {
  fail("non-matching search must require zero cards, not idle no-op");
}
if (!spec.includes("UNAUTHORIZED") || !spec.includes("ERROR") || !spec.includes("EMPTY")) {
  fail("profits-closure must keep unauthorized/error/empty distinct");
}
if (!pkg.includes('"verify:profits-live-wire"')) {
  fail("package.json missing verify:profits-live-wire");
}
if (!detailPage.includes("fetchOpportunityDetail")) {
  fail("/profits/[id] must keep fetchOpportunityDetail");
}

function usesSdk(src, fn) {
  return (
    src.includes("@aipo/sdk/user-feed") ||
    src.includes(fn) ||
    src.includes("fetchOpportunity")
  );
}
if (!usesSdk(listSrc, "fetchOpportunityFeed")) {
  fail("/profits must live-wire fetchOpportunityFeed");
}

// D1-BLK-009 windowing structural + live parity (2026-09-05, PUTDUK-FULL-
// RELEASE Phase C): both desktop's windowing (VirtualOpportunityGrid.tsx)
// AND mobile's (ProfitsMobile.tsx) now have a full live Playwright cycle
// (20 initial -> scroll -> all N, zero omission/duplication - see
// profits-closure.spec.cjs's desktop AND mobile windowing tests; mobile's
// scroll is dispatched via a hover+wheel sequence targeted at its own
// inner scroll container [data-sdpm='scroll'], which also carries a
// synchronous data-virtual attribute so the windowed code path itself is
// asserted without racing the live DOM count). The structural checks below
// are kept as an additional, cheap defense-in-depth net (catch a future
// accidental threshold/observer removal even before Playwright reruns).
const virtualGridSrc = read(
  "apps/web/components/spark-dash-profits/VirtualOpportunityGrid.tsx",
);
if (!virtualGridSrc.includes("VIRTUAL_OPPORTUNITY_THRESHOLD = 20")) {
  fail("VirtualOpportunityGrid must keep desktop windowing threshold at 20");
}
if (!virtualGridSrc.includes("IntersectionObserver")) {
  fail("VirtualOpportunityGrid must use IntersectionObserver for incremental reveal");
}
if (!mobile.includes("VIRTUAL_PROFITS_MOBILE_THRESHOLD = 20")) {
  fail("ProfitsMobile must keep mobile windowing threshold at 20 (parity with desktop)");
}
if (!mobile.includes("IntersectionObserver")) {
  fail("ProfitsMobile must use IntersectionObserver for incremental reveal (parity with desktop)");
}
if (!mobile.includes('data-testid="profits-mobile-sentinel"')) {
  fail("ProfitsMobile must expose a sentinel testid for windowing E2E proof");
}
if (!spec.includes("windows above 20 items")) {
  fail("profits-closure must keep a live >20-item windowing proof");
}

if (fails.length) {
  console.error("[verify:profits-live-wire] FAIL\n- " + fails.join("\n- "));
  process.exit(1);
}

function finish(extra) {
  if (fails.length) {
    console.error("[verify:profits-live-wire] FAIL\n- " + fails.join("\n- "));
    process.exit(1);
  }
  console.log(
    "[verify:profits-live-wire] PASS — live feed · error≠empty · requiredCapital" +
      (extra ? ` · ${extra}` : ""),
  );
}

if (
  process.env.PROFITS_CLOSURE_STATIC_ONLY === "1" ||
  process.env.CI === "true" ||
  process.env.CI === "1"
) {
  finish(process.env.PROFITS_CLOSURE_STATIC_ONLY === "1" ? "static-only" : "ci-static");
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
      "profits-closure.spec.cjs",
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
      fail("committed Playwright profits-closure runtime failed");
    }
    finish("browser");
  })
  .catch((err) => {
    fail(err && err.message ? err.message : String(err));
    finish("browser");
  });
