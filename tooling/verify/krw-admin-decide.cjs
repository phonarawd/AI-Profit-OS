/**
 * verify:krw-admin-decide — Money §41.3 · §43.3
 * approve → deposit_krw credit 1회 · reject → credit 0 · toast keys · PG사0 · CSV≠Day-1
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
  "schemas/krw-deposit-request.v1.json",
  "schemas/user-deposit-address.v1.json",
  "schemas/toast-codes.v1.json",
  "services/api-nest/src/wallet/krw-deposit.service.ts",
  "services/api-nest/src/wallet/krw-deposit.admin.controller.ts",
  "services/api-nest/src/wallet/deposit-address.service.ts",
  "services/api-nest/src/wallet/wallet.controller.ts",
  "services/api-nest/src/wallet/tron-address.ts",
  "services/api-nest/src/wallet/wallet.routes.ts",
  "services/api-nest/src/wallet/wallet.events.ts",
  "services/api-nest/src/wallet/wallet.module.ts",
  "services/api-nest/src/wallet/wallet.types.ts",
  "supabase/migrations/20260808205848_wallet_deposit_withdraw.sql",
  "apps/admin/routes.ts",
];
for (const f of files) mustExist(f);

const toast = read("schemas/toast-codes.v1.json");
for (const code of [
  "KRW_DEPOSIT_SUBMITTED",
  "KRW_DEPOSIT_APPROVED",
  "KRW_DEPOSIT_REJECTED",
  "KRW_DEPOSIT_EXPIRED",
]) {
  if (!toast.includes(`"${code}"`)) {
    fails.push(`toast-codes missing ${code}`);
  }
}

const schema = JSON.parse(read("schemas/krw-deposit-request.v1.json"));
for (const st of ["pending", "approved", "rejected", "expired"]) {
  if (!(schema.properties?.status?.enum || []).includes(st)) {
    fails.push(`krw-deposit-request status enum missing ${st}`);
  }
}
if (!(schema.required || []).includes("payableAmountKrw")) {
  fails.push("payableAmountKrw must be required");
}

const addrSchema = JSON.parse(read("schemas/user-deposit-address.v1.json"));
if (!(addrSchema.required || []).includes("trc20Address")) {
  fails.push("user-deposit-address must require trc20Address");
}

const svc = read("services/api-nest/src/wallet/krw-deposit.service.ts");
for (const needle of [
  'journalType: "deposit_krw"',
  "SYS:OPS_POOL",
  'bucket: "principal"',
  "KRW_DEPOSIT_APPROVED",
  "KRW_DEPOSIT_REJECTED",
  "admin.krw_deposit.approved",
  "admin.krw_deposit.rejected",
  "krw_deposit_approve:",
  "KRW_REJECT_REASON_MIN",
  "KRW_DEPOSIT_TTL_MIN",
  "payableAmountKrw",
  "uniqueSuffixKrw",
  "ledgerCredit: false",
]) {
  if (!svc.includes(needle)) {
    fails.push(`krw-deposit.service missing: ${needle}`);
  }
}

// reject path must not call postJournal
const rejectFn = svc.match(/async reject\([\s\S]*?\n  async /);
if (rejectFn && /postJournal/.test(rejectFn[0])) {
  fails.push("reject() must not call postJournal (credit 0)");
}
if (!svc.includes("async reject(")) {
  fails.push("krw-deposit.service must expose reject()");
}
// ensure reject body has no postJournal between reject and next method
const rejectStart = svc.indexOf("async reject(");
const approveStart = svc.indexOf("async approve(");
if (rejectStart < 0 || approveStart < 0) {
  fails.push("approve/reject methods required");
} else {
  const rejectBody = svc.slice(rejectStart, svc.indexOf("\n  async ", rejectStart + 1));
  if (/postJournal/.test(rejectBody)) {
    fails.push("reject() must not postJournal");
  }
  const approveBody = svc.slice(
    approveStart,
    svc.indexOf("\n  async ", approveStart + 1),
  );
  if (!/postJournal/.test(approveBody)) {
    fails.push("approve() must call postJournal for credit");
  }
  if (!/deposit_krw/.test(approveBody)) {
    fails.push("approve() must use journalType deposit_krw");
  }
}

const adminCtrl = read(
  "services/api-nest/src/wallet/krw-deposit.admin.controller.ts",
);
if (!adminCtrl.includes('@Controller("admin")')) {
  fails.push('KrwDepositAdminController must be @Controller("admin")');
}
if (!adminCtrl.includes("WALLET_ADMIN_ROUTES.krwDepositApprove")) {
  fails.push("admin controller must bind krwDepositApprove");
}
if (!adminCtrl.includes("WALLET_ADMIN_ROUTES.krwDepositReject")) {
  fails.push("admin controller must bind krwDepositReject");
}
if (!adminCtrl.includes("@Post") || !adminCtrl.includes("@Get")) {
  fails.push("admin KRW controller must expose GET list + POST decide");
}
if (/@tosspayments|portone|iamport|inicis|nicepay|paypal/i.test(adminCtrl)) {
  fails.push("admin KRW controller must not import PG사 SDK");
}
if (/csv.?upload|krw-csv/i.test(adminCtrl)) {
  fails.push("admin KRW controller must not expose CSV upload (L2+ only)");
}
if (!/L2\+/.test(adminCtrl)) {
  fails.push("admin KRW controller must document CSV Auto-Recon = L2+");
}

const userCtrl = read("services/api-nest/src/wallet/wallet.controller.ts");
if (!userCtrl.includes("WALLET_USER_ROUTES.myDepositAddress")) {
  fails.push("user wallet must bind myDepositAddress");
}
if (!userCtrl.includes("WALLET_USER_ROUTES.krwDepositRequests")) {
  fails.push("user wallet must bind krwDepositRequests");
}
if (!userCtrl.includes('@Controller("wallet")')) {
  fails.push('WalletController must be @Controller("wallet")');
}

const addrSvc = read("services/api-nest/src/wallet/deposit-address.service.ts");
for (const needle of [
  "user_deposit_addresses",
  "derivation_index",
  "trc20_address",
  "deriveTrc20Address",
  "getOrCreate",
]) {
  if (!addrSvc.includes(needle)) {
    fails.push(`deposit-address.service missing: ${needle}`);
  }
}

const tron = read("services/api-nest/src/wallet/tron-address.ts");
if (!tron.includes("m/44'/195'/0'/0/")) {
  fails.push("tron-address must lock HD path m/44'/195'/0'/0/{index}");
}
if (!tron.includes("0x41") && !tron.includes("[0x41]")) {
  fails.push("tron-address must use Tron 0x41 prefix");
}

const events = read("services/api-nest/src/wallet/wallet.events.ts");
for (const ev of [
  "wallet.krw_deposit.pending",
  "wallet.krw_deposit.approved",
  "wallet.krw_deposit.rejected",
]) {
  if (!events.includes(ev)) {
    fails.push(`WALLET_EVENTS missing ${ev}`);
  }
}

const routes = read("services/api-nest/src/wallet/wallet.routes.ts");
if (!routes.includes("krw-deposits/:id/approve")) {
  fails.push("WALLET_ADMIN_ROUTES must include krw-deposits approve");
}
if (!routes.includes("my-deposit-address")) {
  fails.push("WALLET_USER_ROUTES must include my-deposit-address");
}

const mod = read("services/api-nest/src/wallet/wallet.module.ts");
if (!mod.includes("KrwDepositAdminController")) {
  fails.push("WalletModule must register KrwDepositAdminController");
}
if (!mod.includes("WalletController")) {
  fails.push("WalletModule must register WalletController");
}
if (!mod.includes("LedgerModule")) {
  fails.push("WalletModule must import LedgerModule for posting");
}

const types = read("services/api-nest/src/wallet/wallet.types.ts");
if (!types.includes("KRW_DEPOSIT_TTL_MIN = 120")) {
  fails.push("Day-1 KRW TTL must be 120 minutes");
}
if (!types.includes("KRW_REJECT_REASON_MIN = 10")) {
  fails.push("reject reason minLength must be 10");
}

const mig = read(
  "supabase/migrations/20260808205848_wallet_deposit_withdraw.sql",
);
if (!mig.includes("user_deposit_addresses")) {
  fails.push("migration must create user_deposit_addresses");
}
if (!mig.includes("krw_deposit_requests")) {
  fails.push("migration must create krw_deposit_requests");
}
if (!mig.includes("krw_deposit_requests_active_payable_uq")) {
  fails.push("migration must UNIQUE active payable_amount_krw");
}

const adminRoutes = read("apps/admin/routes.ts");
if (!adminRoutes.includes("/admin/wallet?tab=krw-pending")) {
  fails.push("Admin routes must include krw-pending tab");
}

// Day-1 forbidden: CSV Auto-Recon as default path in Money wallet services
const walletDir = path.join(root, "services/api-nest/src/wallet");
for (const name of fs.readdirSync(walletDir)) {
  if (!/\.(ts|tsx)$/.test(name)) continue;
  const t = fs.readFileSync(path.join(walletDir, name), "utf8");
  if (/@tosspayments|portone|iamport|inicis|nicepay|paypal/i.test(t)) {
    fails.push(`PG사 SDK reference in wallet/${name}`);
  }
  if (/csv.?upload|auto.?recon.?day.?1|krw-csv/i.test(t) && !/L2\+/.test(t)) {
    fails.push(
      `wallet/${name}: CSV/Auto-Recon must be marked L2+ only (not Day-1)`,
    );
  }
}

if (fs.existsSync(path.join(root, "services/wallet-service"))) {
  fails.push("services/wallet-service forbidden · use api-nest wallet module");
}

if (fails.length) {
  console.error("[verify:krw-admin-decide] FAIL");
  for (const f of fails) console.error(" -", f);
  process.exit(1);
}
console.log(
  "[verify:krw-admin-decide] PASS (TRC20 address · KRW approve credit1 / reject0 · PG사0 · CSV=L2+)",
);
