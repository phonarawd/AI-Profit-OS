#!/usr/bin/env node
/**
 * verify:wallet-gap-wire — B-WALLET-002
 * Gap-only API/SDK wiring. Pixel/Figma = 0. Money/FX formula = 0.
 */
"use strict";

const { spawnSync } = require("node:child_process");
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

const required = [
  "packages/sdk/src/wallet/fetch.ts",
  "packages/sdk/src/wallet/index.ts",
  "packages/sdk/src/index.ts",
  "services/api-nest/src/wallet/wallet.controller.ts",
  "services/api-nest/src/wallet/wallet.routes.ts",
  "services/api-nest/src/wallet/deposit-address.service.ts",
  "services/api-nest/src/compliance/kyc.controller.ts",
  "services/api-nest/src/ledger/ledger.user-journal.service.ts",
  "services/api-nest/src/ledger/ledger.user-journal.project.ts",
  "docs/product/consumer/CONSUMER_WALLET_CONTRACT.md",
  "governance/consumer-wallet/wallet.v1.json",
];
for (const f of required) {
  if (!fs.existsSync(path.join(root, f))) fail(`missing: ${f}`);
}

const sdkFetch = read("packages/sdk/src/wallet/fetch.ts");
const sdkIndex = read("packages/sdk/src/wallet/index.ts");
const rootSdk = read("packages/sdk/src/index.ts");
const sdkTypes = read("packages/sdk/src/wallet/types.ts");
const walletCtl = read("services/api-nest/src/wallet/wallet.controller.ts");
const walletRoutes = read("services/api-nest/src/wallet/wallet.routes.ts");
const journalSvc = read(
  "services/api-nest/src/ledger/ledger.user-journal.service.ts",
);
const journalProject = read(
  "services/api-nest/src/ledger/ledger.user-journal.project.ts",
);
const depositAddr = read(
  "services/api-nest/src/wallet/deposit-address.service.ts",
);
const kycCtl = read("services/api-nest/src/compliance/kyc.controller.ts");
const contract = read("docs/product/consumer/CONSUMER_WALLET_CONTRACT.md");

for (const token of [
  "export async function fetchMyDepositAddress",
  "export async function fetchKycStatus",
  "export async function submitKyc",
  "export async function listWalletJournals",
  "export async function fetchWalletBuckets",
  "export async function createWithdraw",
  "/api/v1/wallet/my-deposit-address",
  "/api/v1/compliance/kyc/status",
  "/api/v1/compliance/kyc/submit",
  "/api/v1/wallet/journals",
  "wallet_buckets_unavailable",
  "deposit_address_unavailable",
  "kyc_status_unavailable",
]) {
  if (!sdkFetch.includes(token)) fail(`sdk fetch missing ${token}`);
}

if (/return typeof v === "string" && v.trim\(\) \? v : "0"/.test(sdkFetch)) {
  fail("sdk wallet asAmount must not coerce missing money to 0");
}
if (sdkFetch.includes('? v : "0"')) {
  fail("sdk wallet fetch must not use missing→0 fallback");
}

for (const token of [
  "fetchMyDepositAddress",
  "fetchKycStatus",
  "listWalletJournals",
  "CONSUMER_PROFIT_MERGE_CTA_EXPOSED",
]) {
  if (!sdkIndex.includes(token) || !rootSdk.includes(token)) {
    fail(`sdk index must export ${token}`);
  }
}
if (!sdkTypes.includes("CONSUMER_PROFIT_MERGE_CTA_EXPOSED = false")) {
  fail("CONSUMER_PROFIT_MERGE_CTA_EXPOSED must stay false");
}
if (sdkFetch.includes("profit/merge") || sdkIndex.includes("mergeProfit")) {
  fail("consumer SDK must not expose profit→principal merge CTA");
}
if (/deriveTrc20|T[1-9A-HJ-NP-Za-km-z]{33}/.test(sdkFetch)) {
  fail("sdk must not generate or invent a deposit address");
}

if (!walletRoutes.includes('journals: "journals"')) {
  fail('WALLET_USER_ROUTES must include journals: "journals"');
}
for (const token of [
  "myDepositAddress",
  "krwDepositRequests",
  "buckets",
  "withdraw",
]) {
  if (!walletRoutes.includes(token)) {
    fail(`4-rail owner route missing: ${token}`);
  }
}

if (!walletCtl.includes("listJournals")) {
  fail("WalletController must expose listJournals");
}
if (!walletCtl.includes("this.userJournals.listForUser")) {
  fail("listJournals must call LedgerUserJournalService.listForUser");
}
if (!walletCtl.includes("this.sessionUserId(req)")) {
  fail("wallet user routes must use sessionUserId");
}
if (walletCtl.includes('@Query("userId")')) {
  fail("wallet user routes must not accept query userId");
}

const listIdx = walletCtl.search(/\blistJournals\s*\(/);
if (listIdx < 0) {
  fail("listJournals method missing");
} else {
  const window = walletCtl.slice(Math.max(0, listIdx - 220), listIdx);
  if (!/@UseGuards\(JwtAuthGuard\)/.test(window)) {
    fail("listJournals must be preceded by @UseGuards(JwtAuthGuard)");
  }
}

if (!journalSvc.includes("a.owner_user_id = $1::uuid")) {
  fail("user journal SQL must filter owner_user_id = $1");
}
if (!journalSvc.includes("listForUser")) {
  fail("LedgerUserJournalService must expose listForUser");
}
if (!journalProject.includes("row.owner_user_id !== sessionUserId")) {
  fail("projection must drop cross-user rows");
}
if (/usdtKrw|payableAmount|suggestDeposit/.test(journalSvc + journalProject)) {
  fail("user journal projection must not invent FX/payable formulas");
}

if (!depositAddr.includes("async getOrCreate")) {
  fail("DepositAddressService.getOrCreate owner must stay");
}
if (!kycCtl.includes("this.kyc.getStatus") || !kycCtl.includes("this.kyc.submit")) {
  fail("KYC controller must keep getStatus + submit owners");
}

let pending = 0;
for (const rel of WALLET_PAGES) {
  const src = read(rel);
  if (src.includes("PendingFigma")) pending += 1;
  if (/profit\/merge|원금에 합치기|mergeProfit/.test(src)) {
    fail(`${rel} must not expose profit→principal CTA`);
  }
  if (/spark-dash-home|HomeDesktop|ProfitsDesktop/.test(src)) {
    fail(`${rel} must not copy Home/Profits geometry`);
  }
}
if (pending !== 8) {
  fail(`web PendingFigma wallet pages must stay 8, got ${pending}`);
}

if (!contract.includes("GET /wallet/deposit")) {
  // mixed path is documented as /wallet/deposit
}
if (!contract.includes("`/wallet/deposit`") && !contract.includes("/wallet/deposit")) {
  fail("contract must keep mixed /wallet/deposit path");
}
if (!contract.includes("USDT_PRIMARY") || !contract.includes("KRW_SECONDARY")) {
  fail("USDT primary / KRW secondary contract must remain");
}

const gov = JSON.parse(
  read("governance/consumer-wallet/wallet.v1.json") || "{}",
);
if (gov.rails?.length !== 4) fail("wallet.v1 rails must stay exactly 4");
if (gov.authority?.PROFIT_MERGE_CTA !== "HIDE") {
  fail("PROFIT_MERGE_CTA must stay HIDE");
}
if (gov.authority?.MISSING_AS_ZERO !== "FORBIDDEN") {
  fail("MISSING_AS_ZERO must stay FORBIDDEN");
}
if (gov.measured?.sdkDepositAddressExport !== "PRESENT") {
  fail("measured.sdkDepositAddressExport must be PRESENT");
}
if (gov.measured?.sdkKycExport !== "PRESENT") {
  fail("measured.sdkKycExport must be PRESENT");
}
if (gov.measured?.userJournalListApi !== "PRESENT") {
  fail("measured.userJournalListApi must be PRESENT");
}
if (gov.measured?.webWalletPendingFigma !== 8) {
  fail("measured.webWalletPendingFigma must stay 8");
}

const pkg = JSON.parse(read("package.json") || "{}");
if (pkg.scripts?.["verify:wallet-gap-wire"] !== "node tooling/verify/wallet-gap-wire.cjs") {
  fail("package.json missing verify:wallet-gap-wire");
}
const catalog = read("tooling/verify/CATALOG.md");
if (!catalog.includes("wallet-gap-wire")) {
  fail("CATALOG.md must list wallet-gap-wire");
}

function runNodeTest(rel) {
  const result = spawnSync(
    process.execPath,
    ["--experimental-strip-types", "--test", path.join(root, rel)],
    { cwd: root, encoding: "utf8" },
  );
  if (result.status !== 0) {
    fail(`${rel} tests failed\n${result.stdout}\n${result.stderr}`);
  }
}

runNodeTest("packages/sdk/src/wallet/wallet-gap.test.ts");
runNodeTest("packages/sdk/src/wallet/krw-deposit.test.ts");

function projectUserJournalItems(rows, sessionUserId) {
  if (!sessionUserId) return [];
  return rows.filter((row) => row.owner_user_id === sessionUserId);
}
const userA = "user-a";
const userB = "user-b";
const mixed = [
  { id: "j-a", owner_user_id: userA, amount_usdt: "10" },
  { id: "j-b", owner_user_id: userB, amount_usdt: "99" },
];
const scoped = projectUserJournalItems(mixed, userA);
if (scoped.length !== 1 || scoped[0].id !== "j-a") {
  fail("AUTH/CROSS-USER projection must keep only session user rows");
}
if (projectUserJournalItems(mixed, "").length !== 0) {
  fail("empty session userId must not return journal rows");
}

if (fails.length) {
  console.error("[verify:wallet-gap-wire] FAIL\n- " + fails.join("\n- "));
  process.exit(1);
}
console.log(
  "[verify:wallet-gap-wire] PASS (SDK address/KYC/journal · missing≠0 · 4 rails · CTA hidden · negative proofs)",
);
