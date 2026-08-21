/**
 * verify:settlement-detail — REL-112
 * SettlementDetail = REL-015 journal + trade toState. 재계산 0. 타인 403.
 */
"use strict";

const fs = require("node:fs");
const path = require("node:path");

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
  "apps/web/app/trades/[id]/settlement/page.tsx",
  "apps/web/app/trades/[id]/settlement/SettlementClient.tsx",
  "packages/sdk/src/ledger/fetch.ts",
  "packages/sdk/src/trades/fetch.ts",
  "tooling/e2e/specs/settlement-closure.spec.cjs",
];
for (const f of files) {
  if (!fs.existsSync(path.join(root, f))) fail(`missing: ${f}`);
}

const page = read("apps/web/app/trades/[id]/settlement/page.tsx");
const client = read("apps/web/app/trades/[id]/settlement/SettlementClient.tsx");
const ledger = read("packages/sdk/src/ledger/fetch.ts");
const trades = read("packages/sdk/src/trades/fetch.ts");
const spec = read("tooling/e2e/specs/settlement-closure.spec.cjs");
const stubs = read("tooling/e2e/lib/consumer-route-stubs.cjs");
const pkg = read("package.json");
const catalog = read("tooling/verify/CATALOG.md");
const domain = read("tooling/verify/domain-by-path.cjs");
const sdkPkg = read("packages/sdk/package.json");

if (!page.includes("SettlementClient")) {
  fail("settlement page must mount SettlementClient");
}
if (page.includes("settlement-desktop") || page.includes("settlement-mobile")) {
  fail("do not create separate desktop/mobile production routes");
}
if (!client.includes("fetchTrade") || !client.includes("fetchUserJournal")) {
  fail("SettlementClient must bind fetchTrade + REL-015 journal");
}
if (/reduce\(|\.reduce\(/.test(client)) {
  fail("settlement must not sum journal entries");
}
if (client.includes("Math.random") || client.includes("12.50")) {
  fail("settlement UI must not invent money");
}
if (!client.includes("확인할 수 없음")) {
  fail("missing settlement money must be unavailable");
}
if (!client.includes("다른 분의 내역은 볼 수 없어요")) {
  fail("foreign journal must use 403 copy");
}
if (!ledger.includes("/api/v1/me/ledger/journals") || !ledger.includes('method: "GET"')) {
  fail("ledger SDK must GET REL-015 journals");
}
if (/amountUsdt[\s\S]{0,40}\?\? ["']0["']/.test(ledger)) {
  fail("ledger SDK must not default amount to 0");
}
if (!trades.includes("export async function fetchTrade")) {
  fail("trades SDK must expose GET :id fetchTrade");
}
if (!spec.includes("own") || !spec.includes("other") || !spec.includes("missing")) {
  fail("committed spec must cover own / other / missing");
}
if (!spec.includes("403") && !spec.includes("forbidden")) {
  fail("committed spec must cover foreign 403");
}
if (!stubs.includes("stubSettlement")) {
  fail("consumer stubs must include stubSettlement");
}
if (!sdkPkg.includes('"./ledger"')) {
  fail("packages/sdk must export ./ledger");
}
if (!pkg.includes('"verify:settlement-detail"')) {
  fail("package.json missing verify:settlement-detail");
}
if (!catalog.includes("settlement-detail")) {
  fail("CATALOG.md must list settlement-detail");
}
if (!domain.includes("settlement-detail.cjs")) {
  fail("domain-by-path must trigger settlement-detail");
}

function finish(extra) {
  if (fails.length) {
    console.error("[verify:settlement-detail] FAIL\n- " + fails.join("\n- "));
    process.exit(1);
  }
  console.log(
    "[verify:settlement-detail] PASS — REL-015 journal · no recalc · own/other/missing" +
      (extra ? ` · ${extra}` : ""),
  );
}

if (
  process.env.SETTLEMENT_CLOSURE_STATIC_ONLY === "1" ||
  process.env.CI === "true" ||
  process.env.CI === "1"
) {
  finish(process.env.SETTLEMENT_CLOSURE_STATIC_ONLY === "1" ? "static-only" : "ci-static");
  process.exit(0);
}

const { spawnSync } = require("node:child_process");
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
      "settlement-closure.spec.cjs",
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
      fail("committed Playwright settlement-closure runtime failed");
    }
    finish("browser");
  })
  .catch((err) => {
    fail(err && err.message ? err.message : String(err));
    finish("browser");
  });
