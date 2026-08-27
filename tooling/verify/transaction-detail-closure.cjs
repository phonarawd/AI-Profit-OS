/**
 * verify:transaction-detail-closure — REL-119
 * /wallet/history/[journalId] = REL-015 slip. 403 other. no recalc.
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
  "apps/web/app/wallet/history/[journalId]/page.tsx",
  "apps/web/app/wallet/history/[journalId]/HistoryDetailClient.tsx",
  "tooling/e2e/specs/transaction-detail-closure.spec.cjs",
];
for (const f of files) {
  if (!fs.existsSync(path.join(root, f))) fail(`missing: ${f}`);
}

const client = read(
  "apps/web/app/wallet/history/[journalId]/HistoryDetailClient.tsx",
);
const spec = read("tooling/e2e/specs/transaction-detail-closure.spec.cjs");
const pkg = read("package.json");
const catalog = read("tooling/verify/CATALOG.md");
const domain = read("tooling/verify/domain-by-path.cjs");
const sdkLedger = read("packages/sdk/src/ledger/fetch.ts");

if (!client.includes("fetchUserJournal")) {
  fail("detail must call fetchUserJournal");
}
if (/reduce\(|\.reduce\(|\+ Number\(/.test(client)) {
  fail("detail must not recalculate amounts");
}
if (!client.includes("다른 분의 내역은 볼 수 없어요.")) {
  fail("detail must keep 403 copy");
}
if (!spec.includes("other") || !spec.includes("25.00 USDT")) {
  fail("committed spec must cover own + other");
}
if (!pkg.includes('"verify:transaction-detail-closure"')) {
  fail("package.json missing verify:transaction-detail-closure");
}
if (!catalog.includes("transaction-detail-closure")) {
  fail("CATALOG.md must list transaction-detail-closure");
}
if (!domain.includes("transaction-detail-closure.cjs")) {
  fail("domain-by-path must trigger transaction-detail-closure");
}

if (/direction:\s*o\.direction\s*===\s*"debit"\s*\?\s*"debit"\s*:\s*"credit"/.test(sdkLedger)) {
  fail("ledger SDK must not coerce unknown direction to credit");
}
for (const needle of [
  "exactListShape",
  "JOURNAL_KEYS",
  "ENTRY_KEYS",
  'raw.direction === "debit" || raw.direction === "credit"',
  "if (!entry) return null",
  'throw new LedgerRequestError(502, "ledger item shape")',
]) {
  if (!sdkLedger.includes(needle)) fail("ledger SDK strict parser missing " + needle);
}

function finish(extra) {
  if (fails.length) {
    console.error("[verify:transaction-detail-closure] FAIL\n- " + fails.join("\n- "));
    process.exit(1);
  }
  console.log(
    "[verify:transaction-detail-closure] PASS — REL-015 slip · no recalc · own/other" +
      (extra ? ` · ${extra}` : ""),
  );
}

if (
  process.env.TRANSACTION_DETAIL_CLOSURE_STATIC_ONLY === "1" ||
  process.env.CI === "true" ||
  process.env.CI === "1"
) {
  finish(process.env.TRANSACTION_DETAIL_CLOSURE_STATIC_ONLY === "1" ? "static-only" : "ci-static");
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
      "transaction-detail-closure.spec.cjs",
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
      fail("committed Playwright transaction-detail-closure runtime failed");
    }
    finish("browser");
  })
  .catch((err) => {
    fail(err && err.message ? err.message : String(err));
    finish("browser");
  });
