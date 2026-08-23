/**
 * verify:rel-216-admin-financial
 */
const fs = require("fs");
const path = require("path");
const root = path.resolve(__dirname, "../..");
const fails = [];
function read(rel) {
  const p = path.join(root, rel);
  if (!fs.existsSync(p)) { fails.push("missing: " + rel); return ""; }
  return fs.readFileSync(p, "utf8");
}

const page = read("apps/admin/app/admin/reports/financial/page.tsx");
const ctl = read("services/api-nest/src/ledger/ledger.admin.controller.ts");
if (page.includes("골격") && !page.includes("adminGet")) fails.push("financial stub-only");
for (const n of [
  'data-testid="admin-financial-page"',
  "/api/v1/admin/reports/financial",
  "adminGet",
  "AdminFetchNote",
  "표시할 기간이 없습니다.",
]) if (!page.includes(n)) fails.push("financial missing " + n);
if (/depositUsdt\s*\+|withdrawUsdt\s*\+|reduce\(/.test(page)) fails.push("financial must not sum on client");
if (!ctl.includes("@UseGuards(AdminGuard)")) fails.push("ledger controller must keep AdminGuard");
if (!ctl.includes("financialReport")) fails.push("financialReport route required");

if (fails.length) {
  console.error("[verify:rel-216-admin-financial] FAIL");
  for (const f of fails) console.error(" -", f);
  process.exit(1);
}
console.log("[verify:rel-216-admin-financial] PASS");
