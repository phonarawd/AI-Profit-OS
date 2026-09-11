/**
 * BACKEND-ONLY PORT of tooling/verify/principal-withdraw-reachable.cjs (recovery base SHA 86f15964).
 * UI assertions (customer web / admin UI / shared UI package / client SDK) were recorded in
 * quality/putduk-web-ui-assertions-handoff.md and removed here; only backend
 * (services / schemas / supabase / workers / infra / governance) assertions remain.
 */
/**
 * verify:principal-withdraw-reachable — Money §49.1 · E3
 * Principal withdraw CTA must exist and must not be hidden/removed.
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
  "services/api-nest/src/wallet/wallet.routes.ts",
  "services/api-nest/src/wallet/profit-merge.service.ts",
  "services/api-nest/src/ledger/ledger.routes.ts",
];
for (const f of files) mustExist(f);

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
  "[verify:principal-withdraw-reachable] PASS (wallet routes buckets/profit-merge · ledger admin userBuckets · profit-merge journal)",
);
