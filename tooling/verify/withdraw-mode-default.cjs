/**
 * verify:withdraw-mode-default — Money §49.1 · E2
 * Default withdraw mode must be profit · never open as principal by default.
 */
const fs = require("fs");
const path = require("path");

const root = path.resolve(__dirname, "../..");
const fails = [];

function mustExist(rel) {
  if (!fs.existsSync(path.join(root, rel))) fails.push(`missing: ${rel}`);
}

function read(rel) {
  return fs.readFileSync(path.join(root, rel), "utf8");
}

const files = [
  "packages/ui/copy/ko/principal-profit.ts",
  "packages/ui/components/wallet/WithdrawModeCards.tsx",
  "packages/ui/canon/surfaces/withdraw-mode.wire.json",
  "apps/web/app/wallet/withdraw/page.tsx",
  "apps/web/app/wallet/withdraw/usdt/page.tsx",
  "apps/web/app/wallet/withdraw/krw/page.tsx",
  "apps/web/app/wallet/page.tsx",
  "services/api-nest/src/wallet/wallet.controller.ts",
  "schemas/withdraw-intent.v1.json",
];
for (const f of files) mustExist(f);

const wire = JSON.parse(
  read("packages/ui/canon/surfaces/withdraw-mode.wire.json"),
);
if (wire.defaultMode !== "profit") {
  fails.push("withdraw-mode.wire defaultMode must be profit");
}
if ((wire.forbidden || []).includes("default_mode_principal") === false) {
  fails.push("withdraw-mode.wire forbidden must include default_mode_principal");
}

const cards = read("packages/ui/components/wallet/WithdrawModeCards.tsx");
if (!cards.includes('data-default-mode="profit"')) {
  fails.push("WithdrawModeCards must declare data-default-mode=profit");
}
if (!cards.includes('data-mode="profit"')) {
  fails.push("WithdrawModeCards must expose profit mode control");
}

const withdrawPages = [
  "apps/web/app/wallet/withdraw/page.tsx",
  "apps/web/app/wallet/withdraw/usdt/page.tsx",
  "apps/web/app/wallet/withdraw/krw/page.tsx",
];
for (const rel of withdrawPages) {
  const t = read(rel);
  if (!t.includes('data-withdraw-default-mode="profit"')) {
    fails.push(`${rel} must set data-withdraw-default-mode=profit`);
  }
  if (!t.includes('return "profit"') && !t.includes("return 'profit'")) {
    fails.push(`${rel} must default unresolved mode to profit`);
  }
  // Must not hard-default UI to principal
  if (/defaultMode\s*=\s*["']principal["']/.test(t)) {
    fails.push(`${rel} must not default mode to principal`);
  }
  if (/data-withdraw-default-mode=["']principal["']/.test(t)) {
    fails.push(`${rel} data-withdraw-default-mode must not be principal`);
  }
}

const walletHome = read("apps/web/app/wallet/page.tsx");
if (!walletHome.includes("/wallet/withdraw?mode=profit")) {
  fails.push("wallet home primary withdraw link must be ?mode=profit");
}

const controller = read("services/api-nest/src/wallet/wallet.controller.ts");
if (!controller.includes('?? "profit"') && !controller.includes("?? 'profit'")) {
  fails.push("WalletController createWithdraw must default mode to profit");
}

const intentSvc = read("services/api-nest/src/wallet/withdraw-intent.service.ts");
if (!intentSvc.includes('input.mode ?? "profit"') && !intentSvc.includes("input.mode ?? 'profit'")) {
  fails.push("WithdrawIntentService must default mode to profit");
}

const schema = JSON.parse(read("schemas/withdraw-intent.v1.json"));
const desc = String(schema.description || "");
if (!/default mode=profit/i.test(desc) && !/mode=profit/i.test(desc)) {
  fails.push("withdraw-intent.v1 description must lock default mode=profit");
}
if (!schema.properties?.mode?.enum?.includes("profit")) {
  fails.push("withdraw-intent.v1 mode enum must include profit");
}

const copy = read("packages/ui/copy/ko/principal-profit.ts");
if (!copy.includes("수익만") || !copy.includes("modeProfitHint")) {
  fails.push("principal-profit copy must describe profit-default withdraw");
}

if (fails.length) {
  console.error("[verify:withdraw-mode-default] FAIL");
  for (const f of fails) console.error(" -", f);
  process.exit(1);
}
console.log(
  "[verify:withdraw-mode-default] PASS (default mode=profit · E2 locked)",
);
