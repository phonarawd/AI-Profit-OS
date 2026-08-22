/**
 * verify:rel-207-admin-compliance — KYC queue live wire, no stub, no fake truth
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

const page = read("apps/admin/app/admin/compliance/page.tsx");
const ctrl = read("services/api-nest/src/compliance/kyc.admin.controller.ts");
const guard = read("services/api-nest/src/common/admin-guard.selftest.ts");

if (page.includes("Admin §9.1.1 골격") && !page.includes("adminGet")) {
  fails.push("compliance must not stay stub-only");
}
for (const needle of [
  'tab=kyc',
  'data-testid="compliance-kyc-panel"',
  "/api/v1/admin/compliance/kyc",
  "/approve",
  "/reject",
  "/doc-url",
  "adminGet",
  "adminSend",
  "idempotencyKey",
  'data-forbid="fake-kyc-truth"',
  "AdminTruth",
]) {
  if (!page.includes(needle)) fails.push(`compliance missing ${needle}`);
}
if (!page.includes("asRecordList") && !page.includes("items.length === 0")) {
  fails.push("compliance must render honest empty, not invented rows");
}
if (
  /kycStatus\s*=\s*["']approved["']/.test(page) ||
  /fakeApproved|mockKyc|KYC_APPROVED_FIXTURE/.test(page)
) {
  fails.push("compliance must not invent KYC approved truth");
}
if (page.includes("idDocR2Key") || page.includes("selfieR2Key")) {
  fails.push("compliance must not render R2 object keys");
}
if (page.includes("tronGridApiKey") || page.includes("service_role")) {
  fails.push("compliance must not render secrets");
}

if (!/@UseGuards\(AdminGuard\)/.test(ctrl)) {
  fails.push("kyc.admin.controller must use AdminGuard");
}
if (!guard.includes("user JWT -> 401 on admin route")) {
  fails.push("admin-guard.selftest must keep user JWT 401 EXIT_GATE");
}

if (fails.length) {
  console.error("[verify:rel-207-admin-compliance] FAIL");
  for (const f of fails) console.error(" -", f);
  process.exit(1);
}
console.log("[verify:rel-207-admin-compliance] PASS");
