/**
 * verify:rel-217-admin-growth
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

const page = read("apps/admin/app/admin/growth/page.tsx");
for (const n of [
  'data-testid="admin-growth-page"',
  "tab=simulation",
  "tab=referral",
  '"deposit"',
  '"ticker"',
  '"whale"',
  '"content"',
  "adminGet",
  "/api/v1/admin/simulation/latest",
  "/api/v1/admin/growth/referral/program",
  "AdminFetchNote",
  'data-invite-cap-ui="0"',
  "이 탭의 운영 목록 API가 없습니다.",
]) if (!page.includes(n)) fails.push("growth missing " + n);
if (page.includes("골격") && page.includes("Admin §35.6")) fails.push("growth leftover stub chrome");

if (fails.length) {
  console.error("[verify:rel-217-admin-growth] FAIL");
  for (const f of fails) console.error(" -", f);
  process.exit(1);
}
console.log("[verify:rel-217-admin-growth] PASS");
