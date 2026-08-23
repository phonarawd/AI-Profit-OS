/**
 * verify:principal-profit-abuse — Money §49.9
 * P1~P24 · E1~E12 catalog · Nest risk rules · Admin risk?tab=queue · freeze · CI
 * FORBIDDEN: services/risk-service folder (must be api-nest/src/risk)
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

// ── files ──────────────────────────────────────────────
const files = [
  "schemas/risk-signal.v1.json",
  "schemas/risk-queue.v1.json",
  "schemas/user-risk-state.v1.json",
  "schemas/toast-codes.v1.json",
  "supabase/migrations/20260809003413_risk_p49_abuse.sql",
  "services/api-nest/src/risk/risk.module.ts",
  "services/api-nest/src/risk/risk.service.ts",
  "services/api-nest/src/risk/risk.admin.controller.ts",
  "services/api-nest/src/risk/risk.routes.ts",
  "services/api-nest/src/risk/risk.events.ts",
  "services/api-nest/src/risk/risk.types.ts",
  "services/api-nest/src/risk/money-circuit.service.ts",
  "services/api-nest/src/risk/rules/p49_catalog.ts",
  "services/api-nest/src/risk/rules/p49_guards.ts",
  "services/api-nest/src/risk/rules/p49_status.ts",
  "services/api-nest/src/risk/rules/p49_circuit.ts",
  "services/api-nest/src/risk/rules/p49_practice.ts",
  "services/api-nest/src/risk/rules/p49_velocity.ts",
  "apps/admin/app/admin/risk/page.tsx",
  "apps/admin/routes.ts",
];
for (const f of files) mustExist(f);

// Separate risk-service folder FORBIDDEN
if (fs.existsSync(path.join(root, "services/risk-service"))) {
  fails.push("FORBIDDEN: services/risk-service — use api-nest/src/risk");
}

const catalog = read("services/api-nest/src/risk/rules/p49_catalog.ts");
for (let i = 1; i <= 24; i++) {
  if (!catalog.includes(`code: "P${i}"`)) {
    fails.push(`p49_catalog missing P${i}`);
  }
}
for (let i = 1; i <= 12; i++) {
  if (!catalog.includes(`code: "E${i}"`)) {
    fails.push(`p49_catalog missing E${i}`);
  }
}

const forbidden = [
  "몰수",
  "원금잠금영구",
  "원금 영구 잠금",
  "수익 몰수",
  "강제 몰수",
];
if (!catalog.includes("P49_FORBIDDEN_COPY")) {
  fails.push("p49_catalog must export P49_FORBIDDEN_COPY");
}

// Copy scan — user-facing packages must not contain forbidden threat copy
const copyHits = [];
walk(path.join(root, "packages/ui/copy"), (file) => {
  if (!/\.(ts|tsx|js)$/.test(file)) return;
  const t = fs.readFileSync(file, "utf8");
  for (const bad of forbidden) {
    if (t.includes(bad)) {
      copyHits.push(`${path.relative(root, file)}:${bad}`);
    }
  }
});
if (copyHits.length) {
  fails.push(`P22 forbidden copy: ${copyHits.join(", ")}`);
}

const toast = read("schemas/toast-codes.v1.json");
for (const code of [
  "PRACTICE_NOT_WITHDRAWABLE",
  "INSUFFICIENT_PROFIT",
  "INSUFFICIENT_PRINCIPAL",
  "WITHDRAW_PRINCIPAL_WARN",
  "MIN_HOLDING",
  "RATE_LIMITED",
  "CIRCUIT_OPEN",
  "money.circuit.bucket_invariant",
  "ACCOUNT_FROZEN",
  "ACCOUNT_BANNED",
  "WITHDRAW_BLOCKED",
  "NETWORK_ERROR",
]) {
  if (!toast.includes(`"${code}"`)) {
    fails.push(`toast-codes missing ${code}`);
  }
}

const status = read("services/api-nest/src/risk/rules/p49_status.ts");
for (const needle of [
  "flagged",
  "restricted",
  "frozen",
  "banned",
  "withdrawBlocked",
  "principalWithdrawCapped",
  "mergeBlocked",
  "participateBlocked",
  "loginBlocked",
]) {
  if (!status.includes(needle)) {
    fails.push(`p49_status missing: ${needle}`);
  }
}

const guards = read("services/api-nest/src/risk/rules/p49_guards.ts");
for (const needle of [
  "assertPracticeNotWithdrawable",
  "assertWithdrawBucketCeilings",
  "assertPrincipalConfirm",
  "assertWithdrawRateLimit",
  "assertAdminBucketSpecified",
  "INSUFFICIENT_PROFIT",
  "PRINCIPAL_CONFIRM_REQUIRED",
  "PRACTICE_NOT_WITHDRAWABLE",
]) {
  if (!guards.includes(needle)) {
    fails.push(`p49_guards missing: ${needle}`);
  }
}

const circuit = read("services/api-nest/src/risk/rules/p49_circuit.ts");
for (const needle of [
  "money.circuit.bucket_invariant",
  "shouldOpenCircuitFromRecon",
  "CIRCUIT_OPEN",
]) {
  if (!circuit.includes(needle)) {
    fails.push(`p49_circuit missing: ${needle}`);
  }
}
if (/BUCKET_INVARIANT_FAIL/.test(circuit)) {
  fails.push("p49_circuit must not keep legacy underscore_flat_alias");
}
const catalogSrc = catalog;
if (/BUCKET_INVARIANT_FAIL/.test(catalogSrc)) {
  fails.push("p49_catalog must not keep legacy underscore_flat_alias");
}
if (/BUCKET_INVARIANT_FAIL/.test(toast)) {
  fails.push("toast-codes must not keep legacy underscore_flat_alias");
}

const riskSvc = read("services/api-nest/src/risk/risk.service.ts");
for (const needle of [
  "assertBeforeWithdraw",
  "assertBeforeMerge",
  "listQueue",
  "raiseSignal",
  "setUserStatus",
  'tab: "queue"',
]) {
  if (!riskSvc.includes(needle)) {
    fails.push(`risk.service missing: ${needle}`);
  }
}

const routes = read("services/api-nest/src/risk/risk.routes.ts");
for (const needle of [
  'queue: "risk/queue"',
  "userFreeze",
  "userUnfreeze",
  "circuit",
]) {
  if (!routes.includes(needle)) {
    fails.push(`risk.routes missing: ${needle}`);
  }
}

const appMod = read("services/api-nest/src/app.module.ts");
if (!appMod.includes("RiskModule")) {
  fails.push("app.module must import RiskModule");
}

const withdraw = read(
  "services/api-nest/src/wallet/withdraw-intent.service.ts",
);
for (const needle of [
  "risk.assertBeforeWithdraw",
  "minHolding.check",
  'ruleCode: "P8"',
  "principalConfirmToken",
]) {
  if (!withdraw.includes(needle)) {
    fails.push(`withdraw-intent missing §49.9 wire: ${needle}`);
  }
}

const merge = read("services/api-nest/src/wallet/profit-merge.service.ts");
if (!merge.includes("risk.assertBeforeMerge")) {
  fails.push("profit-merge must call risk.assertBeforeMerge");
}

const mig = read(
  "supabase/migrations/20260809003413_risk_p49_abuse.sql",
);
for (const needle of [
  "user_risk_state",
  "risk_signals",
  "risk_signal_actions",
  "money_circuit",
  "flagged",
  "restricted",
  "frozen",
  "banned",
]) {
  if (!mig.includes(needle)) {
    fails.push(`migration missing: ${needle}`);
  }
}

const adminRoutes = read("apps/admin/routes.ts");
if (!adminRoutes.includes('"/admin/risk?tab=queue"')) {
  fails.push("ADMIN_CHILD_ROUTES must include /admin/risk?tab=queue");
}

const riskPage = read("apps/admin/app/admin/risk/page.tsx");
for (const needle of [
  "risk?tab=queue",
  "risk-queue-panel",
  "/api/v1/admin/risk/queue",
  "freeze",
  "P1-P24",
  "E1-E12",
]) {
  if (!riskPage.includes(needle)) {
    fails.push(`admin risk page missing: ${needle}`);
  }
}

const queueSchema = JSON.parse(read("schemas/risk-queue.v1.json"));
if (queueSchema.properties?.tab?.const !== "queue") {
  fails.push("risk-queue.v1 tab const must be queue");
}

const signalSchema = JSON.parse(read("schemas/risk-signal.v1.json"));
const rulePat = signalSchema.properties?.ruleCode?.pattern || "";
if (!rulePat.includes("P") || !rulePat.includes("E")) {
  fails.push("risk-signal.v1 ruleCode pattern must cover P* and E*");
}

// Abuse drill P4·P6 (pure mirror) · P13/P14 wiring pointers
function parseUsdt(v) {
  const n = Number(v);
  if (!Number.isFinite(n) || n < 0) return -1;
  return Math.round(n * 1e8);
}
function gt(a, b) {
  return parseUsdt(a) > parseUsdt(b);
}
function drillP4() {
  return gt("10", "5"); // profit debit > profit ⇒ reject
}
function drillP6(tok) {
  return !tok || tok.length < 8;
}
if (!drillP4()) fails.push("abuse drill P4 logic broken");
if (!drillP6("")) fails.push("abuse drill P6 must reject empty token");
if (drillP6("confirm-ok-token")) {
  fails.push("abuse drill P6 must accept token≥8");
}

// P13 pointer — withdraw intent idempotency UNIQUE
if (!withdraw.includes("idempotency_key")) {
  fails.push("P13: withdraw must use idempotency_key");
}
const posting = read(
  "services/api-nest/src/ledger/ledger.posting.service.ts",
);
if (!posting.includes("FOR UPDATE") || !posting.includes("ORDER BY id ASC")) {
  fails.push("P14: ledger posting must ASC FOR UPDATE");
}

if (fails.length) {
  console.error(
    "[verify:principal-profit-abuse] FAIL\n- " + fails.join("\n- "),
  );
  process.exit(1);
}
console.log(
  "[verify:principal-profit-abuse] PASS (P1~P24 · E1~E12 · risk queue · freeze · circuit)",
);
