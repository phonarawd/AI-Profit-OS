/**
 * verify:practice-non-withdrawable — Money §51.7 / §49 P1
 * welcome 1회 · expire 7d · Banner · 403 PRACTICE_NOT_WITHDRAWABLE · Admin buckets
 * FORBIDDEN: practice→profit promotion path
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
  "schemas/practice-grant.v1.json",
  "schemas/toast-codes.v1.json",
  "supabase/migrations/20260809010541_practice_grants_onboarding.sql",
  "services/api-nest/src/ledger/practice-grant.service.ts",
  "services/api-nest/src/risk/rules/p49_practice.ts",
  "services/api-nest/src/risk/rules/p49_guards.ts",
  "packages/ui/copy/ko/practice.ts",
  "packages/ui/components/wallet/DemoWalletBanner.tsx",
  "packages/ui/canon/surfaces/wallet-home.wire.json",
  "apps/web/app/wallet/page.tsx",
  "apps/admin/app/admin/users/[id]/finance/page.tsx",
];
for (const f of files) mustExist(f);

const grant = read("services/api-nest/src/ledger/practice-grant.service.ts");
for (const needle of [
  "PRACTICE_GRANT_KEY_WELCOME",
  "practice_grant_welcome",
  'PRACTICE_WELCOME_USDT = "10"',
  "PRACTICE_WELCOME_EXPIRE_DAYS = 7",
  'journalType: "practice_grant"',
  'journalType: "practice_expire"',
  'bucket: "practice"',
  "grantWelcome",
  "expireDue",
  "PRACTICE_EXPIRED",
  "PRACTICE_GRANTED",
]) {
  if (!grant.includes(needle)) {
    fails.push(`practice-grant.service missing: ${needle}`);
  }
}

// 1회: UNIQUE (user_id, grant_key) + welcome key
const mig = read(
  "supabase/migrations/20260809010541_practice_grants_onboarding.sql",
);
for (const needle of [
  "practice_grants",
  "practice_grants_user_key_uq",
  "UNIQUE (user_id, grant_key)",
  "ENABLE ROW LEVEL SECURITY",
]) {
  if (!mig.includes(needle)) {
    fails.push(`practice_grants migration missing: ${needle}`);
  }
}

const auth = read("services/api-nest/src/auth/auth.service.ts");
if (!auth.includes("practiceGrant.grantWelcome")) {
  fails.push("auth.service must call practiceGrant.grantWelcome after provision");
}
if (!auth.includes("practice_grant_welcome")) {
  fails.push("auth.service must reference practice_grant_welcome");
}

const guards = read("services/api-nest/src/risk/rules/p49_guards.ts");
for (const needle of [
  "assertPracticeNotWithdrawable",
  "PRACTICE_NOT_WITHDRAWABLE",
  "statusCode: 403",
  'requestedBucket === "practice"',
]) {
  if (!guards.includes(needle)) {
    fails.push(`p49_guards missing: ${needle}`);
  }
}

const riskSvc = read("services/api-nest/src/risk/risk.service.ts");
for (const needle of [
  "assertBeforeWithdraw",
  "assertBeforeParticipate",
  "assertPracticeNotWithdrawable",
  "ForbiddenException(practiceHit)",
]) {
  if (!riskSvc.includes(needle)) {
    fails.push(`risk.service missing: ${needle}`);
  }
}

const withdraw = read("services/api-nest/src/wallet/withdraw-intent.service.ts");
if (!withdraw.includes("practiceDebitAttempt")) {
  fails.push("withdraw-intent must pass practiceDebitAttempt to risk");
}

const walletCtrl = read("services/api-nest/src/wallet/wallet.controller.ts");
for (const needle of [
  "practiceWelcome",
  "practiceExpireTick",
  "practiceDebitAttempt",
  'bucket === "practice"',
]) {
  if (!walletCtrl.includes(needle)) {
    fails.push(`wallet.controller missing: ${needle}`);
  }
}

const routes = read("services/api-nest/src/wallet/wallet.routes.ts");
if (!routes.includes('practiceWelcome: "practice/welcome"')) {
  fails.push("WALLET_USER_ROUTES must include practice/welcome");
}
if (!routes.includes('practiceExpireTick: "practice/expire-tick"')) {
  fails.push("WALLET_USER_ROUTES must include practice/expire-tick");
}

const types = read("services/api-nest/src/ledger/ledger.types.ts");
for (const jt of ["practice_grant", "practice_expire"]) {
  if (!types.includes(`"${jt}"`)) {
    fails.push(`ledger.types missing journal ${jt}`);
  }
}
if (!types.includes("PRACTICE_FORBIDDEN_JOURNAL_TYPES")) {
  fails.push("PRACTICE_FORBIDDEN_JOURNAL_TYPES required");
}
for (const jt of ["withdraw", "participate_lock", "settlement", "merge_profit_to_principal"]) {
  if (
    !new RegExp(
      `PRACTICE_FORBIDDEN_JOURNAL_TYPES[\\s\\S]*"${jt}"`,
    ).test(types)
  ) {
    fails.push(`PRACTICE_FORBIDDEN must include ${jt}`);
  }
}

const toast = read("schemas/toast-codes.v1.json");
for (const code of [
  "PRACTICE_NOT_WITHDRAWABLE",
  "PRACTICE_EXPIRED",
  "PRACTICE_GRANTED",
]) {
  if (!toast.includes(`"${code}"`)) {
    fails.push(`toast-codes missing ${code}`);
  }
}
if (!toast.includes("연습 잔액이 만료됐어요")) {
  fails.push("toast PRACTICE_EXPIRED must say 연습 잔액이 만료됐어요");
}

const copy = read("packages/ui/copy/ko/practice.ts");
for (const key of [
  "badge",
  "bannerTitle",
  "bannerBody",
  "notWithdrawable",
  "expiredToast",
  "adminNote",
]) {
  if (!copy.includes(key)) fails.push(`practice copy missing: ${key}`);
}
if (!copy.includes("연습·미리보기 · 출금 아님")) {
  fails.push("practice bannerTitle must match §51.7 / §38.7");
}

const banner = read("packages/ui/components/wallet/DemoWalletBanner.tsx");
for (const needle of [
  'data-testid="demo-wallet-banner"',
  'data-practice-only="true"',
  'data-withdrawable="false"',
  "T.practice.badge",
  "T.practice.bannerTitle",
]) {
  if (!banner.includes(needle)) {
    fails.push(`DemoWalletBanner missing: ${needle}`);
  }
}

const walletHome = read("apps/web/app/wallet/page.tsx");
if (!walletHome.includes("DemoWalletBanner")) {
  fails.push("wallet home must mount DemoWalletBanner");
}

const wire = read("packages/ui/canon/surfaces/wallet-home.wire.json");
if (!wire.includes("DemoWalletBanner")) {
  fails.push("wallet-home.wire must include DemoWalletBanner");
}
if (!wire.includes("T.practice.bannerTitle")) {
  fails.push("wallet-home.wire must reference practice banner copy");
}

const finance = read("apps/admin/app/admin/users/[id]/finance/page.tsx");
for (const needle of [
  'tab=buckets',
  "BucketBreakdown",
  "hidePracticeWhenZero={false}",
  'data-practice-visible="true"',
  "T.practice.adminNote",
  "finance-practice-note",
]) {
  if (!finance.includes(needle)) {
    fails.push(`admin finance buckets missing: ${needle}`);
  }
}

// FORBIDDEN: practice→profit promotion code path
const promoHits = [];
function walk(dir, onFile) {
  if (!fs.existsSync(dir)) return;
  for (const ent of fs.readdirSync(dir, { withFileTypes: true })) {
    if (
      ["node_modules", "dist", ".next", "coverage", "target"].includes(ent.name)
    ) {
      continue;
    }
    const p = path.join(dir, ent.name);
    if (ent.isDirectory()) walk(p, onFile);
    else onFile(p);
  }
}
walk(path.join(root, "services/api-nest/src"), (file) => {
  if (!/\.ts$/.test(file)) return;
  const rel = path.relative(root, file);
  // grant/expire services may mention both buckets — skip allowlist
  if (
    rel.includes("practice-grant.service.ts") ||
    rel.includes("p49_practice.ts") ||
    rel.includes("p49_guards.ts") ||
    rel.includes("p49_catalog.ts") ||
    rel.includes("ledger.types.ts") ||
    rel.includes("ledger.posting.service.ts")
  ) {
    return;
  }
  const t = fs.readFileSync(file, "utf8");
  // explicit promotion patterns
  if (
    /bucket:\s*"practice"[\s\S]{0,120}bucket:\s*"profit"/.test(t) ||
    /bucket:\s*"profit"[\s\S]{0,120}bucket:\s*"practice"/.test(t) ||
    /practice\s*→\s*profit|practiceToProfit|promotePractice/i.test(t)
  ) {
    // allow comments that forbid
    if (/FORBIDDEN|금지|코드경로 0|non-withdrawable/i.test(t)) return;
    promoHits.push(rel);
  }
});
if (promoHits.length) {
  fails.push(`practice→profit path forbidden: ${promoHits.join(", ")}`);
}

if (fails.length) {
  console.error("[verify:practice-non-withdrawable] FAIL");
  for (const f of fails) console.error(" -", f);
  process.exit(1);
}
console.log(
  "[verify:practice-non-withdrawable] PASS (welcome 1×·7d expire·Banner·403·Admin buckets)",
);
