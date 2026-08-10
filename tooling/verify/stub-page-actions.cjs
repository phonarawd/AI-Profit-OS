/**
 * verify:stub-page-actions — UI PART9i
 * deposit 주소 GET·복사 · KYC multipart submit · support wrong-chain POST
 * withdraw ≠ 본 게이트 (PART9f2)
 */
const fs = require("fs");
const path = require("path");

const root = path.resolve(__dirname, "../..");
const fails = [];

function read(rel) {
  const p = path.join(root, rel);
  if (!fs.existsSync(p)) {
    fails.push(`missing: ${rel}`);
    return "";
  }
  return fs.readFileSync(p, "utf8");
}

const deposit = read("apps/web/app/wallet/deposit/page.tsx");
const kyc = read("apps/web/app/me/kyc/page.tsx");
const support = read("apps/web/app/me/support/page.tsx");
const kycFlow = read("packages/ui/components/kyc/KycFlow.tsx");

// --- deposit address live ---
if (!deposit.includes("/api/v1/wallet/my-deposit-address")) {
  fails.push("deposit page must GET /api/v1/wallet/my-deposit-address");
}
if (!deposit.includes("trc20Address")) {
  fails.push("deposit page must read trc20Address from API");
}
if (!deposit.includes("navigator.clipboard") && !deposit.includes("clipboard.writeText")) {
  fails.push("deposit page must copy address via clipboard");
}
if (!deposit.includes("deposit-address-copy")) {
  fails.push("deposit page must keep deposit-address-copy testid");
}
if (deposit.includes("filled by GET /api/v1/wallet/my-deposit-address")) {
  fails.push("deposit address stub comment must be removed (live wire)");
}

// --- KYC multipart ---
if (!kyc.includes("/api/v1/compliance/kyc/submit")) {
  fails.push("kyc page must POST /api/v1/compliance/kyc/submit");
}
if (!kyc.includes("FormData") || !kyc.includes("idDoc")) {
  fails.push("kyc page must multipart FormData with idDoc field");
}
if (!kyc.includes("phoneE164")) {
  fails.push("kyc page must send phoneE164 (API contract)");
}
if (!kycFlow.includes("idDocFile") || !kycFlow.includes("selfieFile")) {
  fails.push("KycFlow payload must carry File for multipart (PART9i)");
}

// --- support wrong-chain ---
if (!support.includes("/api/v1/wallet/deposit-disputes")) {
  fails.push("support must target POST /api/v1/wallet/deposit-disputes");
}
if (!support.includes("method: \"POST\"") && !support.includes("method: 'POST'")) {
  fails.push("support wrong-chain must fetch POST (not local-only success)");
}
if (!support.includes("idempotencyKey")) {
  fails.push("support POST must include idempotencyKey");
}
if (!support.includes("linkedTxHash") && !support.includes("txHash")) {
  fails.push("support POST must send linkedTxHash or txHash");
}
// false success: setSubmitted(true) without fetch was the pre-9i bug
if (
  /onClick=\{\(\) => setSubmitted\(true\)\}/.test(support) ||
  /onClick=\{\(\) => \{\s*setSubmitted\(true\);\s*\}\}/.test(support)
) {
  fails.push("support must not mark submitted without network POST");
}

if (fails.length) {
  console.error("[verify:stub-page-actions] FAIL\n- " + fails.join("\n- "));
  process.exit(1);
}
console.log(
  "[verify:stub-page-actions] PASS — deposit address · KYC multipart · support dispute POST",
);
