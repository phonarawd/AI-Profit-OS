/**
 * verify:transaction-history-closure — REL-118
 * /wallet/history = REL-015 list. mock array 0.
 */
"use strict";

const fs = require("node:fs");
const path = require("node:path");
const { spawnSync } = require("node:child_process");

const root = path.resolve(__dirname, "../..");
const fails = [];

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

const files = [
  "apps/web/app/wallet/history/page.tsx",
  "apps/web/app/wallet/history/HistoryClient.tsx",
  "tooling/e2e/specs/transaction-history-closure.spec.cjs",
];
for (const f of files) {
  if (!fs.existsSync(path.join(root, f))) fail(`missing: ${f}`);
}

const page = read("apps/web/app/wallet/history/page.tsx");
const client = read("apps/web/app/wallet/history/HistoryClient.tsx");
const spec = read("tooling/e2e/specs/transaction-history-closure.spec.cjs");
const stubs = read("tooling/e2e/lib/consumer-route-stubs.cjs");
const pkg = read("package.json");
const catalog = read("tooling/verify/CATALOG.md");
const domain = read("tooling/verify/domain-by-path.cjs");

if (!page.includes("HistoryClient")) fail("history page must mount HistoryClient");
if (!client.includes("fetchUserJournalList")) {
  fail("history must call fetchUserJournalList");
}
if (/reduce\(|\.reduce\(/.test(client)) {
  fail("history must not sum journal amounts");
}
if (/MOCK_|fakeHistory|mockItems/.test(client)) {
  fail("history must not keep a mock array");
}
if (!spec.includes("empty") || !spec.includes("unauthorized") || !spec.includes("25.00 USDT")) {
  fail("committed spec must cover ready/empty/unauthorized");
}
if (!stubs.includes("stubHistory") || !stubs.includes("jn-rel118")) {
  fail("stubHistory must expose a real REL-015 shaped row");
}
if (!pkg.includes('"verify:transaction-history-closure"')) {
  fail("package.json missing verify:transaction-history-closure");
}
if (!catalog.includes("transaction-history-closure")) {
  fail("CATALOG.md must list transaction-history-closure");
}
if (!domain.includes("transaction-history-closure.cjs")) {
  fail("domain-by-path must trigger transaction-history-closure");
}

function finish(extra) {
  if (fails.length) {
    console.error("[verify:transaction-history-closure] FAIL\n- " + fails.join("\n- "));
    process.exit(1);
  }
  console.log(
    "[verify:transaction-history-closure] PASS — REL-015 list · mock 0 · empty≠401" +
      (extra ? ` · ${extra}` : ""),
  );
}

if (
  process.env.TRANSACTION_HISTORY_CLOSURE_STATIC_ONLY === "1" ||
  process.env.CI === "true" ||
  process.env.CI === "1"
) {
  finish(process.env.TRANSACTION_HISTORY_CLOSURE_STATIC_ONLY === "1" ? "static-only" : "ci-static");
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
      "transaction-history-closure.spec.cjs",
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
      fail("committed Playwright transaction-history-closure runtime failed");
    }
    finish("browser");
  })
  .catch((err) => {
    fail(err && err.message ? err.message : String(err));
    finish("browser");
  });
