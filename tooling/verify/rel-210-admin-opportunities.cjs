/**
 * verify:rel-210-admin-opportunities
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

const page = read("apps/admin/app/admin/opportunities/page.tsx");
const ctl = read("services/api-nest/src/opportunities/opportunities.admin.controller.ts");
for (const n of [
  'data-testid="admin-opportunities-page"',
  "/api/v1/admin/opportunities",
  "/api/v1/admin/opportunities/assets",
  "adminGet",
  "AdminFetchNote",
  "tab=assets",
  'data-capital-band="whale"',
  "해당 기회가 없습니다.",
  "상품 마스터 항목이 없습니다.",
]) if (!page.includes(n)) fails.push("opportunities missing " + n);
if (!ctl.includes("@UseGuards(AdminGuard)")) fails.push("opportunities controller must keep AdminGuard");
if (page.includes("fakeLedger") || page.includes('principalUsdt="0"')) fails.push("opportunities money fake");

if (fails.length) {
  console.error("[verify:rel-210-admin-opportunities] FAIL");
  for (const f of fails) console.error(" -", f);
  process.exit(1);
}
console.log("[verify:rel-210-admin-opportunities] PASS");
