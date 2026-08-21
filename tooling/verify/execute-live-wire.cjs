/**
 * verify:execute-live-wire — REL-109 /trades/[id]/execute
 * server state owner · no query-fake success · settledProfit required
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
  "apps/web/app/trades/[id]/execute/page.tsx",
  "apps/web/app/trades/[id]/execute/TradeExecuteClient.tsx",
  "packages/sdk/src/execution-stream/useTradeExecution.ts",
  "tooling/e2e/specs/execute-closure.spec.cjs",
];
for (const f of files) mustExist(f);

const page = read("apps/web/app/trades/[id]/execute/page.tsx");
const client = read("apps/web/app/trades/[id]/execute/TradeExecuteClient.tsx");
const spec = read("tooling/e2e/specs/execute-closure.spec.cjs");
const pkg = read("package.json");

if (!page.includes("TradeExecuteClient")) fail("page must mount TradeExecuteClient");
if (page.includes("previewState") || client.includes("previewState")) {
  fail("execute must not keep previewState");
}
if (page.includes("searchParams.get(\"state\")") || client.includes("queryState")) {
  fail("execute must not fake success from ?state=");
}
if (client.includes("12.50") || client.includes("Math.random")) {
  fail("execute must not invent money or RNG");
}
if (/progressPct|stepIndex/.test(client)) {
  fail("execute must not bind progressPct/stepIndex");
}
if (!client.includes("MatchingInProgress") || !client.includes("StoppedSafely")) {
  fail("execute must keep consumer state machine");
}
if (!spec.includes("MatchingInProgress") || !spec.includes("StoppedSafely") || !spec.includes("Failed")) {
  fail("spec must cover running / safe-stop / failed");
}
if (!spec.includes("?state=success")) {
  fail("spec must prove query cannot fake success");
}
if (!pkg.includes('"verify:execute-live-wire"')) {
  fail("package.json missing verify:execute-live-wire");
}

if (fails.length) {
  console.error("[verify:execute-live-wire] FAIL\n- " + fails.join("\n- "));
  process.exit(1);
}

function finish(extra) {
  if (fails.length) {
    console.error("[verify:execute-live-wire] FAIL\n- " + fails.join("\n- "));
    process.exit(1);
  }
  console.log(
    "[verify:execute-live-wire] PASS — server state · no query-fake · settled owner" +
      (extra ? ` · ${extra}` : ""),
  );
}

if (process.env.EXECUTE_CLOSURE_STATIC_ONLY === "1") {
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
      "execute-closure.spec.cjs",
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
      fail("committed Playwright execute-closure runtime failed");
    }
    finish("browser");
  })
  .catch((err) => {
    fail(err && err.message ? err.message : String(err));
    finish("browser");
  });
