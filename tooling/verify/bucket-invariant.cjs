/**
 * verify:bucket-invariant — Money §11 · §43.5 · §49
 * Double-entry posting only · ASC FOR UPDATE · idempotency · provision ·
 * 잔액 UPDATE 0 outside posting flag · recon · practice path isolation
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

function walk(dir, onFile) {
  if (!fs.existsSync(dir)) return;
  for (const ent of fs.readdirSync(dir, { withFileTypes: true })) {
    if (
      ent.name === "node_modules" ||
      ent.name === "dist" ||
      ent.name === ".next" ||
      ent.name === "coverage" ||
      ent.name === "target"
    ) {
      continue;
    }
    const p = path.join(dir, ent.name);
    if (ent.isDirectory()) walk(p, onFile);
    else onFile(p);
  }
}

const ledgerFiles = [
  "services/api-nest/src/ledger/ledger.module.ts",
  "services/api-nest/src/ledger/ledger.posting.service.ts",
  "services/api-nest/src/ledger/ledger.provision.service.ts",
  "services/api-nest/src/ledger/ledger.buckets.service.ts",
  "services/api-nest/src/ledger/ledger.recon.service.ts",
  "services/api-nest/src/ledger/ledger.admin.service.ts",
  "services/api-nest/src/ledger/ledger.admin.controller.ts",
  "services/api-nest/src/ledger/ledger.routes.ts",
  "services/api-nest/src/ledger/ledger.types.ts",
  "services/api-nest/src/ledger/ledger.money.ts",
  "schemas/wallet-buckets.v1.json",
  "schemas/ledger-journal.v1.json",
  "schemas/ledger-admin-adjust.v1.json",
  "schemas/ledger-recon-report.v1.json",
  "schemas/financial-report.v1.json",
  "supabase/migrations/20260808205846_ledger_accounts_journals.sql",
  "supabase/migrations/20260808205901_rls_ledger_guards.sql",
];

for (const f of ledgerFiles) mustExist(f);

const posting = read("services/api-nest/src/ledger/ledger.posting.service.ts");
for (const needle of [
  "set_config('app.ledger_posting', 'on', true)",
  "ORDER BY id ASC",
  "FOR UPDATE",
  "idempotencyKey",
  "idempotency_key",
  "PRACTICE_FORBIDDEN_JOURNAL_TYPES",
  "INSUFFICIENT_BALANCE",
]) {
  if (!posting.includes(needle)) {
    fails.push(`ledger.posting.service missing: ${needle}`);
  }
}

const provision = read(
  "services/api-nest/src/ledger/ledger.provision.service.ts",
);
if (!provision.includes("provision_user_bucket_accounts")) {
  fails.push("provision service must call SQL provision_user_bucket_accounts");
}

const buckets = read("services/api-nest/src/ledger/ledger.buckets.service.ts");
if (!buckets.includes("liabilityUsdt") || !buckets.includes("bucket-invariant")) {
  fails.push("buckets service must enforce principal+profit+locked+practice=liability");
}

const recon = read("services/api-nest/src/ledger/ledger.recon.service.ts");
for (const needle of [
  "JOURNAL_UNBALANCED",
  "PROJECTION_DRIFT",
  "BUCKET_INVARIANT",
  "reconMismatch",
]) {
  if (!recon.includes(needle)) fails.push(`recon missing: ${needle}`);
}

const admin = read("services/api-nest/src/ledger/ledger.admin.service.ts");
for (const needle of [
  "admin_adjust",
  "reason",
  "OPS_POOL",
  "DUAL_CONFIRM_REQUIRED",
  "BALANCE_ADJUSTED",
]) {
  if (!admin.includes(needle)) fails.push(`admin adjust missing: ${needle}`);
}

const events = read("services/api-nest/src/ledger/ledger.events.ts");
const ledgerTypes = read("services/api-nest/src/ledger/ledger.types.ts");
if (!events.includes("ledger.recon.mismatch")) {
  fails.push("LEDGER_EVENTS must include ledger.recon.mismatch");
}
if (!ledgerTypes.includes("SYS:OPS_POOL")) {
  fails.push("system account SYS:OPS_POOL must be locked in ledger.types");
}
if (!/trim\(\)\.length < 10/.test(admin) && !/length < 10/.test(admin)) {
  fails.push("admin adjust must enforce reason ≥10");
}

const routes = read("services/api-nest/src/ledger/ledger.routes.ts");
for (const needle of [
  "ledger/journals",
  "ledger/recon",
  "reports/financial",
  "balance-adjust",
  "users/:userId/buckets",
]) {
  if (!routes.includes(needle)) fails.push(`LEDGER_ADMIN_ROUTES missing ${needle}`);
}

const walletRoutes = read("services/api-nest/src/wallet/wallet.routes.ts");
for (const needle of ['buckets: "buckets"', 'profitMerge: "profit/merge"']) {
  if (!walletRoutes.includes(needle)) {
    fails.push(`WALLET_USER_ROUTES missing ${needle}`);
  }
}

const controller = read(
  "services/api-nest/src/ledger/ledger.admin.controller.ts",
);
if (!controller.includes('@Controller("admin")')) {
  fails.push('LedgerAdminController must be @Controller("admin")');
}

const appMod = read("services/api-nest/src/app.module.ts");
if (!appMod.includes("LedgerModule")) {
  fails.push("AppModule must import LedgerModule");
}

const authSvc = read("services/api-nest/src/auth/auth.service.ts");
if (!authSvc.includes("provisionLedgerBucketsForUser")) {
  fails.push("AuthService must expose provisionLedgerBucketsForUser");
}
if (!authSvc.includes("LedgerProvisionService")) {
  fails.push("AuthService must inject LedgerProvisionService");
}

const authMod = read("services/api-nest/src/auth/auth.module.ts");
if (!authMod.includes("LedgerModule")) {
  fails.push("AuthModule must import LedgerModule");
}

const mig = read(
  "supabase/migrations/20260808205846_ledger_accounts_journals.sql",
);
if (!mig.includes("provision_user_bucket_accounts")) {
  fails.push("migration must define provision_user_bucket_accounts");
}
if (!mig.includes("idempotency_key text NOT NULL UNIQUE")) {
  fails.push("journals.idempotency_key must be UNIQUE");
}

const guards = read("supabase/migrations/20260808205901_rls_ledger_guards.sql");
if (!guards.includes("ledger_require_posting_flag")) {
  fails.push("guards must include ledger_require_posting_flag");
}
if (!guards.includes("app.ledger_posting")) {
  fails.push("guards must require app.ledger_posting=on");
}

const walletSchema = JSON.parse(read("schemas/wallet-buckets.v1.json"));
for (const req of [
  "principalUsdt",
  "profitUsdt",
  "lockedUsdt",
  "practiceUsdt",
  "liabilityUsdt",
]) {
  if (!(walletSchema.required || []).includes(req)) {
    fails.push(`wallet-buckets.v1 required missing ${req}`);
  }
}

const adjustSchema = JSON.parse(read("schemas/ledger-admin-adjust.v1.json"));
if ((adjustSchema.properties?.reason?.minLength ?? 0) < 10) {
  fails.push("ledger-admin-adjust.v1 reason minLength must be ≥10");
}
if (!adjustSchema.properties?.bucket?.enum?.includes("principal")) {
  fails.push("ledger-admin-adjust.v1 must require bucket enum");
}

// Forbidden: balance_usdt UPDATE outside posting service / SQL guards
const forbidRe =
  /UPDATE\s+(?:public\.)?ledger_accounts[\s\S]{0,200}balance_usdt/i;
const allowRel = path.normalize(
  "services/api-nest/src/ledger/ledger.posting.service.ts",
);
walk(path.join(root, "services"), (file) => {
  if (!/\.(ts|js)$/.test(file)) return;
  const rel = path.relative(root, file);
  if (path.normalize(rel) === allowRel) return;
  const t = fs.readFileSync(file, "utf8");
  if (forbidRe.test(t)) {
    fails.push(`잔액 UPDATE forbidden outside posting: ${rel}`);
  }
});
walk(path.join(root, "apps"), (file) => {
  if (!/\.(ts|tsx|js|jsx)$/.test(file)) return;
  const rel = path.relative(root, file);
  const t = fs.readFileSync(file, "utf8");
  if (forbidRe.test(t)) {
    fails.push(`잔액 UPDATE forbidden in apps: ${rel}`);
  }
});
walk(path.join(root, "workers"), (file) => {
  if (!/\.(ts|js)$/.test(file)) return;
  const rel = path.relative(root, file);
  const t = fs.readFileSync(file, "utf8");
  if (forbidRe.test(t)) {
    fails.push(`잔액 UPDATE forbidden in workers: ${rel}`);
  }
});

// wallet-service folder must not exist (Money path lock)
if (fs.existsSync(path.join(root, "services/wallet-service"))) {
  fails.push("services/wallet-service forbidden · use api-nest ledger module");
}

const types = read("services/api-nest/src/ledger/ledger.types.ts");
if (!types.includes("PRACTICE_FORBIDDEN_JOURNAL_TYPES")) {
  fails.push("types must define PRACTICE_FORBIDDEN_JOURNAL_TYPES");
}
for (const jt of ["withdraw", "participate_lock", "settlement"]) {
  if (!types.includes(`"${jt}"`)) {
    fails.push(`PRACTICE_FORBIDDEN must include ${jt}`);
  }
}

const toast = read("schemas/toast-codes.v1.json");
if (!toast.includes("BALANCE_ADJUSTED")) {
  fails.push("toast-codes must include BALANCE_ADJUSTED");
}

if (fails.length) {
  console.error("[verify:bucket-invariant] FAIL");
  for (const f of fails) console.error(" -", f);
  process.exit(1);
}
console.log(
  "[verify:bucket-invariant] PASS (posting·ASC FOR UPDATE·idempotency·provision·recon·admin_adjust)",
);
