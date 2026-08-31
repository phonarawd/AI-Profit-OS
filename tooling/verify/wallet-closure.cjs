/**
 * verify:wallet-closure — REL-113
 * /wallet buckets server truth · unauthorized/ready · no leftover 5-tab chrome.
 */
"use strict";

const fs = require("node:fs");
const path = require("node:path");
const { pathToFileURL } = require("node:url");
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
  "apps/web/app/wallet/page.tsx",
  "apps/web/app/wallet/WalletClient.tsx",
  "apps/web/app/wallet/layout.tsx",
  "tooling/e2e/specs/wallet-closure.spec.cjs",
];
for (const f of files) {
  if (!fs.existsSync(path.join(root, f))) fail(`missing: ${f}`);
}

const page = read("apps/web/app/wallet/page.tsx");
const client = read("apps/web/app/wallet/WalletClient.tsx");
const layout = read("apps/web/app/wallet/layout.tsx");
const spec = read("tooling/e2e/specs/wallet-closure.spec.cjs");
const pkg = read("package.json");
const catalog = read("tooling/verify/CATALOG.md");
const domain = read("tooling/verify/domain-by-path.cjs");
const surface = `${page}\n${client}`;
const sdkWallet = read("packages/sdk/src/wallet/fetch.ts");

if (!page.includes("WalletClient")) fail("wallet page must mount WalletClient");
if (!client.includes("fetchWalletBuckets")) {
  fail("WalletClient must call fetchWalletBuckets");
}
if (/EMPTY_BUCKETS|principalUsdt:\s*"0"/.test(client)) {
  fail("wallet must not fall back missing buckets to 0");
}
if (/function\s+asAmount\b|:\s*"none"/.test(sdkWallet)) {
  fail("wallet SDK must not synthesize missing bucket authority");
}
for (const needle of [
  "const MONEY_RE",
  "wallet_buckets_shape",
  "WALLET_BUCKET_KEYS",
  "Object.keys(value)",
  'requiredMoney(value, "principalUsdt")',
  'requiredMoney(value, "profitUsdt")',
  'requiredMoney(value, "lockedUsdt")',
  'requiredMoney(value, "practiceUsdt")',
  'requiredMoney(value, "liabilityUsdt")',
  'requiredText(value, "asOfLedgerEntryId")',
]) {
  if (!sdkWallet.includes(needle)) fail("wallet SDK strict parser missing " + needle);
}
if (sdkWallet.includes("\\\\.[0-9]+") || /MONEY_RE = \/\^-\?\[0-9\]\+\(\\\\.\[0-9\]\+\)\?\$\//.test(sdkWallet)) {
  fail("wallet MONEY_RE must match decimal point, not a literal backslash");
}
if (!sdkWallet.includes("/^-?[0-9]+(\\.[0-9]+)?$/")) {
  fail("wallet MONEY_RE must accept optional decimal fraction");
}
if (/reduce\(|\.reduce\(/.test(client)) {
  fail("wallet must not sum buckets as authority");
}
if (client.includes("SafeStopTrustMetric")) {
  fail("wallet must not invent SafeStop count");
}
if (layout.includes("LegacyAppShell") || layout.includes("AppShellRoot")) {
  fail("wallet layout must not remount leftover 5-tab chrome");
}
if (!spec.includes("unauthorized") || !spec.includes("ready")) {
  fail("committed spec must cover unauthorized/ready");
}
if (!pkg.includes('"verify:wallet-closure"')) {
  fail("package.json missing verify:wallet-closure");
}
if (!catalog.includes("wallet-closure")) {
  fail("CATALOG.md must list wallet-closure");
}
if (!domain.includes("wallet-closure.cjs")) {
  fail("domain-by-path must trigger wallet-closure");
}
if (!surface.includes('data-testid="wallet-home"')) {
  fail("wallet must keep wallet-home testid");
}

function assertWalletReaderBehavior() {
  const fetchTs = pathToFileURL(path.join(root, "packages/sdk/src/wallet/fetch.ts")).href;
  const run = spawnSync(
    process.execPath,
    [
      "--experimental-strip-types",
      "--eval",
      `
import { normalizeWalletBuckets } from ${JSON.stringify(fetchTs)};
const base = {
  userId: "11111111-1111-4111-8111-111111111111",
  principalUsdt: "0",
  profitUsdt: "0",
  lockedUsdt: "0",
  practiceUsdt: "0",
  liabilityUsdt: "0",
  asOfLedgerEntryId: "le_1",
};
function expectThrow(name, raw) {
  try {
    normalizeWalletBuckets(raw);
    throw new Error("EXPECTED_THROW:" + name);
  } catch (err) {
    if (String(err && err.message).startsWith("EXPECTED_THROW:")) throw err;
    if (String(err && err.message) !== "wallet_buckets_shape") {
      throw new Error(name + " wrong error: " + (err && err.message));
    }
  }
}
const zero = normalizeWalletBuckets(base);
if (zero.principalUsdt !== "0" || zero.profitUsdt !== "0") {
  throw new Error("exact server zero must remain zero");
}
const decimal = normalizeWalletBuckets({ ...base, principalUsdt: "250.00", profitUsdt: "12.50" });
if (decimal.principalUsdt !== "250.00" || decimal.profitUsdt !== "12.50") {
  throw new Error("valid decimal money was rejected");
}
expectThrow("null", null);
expectThrow("array", []);
expectThrow("missing principal", ((o) => { const x = { ...o }; delete x.principalUsdt; return x; })(base));
expectThrow("wrong-type principal", { ...base, principalUsdt: 0 });
expectThrow("malformed decimal", { ...base, principalUsdt: "1." });
expectThrow("backslash decoy", { ...base, principalUsdt: "1\\\\x00" });
expectThrow("empty userId", { ...base, userId: "  " });
expectThrow("missing ledger", ((o) => { const x = { ...o }; delete x.asOfLedgerEntryId; return x; })(base));
expectThrow("extra key", { ...base, extra: "1" });
console.log("wallet-reader-behavior PASS");
      `,
    ],
    { cwd: root, encoding: "utf8" },
  );
  if (run.status !== 0) {
    fail(
      "wallet reader behavior failed: " +
        String(run.stderr || run.stdout || "").split("\n")[0],
    );
  }
}

assertWalletReaderBehavior();

function finish(extra) {
  if (fails.length) {
    console.error("[verify:wallet-closure] FAIL\n- " + fails.join("\n- "));
    process.exit(1);
  }
  console.log(
    "[verify:wallet-closure] PASS — buckets owner · no fake zero · no leftover chrome" +
      (extra ? ` · ${extra}` : ""),
  );
}

if (
  process.env.WALLET_CLOSURE_STATIC_ONLY === "1" ||
  process.env.CI === "true" ||
  process.env.CI === "1"
) {
  finish(process.env.WALLET_CLOSURE_STATIC_ONLY === "1" ? "static-only" : "ci-static");
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
      "wallet-closure.spec.cjs",
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
      fail("committed Playwright wallet-closure runtime failed");
    }
    finish("browser");
  })
  .catch((err) => {
    fail(err && err.message ? err.message : String(err));
    finish("browser");
  });
