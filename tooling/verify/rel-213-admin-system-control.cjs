/**
 * verify:rel-213-admin-system-control — real owners, no fake switches
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

const page = read("apps/admin/app/admin/system-control/page.tsx");
const spec = read("governance/admin/control-plane-superset.md");
const pushCtrl = read("services/api-nest/src/push/push-kill.admin.controller.ts");
const reserveCtrl = read(
  "services/api-nest/src/simulation/platform-reserve.admin.controller.ts",
);
const riskCtrl = read("services/api-nest/src/risk/risk.admin.controller.ts");
const guard = read("services/api-nest/src/common/admin-guard.selftest.ts");
const pkg = read("package.json");
const catalog = read("tooling/verify/CATALOG.md");

if (page.includes("Admin §9.1.1 골격") && !page.includes("adminGet")) {
  fails.push("system-control must not stay stub-only");
}

for (const needle of [
  'data-testid="admin-system-control"',
  "/admin/system-control?tab=",
  "/api/v1/admin/system-control/push",
  "/api/v1/admin/risk/circuit",
  "/api/v1/admin/system-control/reserve",
  "/api/v1/admin/system-control/reserve/audit",
  "/api/v1/admin/system-control/switches",
  "adminGet",
  "adminSend",
  "window.confirm",
  "불러오는 중",
  "기록 없음",
  'data-forbid="fake-system-state"',
  'data-forbid="money-circuit-edit"',
  'data-forbid="invented-kill-switch"',
  "AdminTruth",
  "AdminFetchNote",
]) {
  if (!page.includes(needle)) fails.push(`system-control missing ${needle}`);
}

if (page.includes("/api/v1/admin/risk/circuit/close")) {
  fails.push("system-control must not edit money circuit");
}
if (
  /GLOBAL_OPPORTUNITY_PAUSE/.test(page) &&
  /pushEnabled:\s*true|enabled:\s*true/.test(page)
) {
  fails.push("must not invent REL-406 switch state");
}
if (/DEMO_SWITCH|FAKE_SWITCH|mockSwitch/.test(page)) {
  fails.push("must not invent kill-switch rows");
}
if (page.includes("UPDATE") && page.includes("balance")) {
  fails.push("system-control must not own balance UPDATE");
}
if (
  /service_role|sk-[A-Za-z0-9]{8}|Authorization:|Set-Cookie|refresh_token/.test(
    page,
  )
) {
  fails.push("system-control must not render secrets/tokens");
}
if (!spec.includes("/admin/system-control")) {
  fails.push("REL-400 spec must still own system-control contract");
}

if (!/@UseGuards\(AdminGuard\)/.test(pushCtrl)) {
  fails.push("push-kill.admin.controller must use AdminGuard");
}
if (!/@UseGuards\(AdminGuard\)/.test(reserveCtrl)) {
  fails.push("platform-reserve.admin.controller must use AdminGuard");
}
if (!/@UseGuards\(AdminGuard\)/.test(riskCtrl)) {
  fails.push("risk.admin.controller must use AdminGuard");
}
if (!guard.includes("user JWT -> 401 on admin route")) {
  fails.push("admin-guard.selftest must keep user JWT 401 EXIT_GATE");
}
if (!pkg.includes("verify:rel-213-admin-system-control")) {
  fails.push("package.json missing verify:rel-213-admin-system-control");
}
if (!catalog.includes("rel-213-admin-system-control")) {
  fails.push("CATALOG.md missing rel-213-admin-system-control");
}

if (fails.length) {
  console.error("[verify:rel-213-admin-system-control] FAIL");
  for (const f of fails) console.error(" -", f);
  process.exit(1);
}
console.log("[verify:rel-213-admin-system-control] PASS");
