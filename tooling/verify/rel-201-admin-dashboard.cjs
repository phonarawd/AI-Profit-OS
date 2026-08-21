/**
 * verify:rel-201-admin-dashboard — /admin live ops tiles
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

const page = read("apps/admin/app/admin/page.tsx");
const api = read("apps/admin/lib/admin-api.ts");
const truth = read("apps/admin/lib/admin-truth.ts");
const session = read("apps/admin/lib/admin-session.ts");

if (page.includes("Admin §9.1.1 골격") && !page.includes("adminGet")) {
  fails.push("dashboard must not stay stub-only");
}
for (const needle of [
  'data-metric="user-count"',
  'data-truth="unavailable"',
  "/api/v1/admin/system-control/push",
  "/api/v1/admin/risk/circuit",
  "/api/v1/admin/risk/queue",
  "adminGet",
  "확인할 수 없음",
]) {
  if (!page.includes(needle)) fails.push(`dashboard missing ${needle}`);
}
if (/ROAS|todayPossible|fake/i.test(page)) {
  fails.push("dashboard must not invent growth/ROAS/fake money");
}
if (page.includes('principalUsdt="0"')) {
  fails.push("dashboard must not hardcode money 0");
}

for (const needle of ["unauthorized", "forbidden", "not_found", "unavailable"]) {
  if (!api.includes(needle)) fails.push(`admin-api missing ${needle}`);
}
if (!truth.includes("missing ≠ 0") && !truth.includes("missing")) {
  fails.push("admin-truth must refuse missing→0");
}
if (session.includes("console.log") || session.includes("console.info")) {
  fails.push("admin-session must not log token");
}

if (fails.length) {
  console.error("[verify:rel-201-admin-dashboard] FAIL");
  for (const f of fails) console.error(" -", f);
  process.exit(1);
}
console.log("[verify:rel-201-admin-dashboard] PASS");
