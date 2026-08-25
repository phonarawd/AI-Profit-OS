"use strict";

const fs = require("node:fs");
const path = require("node:path");

const root = path.resolve(__dirname, "../..");
const failures = [];

function read(rel) {
  const full = path.join(root, rel);
  if (!fs.existsSync(full)) {
    failures.push(`missing:${rel}`);
    return "";
  }
  return fs.readFileSync(full, "utf8");
}

const controller = read(
  "services/api-nest/src/wallet/deposit-config.user.controller.ts",
);
const routes = read("services/api-nest/src/wallet/wallet.routes.ts");
const moduleSource = read("services/api-nest/src/wallet/wallet.module.ts");
const web = read("apps/web/app/wallet/deposit/DepositClient.tsx");
const e2e = read("tooling/e2e/specs/krw-deposit-closure.spec.cjs");

for (const needle of [
  "requirePersisted()",
  "KRW_DEPOSIT_ACCOUNT_NOT_READY",
  "bankName",
  "accountNumber",
  "accountHolder",
  "noticeKo",
]) {
  if (!controller.includes(needle)) {
    failures.push(`controller missing:${needle}`);
  }
}

for (const forbidden of [
  "hotWalletXpubRef",
  "treasuryHotAddressRef",
  "tronGridApiKey",
  "usdtOnchain",
  "withdrawGuards",
  "pricingGuards",
  "updatedByAdminId",
]) {
  if (controller.includes(forbidden)) {
    failures.push(`public controller exposes/references forbidden field:${forbidden}`);
  }
}

if (!routes.includes('krwDepositInstructions: "krw-deposit-instructions"')) {
  failures.push("wallet route missing krw-deposit-instructions");
}
if (!moduleSource.includes("DepositConfigUserController")) {
  failures.push("wallet module missing DepositConfigUserController");
}
for (const needle of [
  "/api/v1/wallet/krw-deposit-instructions",
  'data-krw-instructions-state={tab === "krw" ? krwInstructionsState : undefined}',
  'data-testid="krw-deposit-instructions"',
  'data-testid="krw-account-number"',
  'data-testid="krw-account-copy"',
  'krwInstructionsState !== "ready"',
]) {
  if (!web.includes(needle)) failures.push(`web wiring missing:${needle}`);
}

for (const fakeProductionAccount of ["QA테스트은행", "000-000-000000", "퍼뜩 QA"]) {
  if (web.includes(fakeProductionAccount)) {
    failures.push(`test fixture leaked into production web:${fakeProductionAccount}`);
  }
}

for (const needle of [
  "KRW shows persisted account instructions before allowing a request",
  "KRW account not persisted fails closed and cannot be submitted",
  "data-krw-instructions-state",
  "not_ready",
  "toBeDisabled()",
  "scrollWidth",
  "blockingViolations",
]) {
  if (!e2e.includes(needle)) failures.push(`e2e coverage missing:${needle}`);
}

if (failures.length) {
  console.error("[krw-deposit-instructions-contract] FAIL");
  for (const failure of failures) console.error(` - ${failure}`);
  process.exit(1);
}

console.log(
  "[krw-deposit-instructions-contract] PASS (persisted-only · public allowlist · no fake account · fail-closed UI/E2E wiring)",
);
