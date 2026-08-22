/**
 * verify:rel-218-admin-growth-deposit — deposit growth live wire
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

const page = read("apps/admin/app/admin/growth/page.tsx");
const redir = read("apps/admin/app/admin/growth/deposit/page.tsx");
const routes = read("apps/admin/routes.ts");
const ctrl = read(
  "services/api-nest/src/wallet/krw-deposit.admin.controller.ts",
);
const ledger = read("services/api-nest/src/ledger/ledger.admin.controller.ts");
const guard = read("services/api-nest/src/common/admin-guard.selftest.ts");

if (!redir.includes('redirect("/admin/growth?tab=deposit")')) {
  fails.push("legacy /admin/growth/deposit must redirect to hub tab");
}
if (!routes.includes("GROWTH_LEGACY_REDIRECTS")) {
  fails.push("admin routes must keep GROWTH_LEGACY_REDIRECTS");
}
for (const needle of [
  'data-testid="growth-deposit-panel"',
  'data-forbid="fake-deposit-growth-truth"',
  "/api/v1/admin/wallet/krw-deposit-requests?status=pending",
  "/api/v1/admin/wallet/krw-deposit-requests?status=approved",
  "/api/v1/admin/wallet/krw-deposit-requests?status=rejected",
  "/api/v1/admin/reports/financial",
  'data-metric="deposit-conversion"',
  "adminGet",
  "AdminTruth",
]) {
  if (!page.includes(needle)) fails.push(`deposit growth missing ${needle}`);
}
if (/conversionRate\s*=\s*\d|DEPOSIT_CONVERSION_FIXTURE|fakeDepositCount/.test(page)) {
  fails.push("deposit growth must not invent conversion");
}
if (!/@UseGuards\(AdminGuard\)/.test(ctrl)) {
  fails.push("krw-deposit.admin.controller must use AdminGuard");
}
if (!ledger.includes("financialReport")) {
  fails.push("deposit growth must reuse ledger financialReport");
}
if (!guard.includes("user JWT -> 401 on admin route")) {
  fails.push("admin-guard.selftest must keep user JWT 401 EXIT_GATE");
}

if (fails.length) {
  console.error("[verify:rel-218-admin-growth-deposit] FAIL");
  for (const f of fails) console.error(" -", f);
  process.exit(1);
}
console.log("[verify:rel-218-admin-growth-deposit] PASS");
