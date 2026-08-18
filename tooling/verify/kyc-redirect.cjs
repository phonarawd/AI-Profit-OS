/**
 * verify:kyc-redirect — Money §42.2
 * withdraw tap → toast KYC_WITHDRAW_REQUIRED → /me/kyc within 1s (800ms)
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
  "apps/web/lib/use-withdraw-kyc-gate.ts",
  "apps/web/app/wallet/withdraw/page.tsx",
  "apps/web/app/wallet/withdraw/usdt/page.tsx",
  "apps/web/app/wallet/withdraw/krw/page.tsx",
  "apps/web/app/me/kyc/page.tsx",
  "packages/ui/copy/ko/kyc.ts",
  "packages/ui/canon/surfaces/kyc-guide.wire.json",
  "packages/ui/canon/surfaces/kyc-doc-capture.wire.json",
  "packages/ui/canon/surfaces/kyc-confirm.wire.json",
];
for (const f of files) mustExist(f);

const hook = read("apps/web/lib/use-withdraw-kyc-gate.ts");
for (const needle of [
  "KYC_WITHDRAW_REQUIRED",
  "T.kyc.withdrawRequired",
  "router.push",
  "/me/kyc",
  "REDIRECT_MS = 800",
  "shouldRedirectToKyc",
  "return=",
]) {
  if (!hook.includes(needle)) {
    fails.push(`use-withdraw-kyc-gate missing: ${needle}`);
  }
}
if (!/800/.test(hook)) {
  fails.push("redirect delay must be 800ms (within 1s)");
}
if (/setTimeout\([^,]+,\s*(?:[2-9]\d{3,}|\d{5,})\s*\)/.test(hook)) {
  fails.push("redirect delay must be within 1s");
}

const withdrawPages = [
  "apps/web/app/wallet/withdraw/page.tsx",
  "apps/web/app/wallet/withdraw/usdt/page.tsx",
  "apps/web/app/wallet/withdraw/krw/page.tsx",
];
for (const rel of withdrawPages) {
  const t = read(rel);
  if (!t.includes("useWithdrawKycGate")) {
    fails.push(`${rel} must use useWithdrawKycGate`);
  }
}

const meKyc = read("apps/web/app/me/kyc/page.tsx");
// T.kyc may be used on the page or via KycFlow (UI §6.4d · verify:kyc-surfaces Owns)
const usesKycCopy =
  meKyc.includes("T.kyc.pageTitle") ||
  meKyc.includes("T.kyc") ||
  meKyc.includes("KycFlow");
if (!usesKycCopy) {
  fails.push("/me/kyc must use T.kyc copy (or KycFlow)");
}
if (/rrn|주민등록번호|주민번호/i.test(meKyc)) {
  fails.push("/me/kyc must not include RRN type-in fields");
}

const copy = read("packages/ui/copy/ko/kyc.ts");
if (!copy.includes("🔐") || !copy.includes("1번만")) {
  fails.push("withdrawRequired toast must match §42.4 emoji copy");
}

for (const wire of [
  "packages/ui/canon/surfaces/kyc-guide.wire.json",
  "packages/ui/canon/surfaces/kyc-doc-capture.wire.json",
  "packages/ui/canon/surfaces/kyc-confirm.wire.json",
]) {
  const w = read(wire);
  if (!w.includes('"route": "/me/kyc"')) {
    fails.push(`${wire} must route /me/kyc`);
  }
  if (!w.includes("rrn_type_in")) {
    fails.push(`${wire} must forbid rrn_type_in`);
  }
}

const idx = read("packages/ui/copy/ko/index.ts");
if (!idx.includes("kyc")) {
  fails.push("T root must export kyc");
}

if (fails.length) {
  console.error("[verify:kyc-redirect] FAIL");
  for (const f of fails) console.error(" -", f);
  process.exit(1);
}
console.log(
  "[verify:kyc-redirect] PASS (withdraw tap → toast → /me/kyc @800ms · Canon 3면)",
);
