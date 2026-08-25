/**
 * verify:opportunity-detail-live-wire — REL-107 /profits/[id]
 * live detail · error≠empty/404 · requiredCapital continuity · preflight before execute
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
  "apps/web/app/profits/[id]/page.tsx",
  "apps/web/app/profits/[id]/OpportunityDetailClient.tsx",
  "apps/web/components/spark-dash-room/map-runtime.ts",
  "apps/web/components/spark-dash-room/OpportunityRoomDesktop.tsx",
  "apps/web/components/spark-dash-room/OpportunityRoomMobile.tsx",
  "packages/sdk/src/participate/fetch.ts",
  "packages/sdk/src/user-feed/fetch.ts",
  "tooling/e2e/specs/opportunity-detail-closure.spec.cjs",
];
for (const f of files) mustExist(f);

const page = read("apps/web/app/profits/[id]/page.tsx");
const client = read("apps/web/app/profits/[id]/OpportunityDetailClient.tsx");
const mapRuntime = read("apps/web/components/spark-dash-room/map-runtime.ts");
const desktop = read("apps/web/components/spark-dash-room/OpportunityRoomDesktop.tsx");
const mobile = read("apps/web/components/spark-dash-room/OpportunityRoomMobile.tsx");
const spec = read("tooling/e2e/specs/opportunity-detail-closure.spec.cjs");
const pkg = read("package.json");

if (!page.includes("OpportunityDetailClient")) {
  fail("page must mount OpportunityDetailClient");
}
if (!page.includes("fetchOpportunityDetail")) {
  fail("page/live-wire comment must keep fetchOpportunityDetail");
}
if (page.includes("opportunities-desktop") || page.includes("opportunities-mobile")) {
  fail("do not create separate desktop/mobile production routes");
}
if (client.includes("SPARK_DASH") && client.includes("VISUAL_FIXTURE")) {
  fail("production detail must not import the visual fixture");
}
if (!client.includes("fetchOpportunityDetail") || !client.includes("issuePreflight") || !client.includes("postParticipate")) {
  fail("detail must live-wire detail + preflight + participate");
}
if (!client.includes("UNAUTHORIZED") || !client.includes('"error"') || !client.includes('"missing"')) {
  fail("401 / 404 / other failures must stay distinct");
}
if (client.includes("/trades/${oppId}/execute") || client.includes("`/trades/${id}/execute`")) {
  fail("detail must not treat opportunityId as tradeId");
}
if (!client.includes("/trades/${result.tradeId}/execute") && !client.includes("`/trades/${result.tradeId}/execute`")) {
  fail("accepted participate must go to /trades/:tradeId/execute");
}
if (
  !mapRuntime.includes("requiredCapitalUsdt") ||
  !mapRuntime.includes("quoteKrw") ||
  !/capitalKrw:\s*quotedCapital \? formatKrwApproxLine\(quotedCapital\) : null/.test(mapRuntime)
) {
  fail("room mapper must pass through required capital and not invent KRW");
}
if (!desktop.includes("필요 원금") || !mobile.includes("필요 원금")) {
  fail("room must show required capital in product language");
}
if (!desktop.includes("확인할 수 없음") || !mobile.includes("확인할 수 없음")) {
  fail("missing required capital must be unavailable, not 0");
}
if (
  !spec.includes("unauthorized") ||
  !spec.includes("error") ||
  !spec.includes("missing")
) {
  fail("detail-closure must keep unauthorized/error/missing distinct");
}
if (!spec.includes("qa-rel106-opp") || !spec.includes("250.00")) {
  fail("detail-closure must keep list→detail identity and capital continuity");
}
if (!pkg.includes('"verify:opportunity-detail-live-wire"')) {
  fail("package.json missing verify:opportunity-detail-live-wire");
}

if (fails.length) {
  console.error("[verify:opportunity-detail-live-wire] FAIL\n- " + fails.join("\n- "));
  process.exit(1);
}

function finish(extra) {
  if (fails.length) {
    console.error("[verify:opportunity-detail-live-wire] FAIL\n- " + fails.join("\n- "));
    process.exit(1);
  }
  console.log(
    "[verify:opportunity-detail-live-wire] PASS — live detail · error≠empty · requiredCapital · preflight" +
      (extra ? ` · ${extra}` : ""),
  );
}

if (
  process.env.OPPORTUNITY_DETAIL_STATIC_ONLY === "1" ||
  process.env.CI === "true" ||
  process.env.CI === "1"
) {
  finish(process.env.OPPORTUNITY_DETAIL_STATIC_ONLY === "1" ? "static-only" : "ci-static");
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
      "opportunity-detail-closure.spec.cjs",
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
      fail("committed Playwright opportunity-detail-closure runtime failed");
    }
    finish("browser");
  })
  .catch((err) => {
    fail(err && err.message ? err.message : String(err));
    finish("browser");
  });
