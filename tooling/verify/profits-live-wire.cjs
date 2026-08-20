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
const listClient = fs.existsSync(
  path.join(root, "apps/web/app/profits/ProfitsPageClient.tsx"),
)
  ? read("apps/web/app/profits/ProfitsPageClient.tsx")
  : "";
const listSrc = `${listPage}\n${listClient}\n${desktopClient}`;
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

if (process.env.PROFITS_CLOSURE_STATIC_ONLY === "1") {
  finish("static-only");
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
