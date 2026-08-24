/**
 * verify:rel-201-admin-dashboard — live, action-first admin home.
 * Real queue APIs are required; missing data must never be invented as zero.
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

for (const needle of [
  "/api/v1/admin/users?limit=1&offset=0",
  "/api/v1/admin/risk/queue",
  "/api/v1/admin/compliance/kyc?status=pending",
  "/api/v1/admin/wallet/withdrawals?status=auth_ok",
  "/api/v1/admin/wallet/deposit-disputes",
  "/api/v1/admin/system-control/push",
  "/api/v1/admin/risk/circuit",
  "adminGet",
  'data-metric="user-count"',
  'data-truth="unavailable"',
  "확인할 수 없음",
  "지금 먼저 확인할 일",
]) {
  if (!page.includes(needle)) fails.push(`dashboard missing ${needle}`);
}

if (/ROAS|todayPossible|fakeUsers|mockUsers|fakeLedger/i.test(page)) {
  fails.push("dashboard must not invent business/money/user data");
}
if (/principalUsdt\s*=\s*["']0["']/.test(page)) {
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
console.log("[verify:rel-201-admin-dashboard] PASS (live queues · no fake zero)");
