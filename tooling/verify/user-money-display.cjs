/**
 * verify:user-money-display
 * 유저 read API = KRW 주력 · USDT 보조. 장부/참여 SoT는 USDT.
 * missing FX → null. "0" 위조 금지.
 */
"use strict";

const fs = require("fs");
const path = require("path");

const root = path.resolve(__dirname, "../..");
const fails = [];

function read(rel) {
  const p = path.join(root, rel);
  if (!fs.existsSync(p)) {
    fails.push("missing: " + rel);
    return "";
  }
  return fs.readFileSync(p, "utf8");
}

function mustExist(rel) {
  if (!fs.existsSync(path.join(root, rel))) fails.push("missing: " + rel);
}

const files = [
  "services/api-nest/src/money-display/user-money-display.ts",
  "services/api-nest/src/money-display/krw-display.service.ts",
  "services/api-nest/src/money-display/money-display.module.ts",
  "services/api-nest/src/ledger/trial-state.service.ts",
  "services/api-nest/src/wallet/wallet.controller.ts",
  "services/api-nest/src/wallet/home-money-read.service.ts",
  "services/api-nest/src/opportunities/opportunities.user.service.ts",
  "services/api-nest/src/opportunities/current-fx-approx.service.ts",
  "schemas/current-fx-approx.v1.json",
  "schemas/home-money-read.v1.json",
  "schemas/wallet-buckets.v1.json",
];
for (const f of files) mustExist(f);

const display = read("services/api-nest/src/money-display/user-money-display.ts");
if (!display.includes('USER_MONEY_DISPLAY_PRIMARY = "KRW"')) {
  fails.push("displayPrimary must lock KRW");
}
if (!display.includes('USER_MONEY_DISPLAY_SECONDARY = "USDT"')) {
  fails.push("displaySecondary must lock USDT");
}

const krw = read("services/api-nest/src/money-display/krw-display.service.ts");
if (!krw.includes("approxKrwOrNull") || !krw.includes("approxKrwFromSnapshot")) {
  fails.push("KrwDisplayService must reuse REL-508 approx (no client FX math)");
}
if (krw.includes('return "0"')) {
  fails.push("KrwDisplayService must not fabricate 0 KRW");
}

const trial = read("services/api-nest/src/ledger/trial-state.service.ts");
if (!trial.includes("displayPrimary") || !trial.includes("trialPrincipalKrwApprox")) {
  fails.push("trial-state must expose KRW primary + trialPrincipalKrwApprox");
}
if (!trial.includes("userMoneyDisplay")) {
  fails.push("trial-state must use userMoneyDisplay()");
}

const wallet = read("services/api-nest/src/wallet/wallet.controller.ts");
if (!wallet.includes("krwDisplay.buckets")) {
  fails.push("wallet GET buckets must attach KRW display envelope");
}
if (!wallet.includes("principalUsdt: full.principalUsdt")) {
  fails.push("wallet GET must keep principalUsdt SoT for participate");
}

const home = read("services/api-nest/src/wallet/home-money-read.service.ts");
if (!home.includes("principalKrwApprox") || !home.includes("userMoneyDisplay")) {
  fails.push("home-money-read must attach KRW display");
}
if (!home.includes('dto.state === "recoverable_error"')) {
  fails.push("home-money-read must not invent KRW when state=recoverable_error");
}

const feed = read(
  "services/api-nest/src/opportunities/opportunities.user.service.ts",
);
if (!feed.includes("displayEnvelope") || !feed.includes("requiredCapitalKrwApprox")) {
  fails.push("opportunity feed/detail must expose KRW display + requiredCapitalKrwApprox");
}

const participate = read(
  "services/api-nest/src/opportunities/participate.service.ts",
);
if (participate.includes("displayPrimary") || participate.includes("requiredCapitalKrwApprox")) {
  fails.push("participate must stay USDT SoT (no display rewrite)");
}

const fx = read("services/api-nest/src/opportunities/current-fx-approx.service.ts");
if (!fx.includes("userMoneyDisplay") || !fx.includes("displayPrimary")) {
  fails.push("current-fx/approx must declare KRW primary");
}

const schemaFx = read("schemas/current-fx-approx.v1.json");
if (!schemaFx.includes('"const": "KRW"') || !schemaFx.includes("displayPrimary")) {
  fails.push("current-fx-approx schema must lock displayPrimary=KRW");
}

const schemaHome = read("schemas/home-money-read.v1.json");
if (!schemaHome.includes("principalKrwApprox") || !schemaHome.includes('"const": "KRW"')) {
  fails.push("home-money-read schema must allow KRW display fields");
}

const schemaWallet = read("schemas/wallet-buckets.v1.json");
if (!schemaWallet.includes("principalKrwApprox") || !schemaWallet.includes("displayPrimary")) {
  fails.push("wallet-buckets schema must allow KRW display fields");
}

const ledger = read("services/api-nest/src/ledger/ledger.module.ts");
if (!ledger.includes("MoneyDisplayModule")) {
  fails.push("LedgerModule must import MoneyDisplayModule");
}

const pkg = read("package.json");
if (!pkg.includes('"verify:user-money-display"')) {
  fails.push("package.json missing verify:user-money-display");
}
const catalog = read("tooling/verify/CATALOG.md");
if (!catalog.includes("user-money-display")) {
  fails.push("CATALOG.md must list user-money-display");
}
const domain = read("tooling/verify/domain-by-path.cjs");
if (!domain.includes("user-money-display.cjs")) {
  fails.push("domain-by-path must trigger user-money-display");
}

if (fails.length) {
  console.error("[verify:user-money-display] FAIL\n- " + fails.join("\n- "));
  process.exit(1);
}
console.log(
  "[verify:user-money-display] PASS — KRW primary · USDT secondary · ledger SoT unchanged",
);
