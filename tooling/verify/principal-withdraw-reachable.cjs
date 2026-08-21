/**
 * verify:principal-withdraw-reachable — Money §49.1 · E3
 * Principal withdraw CTA must exist and must not be hidden/removed.
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
  "packages/ui/components/wallet/PrincipalConfirmSheet.tsx",
  "packages/ui/components/wallet/WithdrawModeCards.tsx",
  "packages/ui/components/wallet/SuccessBucketCtas.tsx",
  "packages/ui/components/wallet/BucketBreakdown.tsx",
  "packages/ui/canon/surfaces/wallet-home.wire.json",
  "packages/ui/canon/surfaces/withdraw-mode.wire.json",
  "packages/ui/canon/surfaces/execution-success.wire.json",
  "apps/web/app/wallet/page.tsx",
  "apps/web/app/wallet/withdraw/page.tsx",
  "apps/web/app/me/guide/principal/page.tsx",
  "apps/web/app/trades/[id]/execute/page.tsx",
  "apps/admin/app/admin/users/[id]/finance/page.tsx",
  "services/api-nest/src/wallet/wallet.routes.ts",
  "services/api-nest/src/wallet/profit-merge.service.ts",
  "services/api-nest/src/ledger/ledger.routes.ts",
];
for (const f of files) mustExist(f);

const copy = read("packages/ui/copy/ko/principal-profit.ts");
for (const key of [
  "workingPrincipal",
  "withdrawableProfit",
  "ctaProfitOnly",
  "ctaStillPrincipal",
  "ctaMerge",
  "ctaLater",
  "principalAlways",
  "ctaOpenPrincipal",
]) {
  if (!copy.includes(key)) fails.push(`principal-profit copy missing key: ${key}`);
}
for (const banned of ["몰수", "원금잠금영구", "영구 잠금"]) {
  if (copy.includes(banned)) fails.push(`forbidden copy present: ${banned}`);
}

const sheet = read("packages/ui/components/wallet/PrincipalConfirmSheet.tsx");
for (const needle of [
  "data-testid=\"principal-confirm-sheet\"",
  "cta-still-principal",
  "data-principal-reachable",
  "T.withdrawMode.ctaStillPrincipal",
  "onConfirmPrincipal",
]) {
  if (!sheet.includes(needle)) {
    fails.push(`PrincipalConfirmSheet missing: ${needle}`);
  }
}
if (/display:\s*none|visibility:\s*hidden|hidden\s*&&\s*false/.test(sheet) &&
    sheet.includes("cta-still-principal") &&
    /cta-still-principal[\s\S]{0,80}hidden/.test(sheet)) {
  fails.push("PrincipalConfirmSheet must not hide still-principal CTA");
}

const cards = read("packages/ui/components/wallet/WithdrawModeCards.tsx");
if (!cards.includes('data-mode="principal"')) {
  fails.push("WithdrawModeCards must expose principal mode");
}
if (!cards.includes('data-principal-reachable="true"')) {
  fails.push("WithdrawModeCards principal card must be marked reachable");
}

const success = read("packages/ui/components/wallet/SuccessBucketCtas.tsx");
for (const needle of [
  'data-cta-count="3"',
  "cta-success-profit",
  "cta-success-merge",
  "cta-success-later",
  "/wallet/withdraw?mode=profit",
]) {
  if (!success.includes(needle)) {
    fails.push(`SuccessBucketCtas missing: ${needle}`);
  }
}

const successWire = JSON.parse(
  read("packages/ui/canon/surfaces/execution-success.wire.json"),
);
if ((successWire.successBucketCtas?.count ?? 0) !== 3) {
  fails.push("execution-success.wire successBucketCtas.count must be 3");
}
const ctaKeys = (successWire.successBucketCtas?.items || []).map((i) => i.copyKey);
for (const need of [
  "T.successBucketCta.ctaProfitOnly",
  "T.successBucketCta.ctaMerge",
  "T.successBucketCta.ctaLater",
]) {
  if (!ctaKeys.includes(need)) {
    fails.push(`execution-success 3CTA missing ${need}`);
  }
}

const walletHome = read("apps/web/app/wallet/page.tsx");
if (!walletHome.includes("/wallet/withdraw?mode=principal")) {
  fails.push("wallet home must link principal withdraw");
}
if (!walletHome.includes('data-principal-reachable="true"')) {
  fails.push("wallet home principal CTA must be reachable");
}
if (/display:\s*none/.test(walletHome) && /mode=principal/.test(walletHome)) {
  // soft — only fail if principal link is styled hidden
  if (/mode=principal[\s\S]{0,120}display:\s*none|hidden[\s\S]{0,80}mode=principal/.test(walletHome)) {
    fails.push("wallet home must not hide principal withdraw link");
  }
}

const withdrawPage = read("apps/web/app/wallet/withdraw/page.tsx");
if (!withdrawPage.includes("PrincipalConfirmSheet")) {
  fails.push("withdraw page must mount PrincipalConfirmSheet");
}
if (!withdrawPage.includes("WithdrawModeCards")) {
  fails.push("withdraw page must mount WithdrawModeCards");
}

const executePage = read("apps/web/app/trades/[id]/execute/page.tsx");
const executeClient = fs.existsSync(
  path.join(root, "apps/web/app/trades/[id]/execute/TradeExecuteClient.tsx"),
)
  ? read("apps/web/app/trades/[id]/execute/TradeExecuteClient.tsx")
  : "";
const execute = `${executePage}\n${executeClient}`;
if (!execute.includes('href="/wallet"')) {
  fails.push("Settled execute must recover via /wallet");
}
if (
  execute.includes("SuccessBucketCtas") ||
  execute.includes("ExecutionSuccessReceipt")
) {
  fails.push(
    "production execute must not remount SuccessBucketCtas/ExecutionSuccessReceipt (wallet owns those CTAs)",
  );
}

const finance = read("apps/admin/app/admin/users/[id]/finance/page.tsx");
for (const needle of [
  'tab=buckets',
  "finance-buckets-panel",
  "data-buckets-api",
  "/api/v1/admin/users/",
  "/buckets",
  "BucketBreakdown",
]) {
  if (!finance.includes(needle)) {
    fails.push(`admin finance buckets missing: ${needle}`);
  }
}

const userRoutes = read("services/api-nest/src/wallet/wallet.routes.ts");
if (!userRoutes.includes('buckets: "buckets"')) {
  fails.push("WALLET_USER_ROUTES must include buckets");
}
if (!userRoutes.includes('profitMerge: "profit/merge"')) {
  fails.push("WALLET_USER_ROUTES must include profit/merge");
}

const adminRoutes = read("services/api-nest/src/ledger/ledger.routes.ts");
if (!adminRoutes.includes('userBuckets: "users/:userId/buckets"')) {
  fails.push("LEDGER_ADMIN_ROUTES must include users/:userId/buckets");
}

const merge = read("services/api-nest/src/wallet/profit-merge.service.ts");
for (const needle of [
  "merge_profit_to_principal",
  "MERGE_PROFIT_OK",
  "postJournal",
]) {
  if (!merge.includes(needle)) fails.push(`profit-merge.service missing: ${needle}`);
}

const controller = read("services/api-nest/src/wallet/wallet.controller.ts");
if (!controller.includes("WALLET_USER_ROUTES.buckets")) {
  fails.push("WalletController must expose GET buckets");
}
if (!controller.includes("WALLET_USER_ROUTES.profitMerge")) {
  fails.push("WalletController must expose POST profit/merge");
}

const adminCtrl = read(
  "services/api-nest/src/ledger/ledger.admin.controller.ts",
);
if (!adminCtrl.includes("LEDGER_ADMIN_ROUTES.userBuckets")) {
  fails.push("LedgerAdminController must expose GET user buckets");
}

if (fails.length) {
  console.error("[verify:principal-withdraw-reachable] FAIL");
  for (const f of fails) console.error(" -", f);
  process.exit(1);
}
console.log(
  "[verify:principal-withdraw-reachable] PASS (principal CTA · sheet · 3CTA · admin buckets)",
);
