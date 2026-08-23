/**
 * verify:rel-212-admin-support
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

const page = read("apps/admin/app/admin/support/page.tsx");
const ctl = read("services/api-nest/src/wallet/deposit-dispute.admin.controller.ts");
if (page.includes("골격") && !page.includes("adminGet")) fails.push("support stub-only");
for (const n of [
  'data-testid="admin-support-page"',
  "tab=queue",
  "/api/v1/admin/wallet/deposit-disputes",
  "adminGet",
  "adminSend",
  "AdminFetchNote",
  "10",
  "대기 중인 고객센터 건이 없습니다.",
]) if (!page.includes(n)) fails.push("support missing " + n);
if (!ctl.includes("@UseGuards(AdminGuard)")) fails.push("dispute controller must keep AdminGuard");
if (page.includes("updatedByAdminId") || page.includes("fakeLedger")) fails.push("support banned field");

if (fails.length) {
  console.error("[verify:rel-212-admin-support] FAIL");
  for (const f of fails) console.error(" -", f);
  process.exit(1);
}
console.log("[verify:rel-212-admin-support] PASS");
