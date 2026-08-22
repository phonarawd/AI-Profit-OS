/**
 * verify:rel-216-admin-financial-report — ledger financial report live wire
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

const page = read("apps/admin/app/admin/reports/financial/page.tsx");
const ctrl = read("services/api-nest/src/ledger/ledger.admin.controller.ts");
const svc = read("services/api-nest/src/ledger/ledger.admin.service.ts");
const guard = read("services/api-nest/src/common/admin-guard.selftest.ts");

if (page.includes("Admin §9.1.1 골격") && !page.includes("adminGet")) {
  fails.push("financial report must not stay stub-only");
}
for (const needle of [
  'data-testid="admin-financial-report"',
  'data-testid="financial-report-panel"',
  "/api/v1/admin/reports/financial",
  "adminGet",
  "AdminTruth",
  'data-forbid="fake-financial-truth"',
  'data-field="settledProfitUsdt"',
  'data-field="expectedProfitUsdt"',
  "settlementUserProfitUsdt",
]) {
  if (!page.includes(needle)) fails.push(`financial missing ${needle}`);
}
if (!page.includes("asRecordList") && !page.includes("buckets.length === 0")) {
  fails.push("financial must render honest empty, not invented rows");
}
if (
  /expectedProfitUsdt\s*=\s*["']0["']/.test(page) ||
  /settledProfitUsdt\s*=\s*["']0["']/.test(page) ||
  /FAKE_FINANCE|mockRevenue|REVENUE_FIXTURE/.test(page)
) {
  fails.push("financial must not invent revenue/profit truth");
}
if (
  /expectedProfitUsdt\s*\|\|\s*0|settlementUserProfitUsdt\s*\?\?\s*0/.test(page)
) {
  fails.push("financial must not coerce missing money to 0");
}
if (page.includes("reduce(") && page.includes("depositUsdt")) {
  fails.push("financial must not sum ledger buckets client-side");
}
if (page.includes("service_role") || page.includes("withdrawPin")) {
  fails.push("financial must not render secrets");
}

if (!ctrl.includes("financialReport")) {
  fails.push("ledger.admin.controller must expose financialReport");
}
if (!/@UseGuards\(AdminGuard\)/.test(ctrl)) {
  fails.push("ledger.admin.controller must use AdminGuard");
}
if (!svc.includes("settlement_user_profit_usdt")) {
  fails.push("financialReport owner must stay on ledger journals");
}
if (!guard.includes("user JWT -> 401 on admin route")) {
  fails.push("admin-guard.selftest must keep user JWT 401 EXIT_GATE");
}

if (fails.length) {
  console.error("[verify:rel-216-admin-financial-report] FAIL");
  for (const f of fails) console.error(" -", f);
  process.exit(1);
}
console.log("[verify:rel-216-admin-financial-report] PASS");
