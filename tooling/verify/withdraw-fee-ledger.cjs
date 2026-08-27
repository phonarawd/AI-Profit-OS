/**
 * verify:withdraw-fee-ledger — Money §11.1
 * deposit-config fee keys · FEE_REVENUE posting · WITHDRAW_FEE_HINT 필수 표시
 * Evidence class: STATIC_CONTRACT — source/schema/wiring only; runtime behavior is not executed here.
 */
const fs = require("fs");
const path = require("path");

const root = path.resolve(__dirname, "../..");
const EVIDENCE_CLASS = "STATIC_CONTRACT";
const fails = [];

function mustExist(rel) {
  if (!fs.existsSync(path.join(root, rel))) fails.push(`missing: ${rel}`);
}

function read(rel) {
  return fs.readFileSync(path.join(root, rel), "utf8");
}

const files = [
  "schemas/deposit-config.v1.json",
  "schemas/withdraw-intent.v1.json",
  "schemas/toast-codes.v1.json",
  "services/api-nest/src/wallet/withdraw-fee.service.ts",
  "services/api-nest/src/wallet/deposit-config.service.ts",
  "services/api-nest/src/wallet/deposit-config.admin.controller.ts",
  "services/api-nest/src/wallet/wallet.routes.ts",
  "services/api-nest/src/wallet/wallet.module.ts",
  "supabase/migrations/20260808234957_deposit_config_fee_min_holding.sql",
];
for (const f of files) mustExist(f);

const schema = JSON.parse(read("schemas/deposit-config.v1.json"));
const usdtFee =
  schema.properties?.usdtOnchain?.properties?.usdtWithdrawNetworkFeeUsdt;
const krwFee = schema.properties?.krw?.properties?.krwWithdrawFeeKrw;
if (!usdtFee) fails.push("deposit-config missing usdtWithdrawNetworkFeeUsdt");
if (!krwFee) fails.push("deposit-config missing krwWithdrawFeeKrw");
if (!(schema.properties?.krw?.required || []).includes("krwWithdrawFeeKrw")) {
  fails.push("krw.krwWithdrawFeeKrw must be required");
}
if (
  !(schema.properties?.usdtOnchain?.required || []).includes(
    "usdtWithdrawNetworkFeeUsdt",
  )
) {
  fails.push("usdtOnchain.usdtWithdrawNetworkFeeUsdt must be required");
}

const intent = JSON.parse(read("schemas/withdraw-intent.v1.json"));
if (!intent.properties?.withdrawFeeUsdt) {
  fails.push("withdraw-intent.v1 must include withdrawFeeUsdt");
}

const toast = read("schemas/toast-codes.v1.json");
if (!toast.includes('"WITHDRAW_FEE_HINT"')) {
  fails.push("toast-codes must include WITHDRAW_FEE_HINT");
}
if (!toast.includes("이체 수수료")) {
  fails.push("WITHDRAW_FEE_HINT must include 이체 수수료 copy");
}

const feeSvc = read("services/api-nest/src/wallet/withdraw-fee.service.ts");
for (const needle of [
  "WITHDRAW_FEE_HINT",
  "이체 수수료",
  "FEE_REVENUE",
  "SYS:FEE_REVENUE",
  "buildFeePostingLines",
  "usdtWithdrawNetworkFeeUsdt",
  "krwWithdrawFeeKrw",
  "assertFeeVisible",
  'journalType=fee',
]) {
  if (!feeSvc.includes(needle)) {
    fails.push(`withdraw-fee.service missing: ${needle}`);
  }
}
if (!feeSvc.includes('direction: "debit"') || !feeSvc.includes('direction: "credit"')) {
  fails.push("fee service must debit user + credit FEE_REVENUE");
}
if (!feeSvc.includes('"profit"') || !feeSvc.includes('"principal"')) {
  fails.push("fee must allocate by withdraw mode buckets");
}

const cfgSvc = read("services/api-nest/src/wallet/deposit-config.service.ts");
if (!cfgSvc.includes("usdtWithdrawNetworkFeeUsdt")) {
  fails.push("deposit-config.service must handle usdtWithdrawNetworkFeeUsdt");
}
if (!cfgSvc.includes("krwWithdrawFeeKrw")) {
  fails.push("deposit-config.service must handle krwWithdrawFeeKrw");
}
if (!cfgSvc.includes("deposit_config_audit")) {
  fails.push("deposit-config PATCH must write deposit_config_audit");
}
if (!cfgSvc.includes("DEPOSIT_CONFIG_UPDATED")) {
  fails.push("deposit-config PATCH must emit DEPOSIT_CONFIG_UPDATED toast code");
}

const events = read("services/api-nest/src/wallet/wallet.events.ts");
if (!events.includes("wallet.deposit_config.updated")) {
  fails.push("WALLET_EVENTS must include wallet.deposit_config.updated");
}

const routes = read("services/api-nest/src/wallet/wallet.routes.ts");
if (!routes.includes("wallet/deposit-config")) {
  fails.push("WALLET_ADMIN_ROUTES.depositConfig missing");
}

const controller = read(
  "services/api-nest/src/wallet/deposit-config.admin.controller.ts",
);
if (!controller.includes('@Controller("admin")')) {
  fails.push('DepositConfigAdminController must be @Controller("admin")');
}
if (!controller.includes("@Patch") || !controller.includes("@Get")) {
  fails.push("deposit-config admin must expose GET+PATCH");
}

const appMod = read("services/api-nest/src/app.module.ts");
if (!appMod.includes("WalletModule")) {
  fails.push("AppModule must import WalletModule");
}

const types = read("services/api-nest/src/ledger/ledger.types.ts");
if (!types.includes('FEE_REVENUE: "SYS:FEE_REVENUE"')) {
  fails.push("ledger.types must lock SYS:FEE_REVENUE");
}
if (!types.includes('"fee"')) {
  fails.push("JOURNAL_TYPES must include fee");
}

const mig = read(
  "supabase/migrations/20260808234957_deposit_config_fee_min_holding.sql",
);
if (!mig.includes("withdraw_fee_usdt")) {
  fails.push("migration must add withdraw_intents.withdraw_fee_usdt");
}
if (!mig.includes("deposit_config_audit")) {
  fails.push("migration must create deposit_config_audit");
}

const adminRoutes = read("apps/admin/routes.ts");
if (!adminRoutes.includes("/admin/wallet?tab=deposit-settings")) {
  fails.push("Admin routes must include deposit-settings tab");
}

// wallet-service folder forbidden
if (fs.existsSync(path.join(root, "services/wallet-service"))) {
  fails.push("services/wallet-service forbidden · use api-nest wallet module");
}

if (fails.length) {
  console.error("[verify:withdraw-fee-ledger] FAIL");
  for (const f of fails) console.error(" -", f);
  process.exit(1);
}
console.log(
  `[verify:withdraw-fee-ledger][${EVIDENCE_CLASS}] PASS (fee schema/source wiring · runtime ledger posting=NOT_RUN · deposit-settings contract)`,
);
