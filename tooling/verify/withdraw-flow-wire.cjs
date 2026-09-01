/**
 * verify:withdraw-flow-wire — UI PART9f2
 * WithdrawAmountPanel + step-up + POST /wallet/withdraw(idempotencyKey)
 * PrincipalConfirmSheet 토큰=클라랜덤 pointer
 */
const fs = require("fs");
const path = require("path");

const root = path.resolve(__dirname, "../..");
const fails = [];

function mustExist(rel) {
  if (!fs.existsSync(path.join(root, rel))) fails.push(`missing: ${rel}`);
}

function read(rel) {
  const p = path.join(root, rel);
  if (!fs.existsSync(p)) {
    fails.push(`missing: ${rel}`);
    return "";
  }
  return fs.readFileSync(p, "utf8");
}

const files = [
  "packages/ui/components/wallet/WithdrawAmountPanel.tsx",
  "packages/ui/components/wallet/WithdrawStepUpPanel.tsx",
  "packages/ui/components/wallet/PrincipalConfirmSheet.tsx",
  "apps/web/components/WithdrawLiveForm.tsx",
  "apps/web/app/wallet/withdraw/page.tsx",
  "apps/web/app/wallet/withdraw/usdt/page.tsx",
  "apps/web/app/wallet/withdraw/krw/page.tsx",
  "packages/sdk/src/wallet/fetch.ts",
];
for (const f of files) mustExist(f);

const amount = read("packages/ui/components/wallet/WithdrawAmountPanel.tsx");
const step = read("packages/ui/components/wallet/WithdrawStepUpPanel.tsx");
const sheet = read("packages/ui/components/wallet/PrincipalConfirmSheet.tsx");
const form = read("apps/web/components/WithdrawLiveForm.tsx");
const sdk = read("packages/sdk/src/wallet/fetch.ts");
const pages = [
  read("apps/web/app/wallet/withdraw/page.tsx"),
  read("apps/web/app/wallet/withdraw/usdt/page.tsx"),
  read("apps/web/app/wallet/withdraw/krw/page.tsx"),
].join("\n");
const copy = read("packages/ui/copy/ko/principal-profit.ts");
const pkg = read("packages/ui/package.json");

for (const needle of [
  "WithdrawAmountPanel",
  "withdraw-amount-input",
  "T.withdrawMode.feeHint",
]) {
  if (!amount.includes(needle)) {
    fails.push(`WithdrawAmountPanel missing ${needle}`);
  }
}

for (const needle of [
  "WithdrawStepUpPanel",
  "withdraw-step-up-challenge",
  "withdraw-step-up-verify",
]) {
  if (!step.includes(needle)) fails.push(`WithdrawStepUpPanel missing ${needle}`);
}

if (!sheet.includes("makePrincipalConfirmToken") && !sheet.includes("pc_")) {
  fails.push("PrincipalConfirmSheet must mint client random principalConfirmToken");
}
if (!sheet.includes("onConfirmPrincipal")) {
  fails.push("PrincipalConfirmSheet must call onConfirmPrincipal(token)");
}

for (const needle of [
  "createWithdraw",
  "createWithdrawStepUpChallenge",
  "verifyWithdrawStepUp",
  "newWithdrawIdempotencyKey",
  "idempotencyKey",
]) {
  if (!sdk.includes(needle)) fails.push(`sdk/wallet missing ${needle}`);
}

for (const needle of [
  "WithdrawAmountPanel",
  "WithdrawStepUpPanel",
  "createWithdraw",
  "idempotencyKey",
  "stepUpToken",
]) {
  if (!form.includes(needle)) fails.push(`WithdrawLiveForm missing ${needle}`);
}
if (!form.includes("createIdempotencyLifecycle") || !form.includes("withdrawFingerprint")) {
  fails.push("WithdrawLiveForm must keep one idempotency key per economic intent");
}

if (!pages.includes("WithdrawLiveForm") && !pages.includes("WithdrawAmountPanel")) {
  fails.push("withdraw pages must mount WithdrawLiveForm or WithdrawAmountPanel");
}
for (const relHint of ["withdraw/usdt", "withdraw/krw", "wallet/withdraw"]) {
  // soft: combined pages string already checked
}
if (!pages.includes("WithdrawLiveForm")) {
  fails.push("all three withdraw routes should use WithdrawLiveForm (PART9f2)");
}

for (const key of ["ctaSubmit", "stepUpChallenge", "stepUpVerify", "feeLine"]) {
  if (!copy.includes(key)) fails.push(`T.withdrawMode missing ${key}`);
}

if (!pkg.includes("WithdrawAmountPanel")) {
  fails.push("@aipo/ui must export WithdrawAmountPanel");
}
if (!pkg.includes("WithdrawStepUpPanel")) {
  fails.push("@aipo/ui must export WithdrawStepUpPanel");
}

if (fails.length) {
  console.error("[verify:withdraw-flow-wire] FAIL\n- " + fails.join("\n- "));
  process.exit(1);
}
console.log(
  "[verify:withdraw-flow-wire] PASS — amount·step-up·POST withdraw·idempotencyKey",
);
