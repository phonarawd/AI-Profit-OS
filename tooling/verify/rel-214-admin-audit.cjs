/**
 * verify:rel-214-admin-audit — existing domain audits, no invented rows
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

const page = read("apps/admin/app/admin/audit/page.tsx");
const spec = read("governance/admin/control-plane-superset.md");
const guard = read("services/api-nest/src/common/admin-guard.selftest.ts");
const pkg = read("package.json");
const catalog = read("tooling/verify/CATALOG.md");

if (page.includes("Admin §9.1.1 골격") && !page.includes("adminGet")) {
  fails.push("audit must not stay stub-only");
}

for (const needle of [
  'data-testid="admin-audit"',
  "/api/v1/admin/audit",
  "/api/v1/admin/system-control/reserve/audit",
  "/api/v1/admin/execution-policy/audit",
  "/api/v1/admin/wallet/deposit-config/audit",
  "/api/v1/admin/growth/referral/program/audit",
  "adminGet",
  "불러오는 중",
  "기록 없음",
  'data-forbid="audit-delete"',
  'data-forbid="fake-audit-row"',
  "AdminTruth",
  "AdminFetchNote",
  "[REDACTED]",
]) {
  if (!page.includes(needle)) fails.push(`audit page missing ${needle}`);
}

if (page.includes("adminSend") || /method:\s*["']DELETE["']/.test(page)) {
  fails.push("audit must not delete or mutate logs");
}
if (page.includes("/api/v1/admin/ai-logs")) {
  fails.push("audit must not consume AI logs as domain audit");
}
if (/DEMO_AUDIT|FAKE_AUDIT|mockAudit|sampleRows\s*=/.test(page)) {
  fails.push("audit must not invent rows");
}
if (
  /service_role|sk-[A-Za-z0-9]{8}|Authorization:|Set-Cookie|refresh_token/.test(
    page,
  )
) {
  fails.push("audit must not render secrets/tokens");
}
if (!spec.includes("/admin/audit")) {
  fails.push("REL-400 spec must still own audit contract");
}
if (!guard.includes("user JWT -> 401 on admin route")) {
  fails.push("admin-guard.selftest must keep user JWT 401 EXIT_GATE");
}
if (!pkg.includes("verify:rel-214-admin-audit")) {
  fails.push("package.json missing verify:rel-214-admin-audit");
}
if (!catalog.includes("rel-214-admin-audit")) {
  fails.push("CATALOG.md missing rel-214-admin-audit");
}

if (fails.length) {
  console.error("[verify:rel-214-admin-audit] FAIL");
  for (const f of fails) console.error(" -", f);
  process.exit(1);
}
console.log("[verify:rel-214-admin-audit] PASS");
