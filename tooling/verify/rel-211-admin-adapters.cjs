/**
 * verify:rel-211-admin-adapters
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

const page = read("apps/admin/app/admin/adapters/page.tsx");
const ctl = read("services/api-nest/src/adapters/adapters.admin.controller.ts");
for (const n of [
  'data-testid="admin-adapters-page"',
  "/api/v1/admin/adapters",
  "/api/v1/admin/adapters/matching-kpi",
  "identity-review-queue",
  "adminGet",
  "AdminFetchNote",
  'data-kpi="matching"',
  "skuMatchFailureRate",
  "신원 미매칭 검토 항목이 없습니다.",
]) if (!page.includes(n)) fails.push("adapters missing " + n);
if (/nearMissCap/.test(page)) fails.push("adapters must not own nearMissCap");
if (!ctl.includes("@UseGuards(AdminGuard)")) fails.push("adapters controller must keep AdminGuard");

if (fails.length) {
  console.error("[verify:rel-211-admin-adapters] FAIL");
  for (const f of fails) console.error(" -", f);
  process.exit(1);
}
console.log("[verify:rel-211-admin-adapters] PASS");
