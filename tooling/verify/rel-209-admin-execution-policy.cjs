/**
 * verify:rel-209-admin-execution-policy — GET/PUT live wire, no UI-only toggles
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

const page = read("apps/admin/app/admin/execution-policy/page.tsx");
const ctrl = read(
  "services/api-nest/src/execution-policy/execution-policy.admin.controller.ts",
);
const guard = read("services/api-nest/src/common/admin-guard.selftest.ts");

if (page.includes("Admin §9.1.1 골격") && !page.includes("adminGet")) {
  fails.push("execution-policy must not stay stub-only");
}
for (const needle of [
  "/api/v1/admin/execution-policy",
  "/api/v1/admin/execution-policy/stats/today",
  "adminGet",
  "adminSend",
  '"PUT"',
  "changeReason",
  'data-field="matchStrictness"',
  'data-soft-sec="60"',
  'data-hard-sec="90"',
  'data-forbid="successRatePercent"',
  'data-kpi="observedSuccessRate"',
  "매칭 성공 조절",
]) {
  if (!page.includes(needle)) fails.push(`execution-policy missing ${needle}`);
}
if (/type=["']range["']/.test(page) && /success/i.test(page)) {
  fails.push("execution-policy must not expose success rate slider");
}
if (/name=["']successRatePercent["']/.test(page)) {
  fails.push("execution-policy must not name successRatePercent input");
}
if (page.includes("readOnly") && page.includes("near-miss-cap") && /readOnly\s*\n/.test(page)) {
  fails.push("near-miss cap must be writable through Admin PUT");
}
if (/observedSuccessRate\s*\|\|\s*0|observedSuccessRate\s*\?\?\s*0/.test(page)) {
  fails.push("execution-policy must not coerce missing rate to 0");
}

if (!/@UseGuards\(AdminGuard\)/.test(ctrl)) {
  fails.push("execution-policy.admin.controller must use AdminGuard");
}
if (!ctrl.includes("successRatePercent FORBIDDEN")) {
  fails.push("controller must reject successRatePercent");
}
if (!guard.includes("user JWT -> 401 on admin route")) {
  fails.push("admin-guard.selftest must keep user JWT 401 EXIT_GATE");
}

if (fails.length) {
  console.error("[verify:rel-209-admin-execution-policy] FAIL");
  for (const f of fails) console.error(" -", f);
  process.exit(1);
}
console.log("[verify:rel-209-admin-execution-policy] PASS");
