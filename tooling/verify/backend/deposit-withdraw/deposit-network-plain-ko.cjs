/**
 * BACKEND-ONLY PORT of tooling/verify/deposit-network-plain-ko.cjs (recovery base SHA 86f15964).
 * UI assertions (customer web / admin UI / shared UI package / client SDK) were recorded in
 * quality/putduk-web-ui-assertions-handoff.md and removed here; only backend
 * (services / schemas / supabase / workers / infra / governance) assertions remain.
 */
/**
 * verify:deposit-network-plain-ko — Money §41.6
 * 입금 USDT 탭 네트워크 한글 경고 100% · TRC20 유저 surface 렌더 0
 * wrong-chain → /me/support?category=deposit · Admin wallet?tab=disputes
 */
const fs = require("fs");
const path = require("path");

const root = path.resolve(__dirname, "../../../..");
const fails = [];

function mustExist(rel) {
  if (!fs.existsSync(path.join(root, rel))) fails.push(`missing: ${rel}`);
}

function read(rel) {
  return fs.readFileSync(path.join(root, rel), "utf8");
}

const files = [
  "schemas/deposit-dispute.v1.json",
  "schemas/ui-copy-glossary.v1.json",
  "schemas/toast-codes.v1.json",
  "supabase/migrations/20260809010849_deposit_disputes.sql",
  "services/api-nest/src/wallet/network-plain-ko.ts",
  "services/api-nest/src/wallet/deposit-dispute.service.ts",
  "services/api-nest/src/wallet/deposit-dispute.admin.controller.ts",
  "services/api-nest/src/wallet/wallet.routes.ts",
  "services/api-nest/src/wallet/wallet.events.ts",
  "services/api-nest/src/wallet/wallet.module.ts",
  "services/api-nest/src/wallet/wallet.controller.ts",
];
for (const f of files) mustExist(f);

// --- Money API contract ---
const routes = read("services/api-nest/src/wallet/wallet.routes.ts");
for (const needle of [
  'depositDisputes: "deposit-disputes"',
  'depositDisputes: "wallet/deposit-disputes"',
  "depositDisputeCredit",
  "depositDisputeReject",
]) {
  if (!routes.includes(needle)) {
    fails.push(`wallet.routes missing: ${needle}`);
  }
}

const events = read("services/api-nest/src/wallet/wallet.events.ts");
for (const needle of [
  "depositDisputeSubmitted",
  "depositDisputeCredited",
  "depositDisputeRejected",
]) {
  if (!events.includes(needle)) {
    fails.push(`wallet.events missing: ${needle}`);
  }
}

const svc = read("services/api-nest/src/wallet/deposit-dispute.service.ts");
for (const needle of [
  'journalType: "admin_adjust"',
  "deposit_dispute_decisions",
  "wrong_chain",
  "category",
  "DEPOSIT_DISPUTE_REASON_MIN",
  "admin.deposit_dispute.credited",
  "admin.deposit_dispute.rejected",
]) {
  if (!svc.includes(needle)) {
    fails.push(`deposit-dispute.service missing: ${needle}`);
  }
}
const rejectStart = svc.indexOf("async reject(");
if (rejectStart >= 0) {
  const rejectBody = svc.slice(
    rejectStart,
    svc.indexOf("\n  private ", rejectStart + 1),
  );
  if (/postJournal/.test(rejectBody)) {
    fails.push("reject() must not call postJournal (credit 0)");
  }
}

const netMap = read("services/api-nest/src/wallet/network-plain-ko.ts");
for (const needle of [
  'LEDGER_NETWORK_CODE = "TRC20"',
  'USER_NETWORK_LABEL_KO = "트론"',
  "networkLabelForUser",
  "containsForbiddenNetworkJargon",
]) {
  if (!netMap.includes(needle)) {
    fails.push(`network-plain-ko missing: ${needle}`);
  }
}

const mod = read("services/api-nest/src/wallet/wallet.module.ts");
if (!mod.includes("DepositDisputeService")) {
  fails.push("WalletModule must register DepositDisputeService");
}
if (!mod.includes("DepositDisputeAdminController")) {
  fails.push("WalletModule must register DepositDisputeAdminController");
}

const controller = read("services/api-nest/src/wallet/wallet.controller.ts");
if (!controller.includes("createDepositDispute")) {
  fails.push("WalletController must expose createDepositDispute");
}

// --- schema / toast / glossary ---
const disputeSchema = JSON.parse(read("schemas/deposit-dispute.v1.json"));
if (!(disputeSchema.properties?.kind?.enum || []).includes("wrong_chain")) {
  fails.push("deposit-dispute.v1 kind must include wrong_chain");
}
if (disputeSchema.properties?.supportCategory?.const !== "deposit") {
  fails.push("deposit-dispute supportCategory must be deposit");
}

const toast = read("schemas/toast-codes.v1.json");
for (const code of [
  "DEPOSIT_DISPUTE_SUBMITTED",
  "DEPOSIT_DISPUTE_CREDITED",
  "DEPOSIT_DISPUTE_REJECTED",
]) {
  if (!toast.includes(`"${code}"`)) {
    fails.push(`toast-codes missing ${code}`);
  }
}

const glossary = JSON.parse(read("schemas/ui-copy-glossary.v1.json"));
const trc = (glossary.default?.entries || []).find((e) => e.code === "TRC20");
if (!trc) {
  fails.push("glossary missing TRC20 entry");
} else {
  if (trc.koLabel !== "트론") {
    fails.push(`glossary TRC20 koLabel must be 트론 (got ${trc.koLabel})`);
  }
  if (!(trc.forbiddenAliases || []).includes("TRC20")) {
    fails.push("glossary TRC20 must forbid alias TRC20");
  }
}

const mig = read("supabase/migrations/20260809010849_deposit_disputes.sql");
for (const needle of [
  "deposit_disputes",
  "deposit_dispute_decisions",
  "wrong_chain",
  "ENABLE ROW LEVEL SECURITY",
]) {
  if (!mig.includes(needle)) {
    fails.push(`migration missing: ${needle}`);
  }
}

if (fails.length) {
  console.error("[verify:deposit-network-plain-ko] FAIL");
  for (const f of fails) console.error(" -", f);
  process.exit(1);
}

console.log(
  "[verify:deposit-network-plain-ko] PASS (deposit-dispute API/service · TRC20 ledger code vs user label · glossary · migration)",
);
