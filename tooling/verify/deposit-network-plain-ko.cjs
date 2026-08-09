/**
 * verify:deposit-network-plain-ko — Money §41.6
 * 입금 USDT 탭 네트워크 한글 경고 100% · TRC20 유저 surface 렌더 0
 * wrong-chain → /me/support?category=deposit · Admin wallet?tab=disputes
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
      ent.name === "coverage"
    ) {
      continue;
    }
    const p = path.join(dir, ent.name);
    if (ent.isDirectory()) walk(p, onFile);
    else onFile(p);
  }
}

const files = [
  "packages/ui/copy/ko/wallet.ts",
  "packages/ui/components/wallet/NetworkPlainWarning.tsx",
  "packages/ui/canon/surfaces/wallet-deposit.wire.json",
  "apps/web/app/wallet/deposit/page.tsx",
  "apps/web/app/wallet/withdraw/usdt/page.tsx",
  "apps/web/app/me/guide/get-usdt/page.tsx",
  "apps/web/app/me/support/page.tsx",
  "apps/admin/app/admin/wallet/page.tsx",
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
  "apps/admin/routes.ts",
];
for (const f of files) mustExist(f);

// --- copy SSOT ---
const walletCopy = read("packages/ui/copy/ko/wallet.ts");
for (const key of [
  "networkWarning",
  "networkWarningLine2",
  "networkWarningDetail",
  "networkWarningWrongSent",
  "networkName",
  "withdrawNetworkHint",
  "supportWrongChainTitle",
]) {
  if (!walletCopy.includes(key)) {
    fails.push(`T.wallet missing key: ${key}`);
  }
}
for (const needle of ["트론", "테더(USDT)", "잘못 보냈어요"]) {
  if (!walletCopy.includes(needle)) {
    fails.push(`T.wallet must include plain-ko: ${needle}`);
  }
}
if (/\bTRC20\b/.test(walletCopy)) {
  fails.push("T.wallet must not contain TRC20 (user copy)");
}

const idx = read("packages/ui/copy/ko/index.ts");
if (!idx.includes('from "./wallet"') && !idx.includes("from './wallet'")) {
  fails.push("copy/ko/index.ts must import wallet");
}
if (!idx.includes("  wallet,")) {
  fails.push("T root must export wallet (§41.6 T.wallet.networkWarning)");
}

// --- NetworkPlainWarning ---
const warn = read("packages/ui/components/wallet/NetworkPlainWarning.tsx");
for (const needle of [
  'data-testid="network-plain-warning"',
  "T.wallet.networkWarning",
  "/me/guide/get-usdt",
  "/me/support?category=deposit",
  "wrong_chain",
  "T.wallet.networkName",
]) {
  if (!warn.includes(needle)) {
    fails.push(`NetworkPlainWarning missing: ${needle}`);
  }
}
if (/\bTRC20\b/.test(warn)) {
  fails.push("NetworkPlainWarning must not render TRC20");
}

// --- deposit USDT tab ---
const depositPage = read("apps/web/app/wallet/deposit/page.tsx");
for (const needle of [
  "NetworkPlainWarning",
  'data-testid="deposit-usdt-network-block"',
  'tab === "usdt"',
  "T.wallet",
]) {
  if (!depositPage.includes(needle)) {
    fails.push(`deposit page missing: ${needle}`);
  }
}
if (/\bTRC20\b/.test(depositPage)) {
  fails.push("deposit page must not render TRC20");
}

// --- withdraw network label ---
const withdrawUsdt = read("apps/web/app/wallet/withdraw/usdt/page.tsx");
if (!withdrawUsdt.includes("T.wallet.withdrawNetworkHint")) {
  fails.push("USDT withdraw must show T.wallet.withdrawNetworkHint (트론)");
}
if (!withdrawUsdt.includes('data-testid="withdraw-network-hint"')) {
  fails.push("USDT withdraw missing withdraw-network-hint");
}
if (/\bTRC20\b/.test(withdrawUsdt)) {
  fails.push("USDT withdraw page must not render TRC20");
}

// --- guide + support ---
const guide = read("apps/web/app/me/guide/get-usdt/page.tsx");
if (!guide.includes("GetUsdtGuide") && !guide.includes("NetworkPlainWarning")) {
  fails.push("/me/guide/get-usdt must mount GetUsdtGuide (or NetworkPlainWarning)");
}
if (/\bTRC20\b|\bERC20\b|\bBEP20\b/.test(guide)) {
  fails.push("get-usdt guide must not render TRC20/ERC20/BEP20");
}
const getUsdtGuide = read("packages/ui/components/trust/GetUsdtGuide.tsx");
if (!getUsdtGuide.includes("NetworkPlainWarning")) {
  fails.push("GetUsdtGuide must reuse NetworkPlainWarning");
}
if (/\bTRC20\b|\bERC20\b|\bBEP20\b/.test(getUsdtGuide)) {
  fails.push("GetUsdtGuide must not render TRC20/ERC20/BEP20");
}
const getUsdtWire = path.join(
  root,
  "packages/ui/canon/surfaces/get-usdt-guide.wire.json",
);
if (!fs.existsSync(getUsdtWire)) {
  fails.push("missing: packages/ui/canon/surfaces/get-usdt-guide.wire.json");
} else {
  const gw = JSON.parse(fs.readFileSync(getUsdtWire, "utf8"));
  if (gw.route !== "/me/guide/get-usdt") {
    fails.push("get-usdt-guide.wire route must be /me/guide/get-usdt");
  }
  if (!(gw.forbidden || []).includes("trc20_user_render")) {
    fails.push("get-usdt-guide.wire must forbid trc20_user_render");
  }
}

const support = read("apps/web/app/me/support/page.tsx");
for (const needle of [
  'category=deposit',
  "wrong_chain",
  "/api/v1/wallet/deposit-disputes",
  "DEPOSIT_DISPUTE_SUBMITTED",
]) {
  if (!support.includes(needle)) {
    fails.push(`support page missing wrong-chain wiring: ${needle}`);
  }
}

// --- admin disputes ---
const adminWallet = read("apps/admin/app/admin/wallet/page.tsx");
for (const needle of [
  'tab=disputes',
  'data-testid="wallet-disputes-panel"',
  "/api/v1/admin/wallet/deposit-disputes",
  "credit",
  "reject",
  'data-audit-required="true"',
]) {
  if (!adminWallet.includes(needle)) {
    fails.push(`admin wallet disputes missing: ${needle}`);
  }
}
const adminRoutes = read("apps/admin/routes.ts");
if (!adminRoutes.includes('"/admin/wallet?tab=disputes"')) {
  fails.push("ADMIN_CHILD_ROUTES must keep /admin/wallet?tab=disputes");
}

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

// --- canon ---
const wire = JSON.parse(
  read("packages/ui/canon/surfaces/wallet-deposit.wire.json"),
);
const warnBlock = (wire.blocks || []).find((b) => b.id === "networkWarning");
if (!warnBlock) {
  fails.push("wallet-deposit.wire must include networkWarning block");
} else {
  if (warnBlock.component !== "NetworkPlainWarning") {
    fails.push("networkWarning block must use NetworkPlainWarning");
  }
  if (warnBlock.tab !== "usdt") {
    fails.push("networkWarning must be usdt-tab scoped");
  }
  if (!(warnBlock.copyKeys || []).includes("T.wallet.networkWarning")) {
    fails.push("wire must reference T.wallet.networkWarning");
  }
}
if (!(wire.forbidden || []).includes("trc20_user_render")) {
  fails.push("wallet-deposit.wire must forbid trc20_user_render");
}

// --- user surface TRC20 scan (apps/web + packages/ui copy/components) ---
const userRoots = [
  path.join(root, "packages/ui/copy/ko"),
  path.join(root, "packages/ui/components"),
  path.join(root, "apps/web/app"),
];
const bannedUser = /\bTRC20\b|\bERC20\b|\bBEP20\b/;
for (const dir of userRoots) {
  walk(dir, (file) => {
    if (!/\.(tsx?|ts|jsx|js)$/.test(file)) return;
    const text = fs.readFileSync(file, "utf8");
    if (bannedUser.test(text)) {
      const rel = path.relative(root, file).replace(/\\/g, "/");
      fails.push(`user surface must not render network jargon: ${rel}`);
    }
  });
}

if (fails.length) {
  console.error("[verify:deposit-network-plain-ko] FAIL");
  for (const f of fails) console.error(" -", f);
  process.exit(1);
}

console.log(
  "[verify:deposit-network-plain-ko] PASS (§41.6 트론 경고 · TRC20 유저0 · wrong-chain→CS+disputes)",
);
