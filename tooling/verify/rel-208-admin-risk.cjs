/**
 * verify:rel-208-admin-risk — queue/catalog/circuit live wire, no fake scores
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

const page = read("apps/admin/app/admin/risk/page.tsx");
const ctrl = read("services/api-nest/src/risk/risk.admin.controller.ts");
const guard = read("services/api-nest/src/common/admin-guard.selftest.ts");

if (page.includes("Admin §9.1.1 골격") && !page.includes("adminGet")) {
  fails.push("risk must not stay stub-only");
}
for (const needle of [
  'tab=queue',
  'data-testid="risk-queue-panel"',
  "/api/v1/admin/risk/queue",
  "/api/v1/admin/risk/catalog",
  "/api/v1/admin/risk/circuit",
  "/api/v1/admin/risk/users/:userId/freeze",
  "adminGet",
  "adminSend",
  "idempotencyKey",
  'data-p49-rules="P1-P24,E1-E12"',
  'data-forbid="fake-risk-truth"',
]) {
  if (!page.includes(needle)) fails.push(`risk missing ${needle}`);
}
if (/riskScore\s*[:=]\s*[0-9]|fakeRisk|mockSeverity|severity:\s*["']p0["']/.test(page)) {
  fails.push("risk must not invent scores or severity");
}
if (page.includes("principalUsdt=\"0\"") || /대기 신호.*=.*0/.test(page)) {
  fails.push("risk must not display missing as 0");
}

if (!/@UseGuards\(AdminGuard\)/.test(ctrl)) {
  fails.push("risk.admin.controller must use AdminGuard");
}
if (!guard.includes("user JWT -> 401 on admin route")) {
  fails.push("admin-guard.selftest must keep user JWT 401 EXIT_GATE");
}

if (fails.length) {
  console.error("[verify:rel-208-admin-risk] FAIL");
  for (const f of fails) console.error(" -", f);
  process.exit(1);
}
console.log("[verify:rel-208-admin-risk] PASS");
