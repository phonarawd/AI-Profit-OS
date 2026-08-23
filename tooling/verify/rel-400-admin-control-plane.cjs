/**
 * verify:rel-400-admin-control-plane
 * Spec-only: document exists, 3-mode locked, implementation mix-in 0.
 */
const fs = require("fs");
const path = require("path");
const root = path.resolve(__dirname, "../..");
const fails = [];

function read(rel) {
  const p = path.join(root, rel);
  if (!fs.existsSync(p)) {
    fails.push("missing: " + rel);
    return "";
  }
  return fs.readFileSync(p, "utf8");
}

const spec = read("governance/admin/control-plane-superset.md");
const pkg = read("package.json");
const catalog = read("tooling/verify/CATALOG.md");
const systemPage = read("apps/admin/app/admin/system-control/page.tsx");
const auditPage = read("apps/admin/app/admin/audit/page.tsx");

for (const n of [
  "IMPLEMENTATION_IN_THIS_REL: 0",
  "PROTECTED_SCOPE_MUTATION: false",
  "USER_APP_ADMIN_IA: FORBIDDEN",
  "USER_JWT_ADMIN_200: FAIL",
  "AUDIT_DELETE_UI: FORBIDDEN",
  "LIVE",
  "DRY_RUN",
  "SIMULATION",
  "preview",
  "confirm",
  "/admin/system-control",
  "/admin/audit",
  "admin-rbac.v1.json",
  "GLOBAL_OPPORTUNITY_PAUSE",
  "money_circuit",
  "push_kill",
  "REL-213",
  "REL-214",
  "REL-405",
  "REL-406",
  "REL-222",
  "ADMIN_TOP_LEVEL_COUNT = 12",
  "/admin/audit?tab=rbac",
]) {
  if (spec.includes(n) === false) fails.push("spec missing " + n);
}

if (!pkg.includes("verify:rel-400-admin-control-plane")) {
  fails.push("package.json missing verify:rel-400-admin-control-plane");
}
if (!catalog.includes("rel-400-admin-control-plane")) {
  fails.push("CATALOG missing rel-400-admin-control-plane");
}

if (systemPage.includes("adminGet")) {
  fails.push("REL-400 must not live-wire system-control");
}
if (auditPage.includes("adminGet")) {
  fails.push("REL-400 must not live-wire audit");
}

const webAdmin = path.join(root, "apps/web/app/admin");
if (fs.existsSync(webAdmin)) {
  fails.push("apps/web must not grow /admin");
}

if (fails.length) {
  console.error("[verify:rel-400-admin-control-plane] FAIL");
  for (const f of fails) console.error(" -", f);
  process.exit(1);
}
console.log("[verify:rel-400-admin-control-plane] PASS");
