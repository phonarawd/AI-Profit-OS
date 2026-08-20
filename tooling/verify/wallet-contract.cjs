#!/usr/bin/env node
/**
 * verify:wallet-contract — B-WALLET-001
 * Product/Visual/Implementation 계약 유지 + 2026-08-20 재실측.
 * Money Rule 재정의 0 · web 배선은 B-WALLET-002.
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

function readJson(rel) {
  const raw = read(rel);
  if (!raw) return null;
  try {
    return JSON.parse(raw);
  } catch {
    fail(`${rel} invalid JSON`);
    return null;
  }
}

const CONTRACT = "docs/product/consumer/CONSUMER_WALLET_CONTRACT.md";
const GOV = "governance/consumer-wallet/wallet.v1.json";

const WALLET_PAGES = [
  "apps/web/app/wallet/page.tsx",
  "apps/web/app/wallet/deposit/page.tsx",
  "apps/web/app/wallet/withdraw/page.tsx",
  "apps/web/app/wallet/withdraw/usdt/page.tsx",
  "apps/web/app/wallet/withdraw/krw/page.tsx",
  "apps/web/app/wallet/history/page.tsx",
  "apps/web/app/me/kyc/page.tsx",
  "apps/web/app/me/guide/get-usdt/page.tsx",
];

const requiredFiles = [
  CONTRACT,
  GOV,
  ...WALLET_PAGES,
  "packages/sdk/src/wallet/fetch.ts",
  "packages/sdk/src/wallet/index.ts",
  "packages/sdk/src/index.ts",
  "services/api-nest/src/wallet/wallet.controller.ts",
  "services/api-nest/src/wallet/wallet.routes.ts",
  "services/api-nest/src/wallet/deposit-address.service.ts",
  "services/api-nest/src/wallet/usdt-deposit.service.ts",
  "services/api-nest/src/wallet/chain-watcher.stages.ts",
  "services/api-nest/src/wallet/krw-deposit.apply.ts",
  "services/api-nest/src/wallet/withdraw-intent.service.ts",
  "services/api-nest/src/ledger/ledger.buckets.service.ts",
  "services/api-nest/src/compliance/kyc-gate.ts",
  "schemas/wallet-buckets.v1.json",
];
for (const f of requiredFiles) {
  if (!fs.existsSync(path.join(root, f))) fail(`missing: ${f}`);
}

const md = read(CONTRACT);
for (const token of [
  "## 1. Product Contract",
  "## 2. Visual Contract",
  "## 3. Implementation Contract",
  "## 4. Gap analysis",
  "MONEY_RULE_REDEFINITION = FORBIDDEN",
  "APPROVED FIGMA = NONE",
  "NEW_VISUAL_LOCK = NO",
  "HOME_GEOMETRY_DEPENDENCY = FORBIDDEN",
  "SPARK_DASH_DNA_SHARE = CONSTRAINT_ONLY",
  "PG_GATEWAY = FORBIDDEN",
  "MISSING_AS_ZERO = FORBIDDEN",
  "ONE_CONF_EQUALS_CREDITED = FORBIDDEN",
  "DEFAULT_WITHDRAW_MODE = profit",
  "WIRE_WITHOUT_APPROVED_FIGMA = ALLOWED",
  "INVENT_PRESENTATION = FORBIDDEN",
  "WEB_WALLET_PENDING_FIGMA = 8",
  "SDK_DEPOSIT_ADDRESS_EXPORT = MISSING",
  "REAL_IMPLEMENTATION = WEB_UNWIRED",
  "B-WALLET-002",
  "PendingFigma",
]) {
  if (md && !md.includes(token)) fail(`${CONTRACT} must contain: ${token}`);
}
if (md.includes("12.50")) fail(`${CONTRACT} must not invent 12.50`);

const gov = readJson(GOV);
if (gov) {
  if (gov.status !== "CONTRACT_READY") {
    fail("governance status must be CONTRACT_READY");
  }
  if (gov.implementationStatus !== "WEB_UNWIRED") {
    fail("implementationStatus must be WEB_UNWIRED until B-WALLET-002");
  }
  if (gov.task !== "B-WALLET-001") {
    fail("governance task must be B-WALLET-001");
  }
  if (gov.authority.MONEY_RULE_REDEFINITION !== "FORBIDDEN") {
    fail("MONEY_RULE_REDEFINITION must stay FORBIDDEN");
  }
  if (gov.authority.PG_GATEWAY !== "FORBIDDEN") {
    fail("PG_GATEWAY must stay FORBIDDEN");
  }
  if (gov.authority.KYC_ON_DEPOSIT !== "FORBIDDEN") {
    fail("KYC_ON_DEPOSIT must stay FORBIDDEN");
  }
  if (gov.authority.KYC_ON_PARTICIPATE !== "FORBIDDEN") {
    fail("KYC_ON_PARTICIPATE must stay FORBIDDEN");
  }
  if (gov.authority.KYC_ON_WITHDRAW !== "REQUIRED") {
    fail("KYC_ON_WITHDRAW must stay REQUIRED");
  }
  if (gov.authority.DEFAULT_WITHDRAW_MODE !== "profit") {
    fail("DEFAULT_WITHDRAW_MODE must stay profit");
  }
  if (gov.authority.MISSING_AS_ZERO !== "FORBIDDEN") {
    fail("MISSING_AS_ZERO must stay FORBIDDEN");
  }
  if (gov.authority.ONE_CONF_EQUALS_CREDITED !== "FORBIDDEN") {
    fail("ONE_CONF_EQUALS_CREDITED must stay FORBIDDEN");
  }
  if (gov.authority.APPROVED_FIGMA_WALLET !== "NONE") {
    fail("APPROVED_FIGMA_WALLET must stay NONE");
  }
  if (gov.authority.NEW_VISUAL_LOCK !== false) {
    fail("NEW_VISUAL_LOCK must stay false");
  }
  if (gov.authority.HOME_GEOMETRY_DEPENDENCY !== "FORBIDDEN") {
    fail("HOME_GEOMETRY_DEPENDENCY must stay FORBIDDEN");
  }
  if (gov.authority.SPARK_DASH_DNA_SHARE !== "CONSTRAINT_ONLY") {
    fail("SPARK_DASH_DNA_SHARE must stay CONSTRAINT_ONLY");
  }
  if (gov.authority.USDT_UI_CONFIRMATIONS !== 1) {
    fail("USDT_UI_CONFIRMATIONS must be 1");
  }
  if (gov.authority.USDT_LEDGER_CONFIRMATIONS !== 19) {
    fail("USDT_LEDGER_CONFIRMATIONS must be 19");
  }
  if (!Array.isArray(gov.rails) || gov.rails.length !== 4) {
    fail("governance.rails must list exactly 4 rails");
  }
  const railIds = (gov.rails || []).map((r) => r.id).sort().join(",");
  if (railIds !== "krw-deposit,krw-withdraw,usdt-deposit,usdt-withdraw") {
    fail("rails must be usdt-deposit, krw-deposit, usdt-withdraw, krw-withdraw");
  }
  if (gov.measured.webWalletPendingFigma !== 8) {
    fail("measured.webWalletPendingFigma must be 8");
  }
  if (gov.measured.webWalletBucketsFetch !== 0) {
    fail("measured.webWalletBucketsFetch must stay 0 until B-WALLET-002");
  }
  if (gov.measured.sdkWalletBucketsExport !== "PRESENT") {
    fail("sdkWalletBucketsExport must be PRESENT");
  }
  if (gov.measured.sdkDepositAddressExport !== "MISSING") {
    fail("sdkDepositAddressExport must stay MISSING until wired");
  }
  if (gov.measured.userJournalListApi !== "MISSING") {
    fail("userJournalListApi must stay MISSING (do not invent)");
  }
  if (gov.measured.fakeFinancialValueBug !== "CLOSED") {
    fail("fakeFinancialValueBug must stay CLOSED");
  }
}

let pending = 0;
for (const rel of WALLET_PAGES) {
  const src = read(rel);
  if (src.includes("PendingFigma")) pending += 1;
  else fail(`${rel} expected PendingFigma until B-WALLET-002`);
}
if (pending !== 8) {
  fail(`web PendingFigma wallet pages must be 8, got ${pending}`);
}

const sdkFetch = read("packages/sdk/src/wallet/fetch.ts");
const sdkIndex = read("packages/sdk/src/index.ts");
if (!sdkFetch.includes("export async function fetchWalletBuckets")) {
  fail("sdk wallet must export fetchWalletBuckets");
}
if (!sdkFetch.includes("export async function createWithdraw")) {
  fail("sdk wallet must export createWithdraw");
}
if (!sdkFetch.includes("export async function createKrwDepositRequest")) {
  fail("sdk wallet must export createKrwDepositRequest");
}
if (!sdkIndex.includes("fetchWalletBuckets")) {
  fail("packages/sdk/src/index.ts must re-export fetchWalletBuckets");
}
if (
  sdkFetch.includes("my-deposit-address") ||
  sdkIndex.includes("my-deposit-address")
) {
  fail("sdk must not silently gain deposit-address without contract update");
}

const stages = read("services/api-nest/src/wallet/chain-watcher.stages.ts");
if (!/USDT_UI_CONFIRMATIONS\s*=\s*1/.test(stages)) {
  fail("USDT_UI_CONFIRMATIONS must be 1");
}
if (!/USDT_LEDGER_CONFIRMATIONS\s*=\s*19/.test(stages)) {
  fail("USDT_LEDGER_CONFIRMATIONS must be 19");
}

const buckets = read("services/api-nest/src/ledger/ledger.buckets.service.ts");
if (!buckets.includes("liabilityUsdt")) {
  fail("LedgerBucketsService must expose liabilityUsdt");
}

const withdraw = read("services/api-nest/src/wallet/withdraw-intent.service.ts");
if (!withdraw.includes('input.mode ?? "profit"')) {
  fail("WithdrawIntentService must default mode to profit");
}

const kyc = read("services/api-nest/src/compliance/kyc-gate.ts");
if (!kyc.includes("participateGate") || !kyc.includes("kycRequired: false")) {
  fail("kyc-gate must keep participate KYC-free");
}
if (!kyc.includes("assertWithdrawKyc")) {
  fail("kyc-gate must keep withdraw KYC");
}

const routes = read("services/api-nest/src/wallet/wallet.routes.ts");
for (const token of [
  "myDepositAddress",
  "krwDepositRequests",
  "buckets",
  "withdraw",
]) {
  if (!routes.includes(token)) fail(`WALLET_USER_ROUTES must include ${token}`);
}

const pkg = readJson("package.json");
if (
  pkg &&
  pkg.scripts?.["verify:wallet-contract"] !==
    "node tooling/verify/wallet-contract.cjs"
) {
  fail("package.json missing verify:wallet-contract");
}

const catalog = read("tooling/verify/CATALOG.md");
if (catalog && !catalog.includes("wallet-contract")) {
  fail("CATALOG.md must list wallet-contract");
}

if (fails.length) {
  console.error("[verify:wallet-contract] FAIL\n- " + fails.join("\n- "));
  process.exit(1);
}

console.log(
  "[verify:wallet-contract] PASS (4 rails · web PendingFigma=8 · backend KEEP · Spark Dash constraint-only)",
);
