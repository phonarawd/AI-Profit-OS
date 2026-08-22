/**
 * verify:rel-405-rbac-audit — 8 roles + mandatory audit + deny fixture
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

const schema = JSON.parse(read("schemas/admin-rbac.v1.json"));
const roles = schema.default?.roles || [];
if (roles.length !== 8) fails.push(`expected 8 roles, got ${roles.length}`);
const ids = roles.map((r) => r.id).sort();
for (const id of [
  "super",
  "finance",
  "cs",
  "risk",
  "marketing",
  "ops",
  "compliance",
  "founder",
]) {
  if (!ids.includes(id)) fails.push(`missing role ${id}`);
}
const byId = Object.fromEntries(roles.map((r) => [r.id, r]));
if (byId.super?.capabilities?.all !== "write") {
  fails.push("super must keep all=write");
}
if (byId.marketing?.capabilities?.balanceAdjust !== "none") {
  fails.push("marketing must stay none on balanceAdjust");
}
if (byId.cs?.capabilities?.userOpportunityOverride !== "read") {
  fails.push("cs userOpportunityOverride read must stay");
}

const auditSchema = read("schemas/admin-audit.v1.json");
if (!auditSchema.includes("AdminAuditV1")) fails.push("audit schema missing");

const guard = read("services/api-nest/src/common/admin.guard.ts");
if (!guard.includes("writeAdminAuditDeny")) {
  fails.push("AdminGuard must write deny audit");
}
if (!guard.includes("ADMIN_CAPABILITY_DENIED")) {
  fails.push("deny path missing");
}

const auditSvc = read("services/api-nest/src/admin-control/admin-audit.service.ts");
if (!auditSvc.includes("Actual operations only") && !auditSvc.includes("actual operation")) {
  fails.push("audit service must record actual operations");
}
if (auditSvc.includes("synthetic") && auditSvc.includes("push(") && /fake|DEMO_AUDIT/.test(auditSvc)) {
  fails.push("must not synthesize audit rows");
}

const ctrl = read(
  "services/api-nest/src/admin-control/admin-audit.admin.controller.ts",
);
if (!/@UseGuards\(AdminGuard\)/.test(ctrl)) {
  fails.push("audit controller must use AdminGuard");
}

const policy = read("services/api-nest/src/common/admin-rbac.policy.ts");
if (!policy.includes("token-supplied capability") && !policy.includes("NEVER an authorization source")) {
  fails.push("matrix remains the only permission authority");
}

const pkg = read("package.json");
const catalog = read("tooling/verify/CATALOG.md");
if (!pkg.includes("verify:rel-405-rbac-audit")) {
  fails.push("package.json missing verify:rel-405-rbac-audit");
}
if (!catalog.includes("rel-405-rbac-audit")) {
  fails.push("CATALOG.md missing rel-405-rbac-audit");
}

if (fails.length) {
  console.error("[verify:rel-405-rbac-audit] FAIL");
  for (const f of fails) console.error(" -", f);
  process.exit(1);
}
console.log("[verify:rel-405-rbac-audit] PASS");
