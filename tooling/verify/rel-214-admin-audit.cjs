/**
 * verify:rel-214-admin-audit
 * Honest empty until REL-405 classifies a list. Delete UI 0. No new Nest API.
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

const page = read("apps/admin/app/admin/audit/page.tsx");
const routes = read("apps/admin/routes.ts");
const spec = read("governance/admin/control-plane-superset.md");
const pkg = read("package.json");

if (page.includes("골격")) fails.push("audit leftover stub chrome");
if (/adminSend/.test(page)) fails.push("audit must stay read-only");
if (/\/api\/v1\/admin\/audit/.test(page)) {
  fails.push("audit must not invent a list API");
}

for (const n of [
  'data-testid="admin-audit-page"',
  'data-testid="audit-empty-records"',
  'data-testid="audit-empty-rbac"',
  'data-forbid="audit_delete"',
  "/admin/audit?tab=rbac",
  "tab=rbac",
]) {
  if (page.includes(n) === false) fails.push("audit missing " + n);
}

for (const banned of [
  "delete log",
  "wipe",
  "fakeLedger",
  "principalUsdt",
  "role_6",
  "role_7",
  "role_8",
]) {
  if (page.includes(banned)) fails.push("audit banned " + banned);
}

if (!routes.includes('"/admin/audit?tab=rbac"')) {
  fails.push("routes missing reserved /admin/audit?tab=rbac");
}
if (!routes.includes("ADMIN_TOP_LEVEL_COUNT = 12")) {
  fails.push("sidebar must stay 12");
}
if (routes.includes('href: "/admin/rbac"')) {
  fails.push("must not add 13th sidebar /admin/rbac");
}

if (!spec.includes("AUDIT_DELETE_UI: FORBIDDEN")) {
  fails.push("control-plane spec must keep delete forbidden");
}

const nestAdmin = path.join(root, "services/api-nest/src");
function walk(dir, acc) {
  for (const name of fs.readdirSync(dir)) {
    const p = path.join(dir, name);
    if (fs.statSync(p).isDirectory()) walk(p, acc);
    else if (name.endsWith(".admin.controller.ts")) acc.push(p);
  }
}
const controllers = [];
walk(nestAdmin, controllers);
const extra = controllers.filter((p) =>
  /audit\.admin\.controller\.ts$/.test(p.replace(/\\/g, "/")),
);
if (extra.length) fails.push("must not add AuditAdminController in REL-214");

if (!pkg.includes("verify:rel-214-admin-audit")) {
  fails.push("package.json missing verify:rel-214-admin-audit");
}

if (fails.length) {
  console.error("[verify:rel-214-admin-audit] FAIL");
  for (const f of fails) console.error(" -", f);
  process.exit(1);
}
console.log("[verify:rel-214-admin-audit] PASS");
