#!/usr/bin/env node
/**
 * verify:wallet-release — B-WALLET-003 Wallet certification
 * money/security 인프로세스 E2E · known defect 0
 * Money Rule 재정의 0 · 레거시 Canon 복구 0 · Home freeze 0 · 시각 lock 0
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

function walk(dir, acc = []) {
  if (!fs.existsSync(dir)) return acc;
  for (const ent of fs.readdirSync(dir, { withFileTypes: true })) {
    if (
      ent.name === "node_modules" ||
      ent.name === ".next" ||
      ent.name === "dist" ||
      ent.name === "coverage"
    ) {
      continue;
    }
    const p = path.join(dir, ent.name);
    if (ent.isDirectory()) walk(p, acc);
    else if (/\.(ts|tsx|js|mjs|cjs)$/.test(ent.name)) acc.push(p);
  }
  return acc;
}

const CONTRACT = "docs/product/consumer/CONSUMER_WALLET_CONTRACT.md";
const GOV = "governance/consumer-wallet/wallet.v1.json";
const RELEASE = "governance/consumer-wallet/wallet-release.v1.json";

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
  CONTRACT,
  GOV,
  RELEASE,
  "tooling/verify/lib/wallet-release-runtime.cjs",
  ...WALLET_PAGES,
  "packages/sdk/src/wallet/fetch.ts",
  "services/api-nest/src/wallet/usdt-deposit.service.ts",
  "services/api-nest/src/wallet/chain-watcher.stages.ts",
  "services/api-nest/src/wallet/krw-deposit.apply.ts",
  "services/api-nest/src/wallet/withdraw-intent.service.ts",
  "services/api-nest/src/wallet/withdraw-apply-block.ts",
  "services/api-nest/src/compliance/kyc-gate.ts",
  "services/api-nest/src/ledger/ledger.buckets.service.ts",
  "services/api-nest/src/wallet/wallet.controller.ts",
];
for (const f of required) {
  if (!fs.existsSync(path.join(root, f))) fail(`missing: ${f}`);
}

const prereqs = [
  "wallet-contract.cjs",
  "wallet-gap-wire.cjs",
  "bucket-invariant.cjs",
  "deposit-confirm-stages.cjs",
  "wallet-kyc-session-auth.cjs",
  "webauthn-fallback-pointer.cjs",
];
for (const script of prereqs) {
  if (!fs.existsSync(path.join(__dirname, script))) {
    fail(`missing prereq verifier: ${script}`);
  }
}

const surfacePointers = [
  "wallet-live-wire.cjs",
  "withdraw-flow-wire.cjs",
  "withdraw-mode-default.cjs",
  "kyc-withdraw-only.cjs",
  "deposit-network-plain-ko.cjs",
  "practice-non-withdrawable.cjs",
  "pg-module-scan.cjs",
];
for (const script of surfacePointers) {
  if (!fs.existsSync(path.join(__dirname, script))) {
    fail(`missing surface/money pointer verifier: ${script}`);
  }
}

const md = read(CONTRACT);
for (const token of [
  "WALLET_CERTIFICATION = PASS",
  "verify:wallet-release",
  "B-WALLET-003",
  "MONEY_RULE_REDEFINITION = FORBIDDEN",
  "PG_GATEWAY = FORBIDDEN",
  "MISSING_AS_ZERO = FORBIDDEN",
  "ONE_CONF_EQUALS_CREDITED = FORBIDDEN",
  "DEFAULT_WITHDRAW_MODE = profit",
  "KYC_ON_WITHDRAW",
]) {
  if (md && !md.includes(token)) fail(`${CONTRACT} must contain: ${token}`);
}
if (md.includes("WALLET_CERTIFICATION = PENDING")) {
  fail("WALLET_CERTIFICATION must be PASS after B-WALLET-003");
}

const gov = readJson(GOV);
if (gov) {
  if (gov.certification?.status !== "RELEASE_PASS") {
    fail("wallet.v1 certification.status must be RELEASE_PASS");
  }
  if (gov.certification?.task !== "B-WALLET-003") {
    fail("wallet.v1 certification.task must be B-WALLET-003");
  }
  if ((gov.nextSlices || []).includes("B-WALLET-003")) {
    fail("nextSlices must drop B-WALLET-003 after certification");
  }
  if (gov.authority.MONEY_RULE_REDEFINITION !== "FORBIDDEN") {
    fail("MONEY_RULE_REDEFINITION must stay FORBIDDEN");
  }
  if (gov.authority.PG_GATEWAY !== "FORBIDDEN") {
    fail("PG_GATEWAY must stay FORBIDDEN");
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
  if (gov.authority.NEW_VISUAL_LOCK !== false) {
    fail("NEW_VISUAL_LOCK must stay false");
  }
}

const release = readJson(RELEASE);
if (release) {
  if (release.status !== "RELEASE_PASS") fail("release status must be RELEASE_PASS");
  if (!Array.isArray(release.knownDefects) || release.knownDefects.length !== 0) {
    fail("knownDefects must be []");
  }
  const wantRails = [
    "usdt-deposit",
    "krw-deposit",
    "usdt-withdraw",
    "krw-withdraw",
  ];
  for (const rail of wantRails) {
    if (!(release.e2e?.rails || []).includes(rail)) {
      fail(`release e2e.rails missing ${rail}`);
    }
  }
  for (const proof of [
    "USDT_1CONF_NO_LEDGER",
    "USDT_19CONF_CREDIT_ONCE",
    "DEFAULT_WITHDRAW_MODE_PROFIT",
    "KYC_WITHDRAW_ONLY",
    "SESSION_JOURNAL_ISOLATION",
  ]) {
    const money = release.e2e?.money || [];
    const security = release.e2e?.security || [];
    if (!money.includes(proof) && !security.includes(proof)) {
      fail(`release e2e missing proof ${proof}`);
    }
  }
}

const usdt = read("services/api-nest/src/wallet/usdt-deposit.service.ts");
const stages = read("services/api-nest/src/wallet/chain-watcher.stages.ts");
const krwApply = read("services/api-nest/src/wallet/krw-deposit.apply.ts");
const withdraw = read("services/api-nest/src/wallet/withdraw-intent.service.ts");
const kyc = read("services/api-nest/src/compliance/kyc-gate.ts");
const buckets = read("services/api-nest/src/ledger/ledger.buckets.service.ts");
const walletCtl = read("services/api-nest/src/wallet/wallet.controller.ts");
const sdkFetch = read("packages/sdk/src/wallet/fetch.ts");

for (const needle of [
  'journalType: "deposit_usdt"',
  "creditLedger: false",
  "usdt_deposit_confirm:",
  'bucket: "principal"',
]) {
  if (usdt && !usdt.includes(needle)) {
    fail(`usdt-deposit.service missing: ${needle}`);
  }
}
if (!/USDT_UI_CONFIRMATIONS\s*=\s*1/.test(stages)) {
  fail("USDT_UI_CONFIRMATIONS must stay 1");
}
if (!/USDT_LEDGER_CONFIRMATIONS\s*=\s*19/.test(stages)) {
  fail("USDT_LEDGER_CONFIRMATIONS must stay 19");
}

for (const needle of [
  'journalType: "deposit_krw"',
  "krw_deposit_approve:",
  'locked.status !== "pending" && locked.status !== "matched"',
  "if (!input.adminId)",
]) {
  if (krwApply && !krwApply.includes(needle)) {
    fail(`krw-deposit.apply missing: ${needle}`);
  }
}

for (const needle of [
  'input.mode ?? "profit"',
  "PRACTICE_NOT_WITHDRAWABLE",
  "assertBeforeWithdraw",
  "WITHDRAW_STEP_UP_REQUIRED",
  "PRINCIPAL_CONFIRM_REQUIRED",
  "idempotencyKey",
]) {
  if (withdraw && !withdraw.includes(needle)) {
    fail(`withdraw-intent.service missing: ${needle}`);
  }
}
if (/UPDATE\s+public\.wallet_buckets/i.test(withdraw + usdt + krwApply)) {
  fail("wallet owners must not UPDATE wallet_buckets columns");
}

if (!kyc.includes("participateGate") || !kyc.includes("kycRequired: false")) {
  fail("kyc-gate must keep participate/deposit KYC-free");
}
if (!kyc.includes("assertWithdrawKyc")) {
  fail("kyc-gate must keep withdraw KYC");
}

if (!buckets.includes("liabilityUsdt") || !buckets.includes("bucket-invariant FAIL")) {
  fail("LedgerBucketsService must keep liability invariant");
}

if (walletCtl.includes('@Query("userId")')) {
  fail("wallet user routes must not accept query userId");
}
if (!walletCtl.includes("this.sessionUserId(req)")) {
  fail("wallet user routes must use sessionUserId");
}

if (sdkFetch.includes('? v : "0"')) {
  fail("sdk wallet must not coerce missing money to 0");
}
if (!sdkFetch.includes('mode: input.mode ?? "profit"')) {
  fail("sdk createWithdraw must default mode to profit");
}

let pending = 0;
for (const rel of WALLET_PAGES) {
  const src = read(rel);
  if (src.includes("PendingFigma")) pending += 1;
  if (/HomeDesktop|HomeMobile|spark-dash-home/.test(src)) {
    fail(`${rel} must not copy Home geometry`);
  }
  if (src.includes("12.50") || /Math\.random/.test(src)) {
    fail(`${rel} must not invent money or RNG`);
  }
  if (/toss|stripe|iamport|portone|nicepay|paypal/i.test(src)) {
    fail(`${rel} must not reference a PG사`);
  }
}
if (pending !== 8) {
  fail(`web PendingFigma wallet pages must stay 8, got ${pending}`);
}

const pgDeny =
  /@tosspayments|tosspayments|portone|iamport|inicis|nicepay|paypal|@stripe\/stripe-js|stripe-checkout/i;
for (const rel of [
  "services/api-nest/src/wallet",
  "packages/sdk/src/wallet",
  "apps/web/app/wallet",
]) {
  for (const fp of walk(path.join(root, rel))) {
    const src = fs.readFileSync(fp, "utf8");
    if (pgDeny.test(src)) {
      fail(`PG사 reference in ${path.relative(root, fp)}`);
    }
  }
}

if (process.env.WALLET_RELEASE_NESTED !== "1") {
  for (const script of prereqs) {
    const r = spawnSync(process.execPath, [path.join(__dirname, script)], {
      cwd: root,
      encoding: "utf8",
    });
    process.stdout.write(r.stdout || "");
    process.stderr.write(r.stderr || "");
    if (r.status !== 0) fail(`prereq ${script} failed`);
  }
}

const runtime = require("./lib/wallet-release-runtime.cjs");
const ran = runtime.runAll();
for (const msg of ran.fails) fail(msg);

const pkg = readJson("package.json");
if (
  pkg &&
  pkg.scripts?.["verify:wallet-release"] !==
    "node tooling/verify/wallet-release.cjs"
) {
  fail("package.json missing verify:wallet-release");
}
const catalog = read("tooling/verify/CATALOG.md");
if (catalog && !catalog.includes("wallet-release")) {
  fail("CATALOG.md must list wallet-release");
}

if (fails.length) {
  console.error("[verify:wallet-release] FAIL\n- " + fails.join("\n- "));
  process.exit(1);
}

console.log(
  "[verify:wallet-release] PASS (4 rails money/security in-process E2E · known defect 0 · Money KEEP)",
);
