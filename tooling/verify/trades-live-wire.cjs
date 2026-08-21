/**
 * verify:trades-live-wire — REL-110 /trades
 * live list · error≠empty · wallet profit owner · no CountUp 0
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
  "apps/web/app/trades/page.tsx",
  "apps/web/app/trades/TradesClient.tsx",
  "packages/sdk/src/trades/fetch.ts",
  "tooling/e2e/specs/trades-closure.spec.cjs",
];
for (const f of files) mustExist(f);

const page = read("apps/web/app/trades/page.tsx");
const client = read("apps/web/app/trades/TradesClient.tsx");
const spec = read("tooling/e2e/specs/trades-closure.spec.cjs");
const pkg = read("package.json");

if (!page.includes("TradesClient")) fail("page must mount TradesClient");
if (page.includes("opportunities-desktop") || page.includes("trades-desktop")) {
  fail("do not create separate desktop/mobile production routes");
}
if (page.includes("CountUpNumber") || client.includes("CountUpNumber")) {
  fail("trades must not keep CountUpNumber fake totals");
}
if (client.includes("12.50") || client.includes("Math.random")) {
  fail("trades must not invent money or RNG");
}
if (!client.includes("fetchTradeList") || !client.includes("fetchWalletBuckets")) {
  fail("trades must fetch list + wallet buckets");
}
if (!client.includes("확인할 수 없음")) {
  fail("missing wallet profit must be unavailable, not 0");
}
if (!spec.includes("unauthorized") || !spec.includes("unavailable") || !spec.includes("empty")) {
  fail("spec must cover unauthorized / unavailable / empty");
}
if (!pkg.includes('"verify:trades-live-wire"')) {
  fail("package.json missing verify:trades-live-wire");
}

if (fails.length) {
  console.error("[verify:trades-live-wire] FAIL\n- " + fails.join("\n- "));
  process.exit(1);
}

function finish(extra) {
  if (fails.length) {
    console.error("[verify:trades-live-wire] FAIL\n- " + fails.join("\n- "));
    process.exit(1);
  }
  console.log(
    "[verify:trades-live-wire] PASS — list fetch · error≠empty · wallet owner" +
      (extra ? ` · ${extra}` : ""),
  );
}

if (
  process.env.TRADES_CLOSURE_STATIC_ONLY === "1" ||
  process.env.CI === "true" ||
  process.env.CI === "1"
) {
  finish(process.env.TRADES_CLOSURE_STATIC_ONLY === "1" ? "static-only" : "ci-static");
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
      "trades-closure.spec.cjs",
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
      fail("committed Playwright trades-closure runtime failed");
    }
    finish("browser");
  })
  .catch((err) => {
    fail(err && err.message ? err.message : String(err));
    finish("browser");
  });
