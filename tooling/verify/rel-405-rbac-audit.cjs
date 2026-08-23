/**
 * verify:rel-405-rbac-audit
 * 5역할 lock + audit schema/write + deny fixture + 서버 가드.
 * 역할 6·7·8 창작 0. UI만 있고 서버 없으면 EXIT_GATE FAIL.
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

function mustInclude(rel, needle, label) {
  const text = read(rel);
  if (text && !text.includes(needle)) {
    fails.push((label || rel) + " missing " + needle);
  }
}

const fixture = JSON.parse(
  read("tooling/verify/fixtures/rel-405-rbac-audit.v1.json") || "{}",
);
const rbac = JSON.parse(read("schemas/admin-rbac.v1.json") || "{}");
const auditSchema = JSON.parse(read("schemas/admin-audit.v1.json") || "{}");
const core = require(path.join(root, "services/api-nest/admin-audit.core.cjs"));

const locked = Array.isArray(fixture.lockedRoles) ? fixture.lockedRoles : [];
const roles = core.lockedAdminRoles(rbac);
if (roles.length !== 5) {
  fails.push("admin-rbac must keep exactly 5 roles, got " + roles.length);
}
if (roles.join(",") !== locked.join(",")) {
  fails.push("admin-rbac role ids drifted: " + roles.join(","));
}
for (const invented of fixture.inventedRolesForbidden || []) {
  if (roles.includes(invented)) {
    fails.push("invented role must not exist: " + invented);
  }
  const enumIds = (((rbac.properties || {}).roles || {}).items || {}).properties || {};
  const idEnum = ((enumIds.id || {}).enum) || [];
  if (idEnum.includes(invented)) {
    fails.push("schema enum must not add " + invented);
  }
}

const byId = Object.fromEntries(
  (rbac.default && rbac.default.roles ? rbac.default.roles : []).map((r) => [
    r.id,
    r.capabilities || {},
  ]),
);
for (const [role, level] of Object.entries(fixture.auditCapability || {})) {
  if ((byId[role] || {}).audit !== level) {
    fails.push("role " + role + " audit must be " + level);
  }
}

if (!core.roleAllowsFromSchema(rbac, "super", "audit", "read")) {
  fails.push("super must read audit");
}
if (!core.roleAllowsFromSchema(rbac, "finance", "audit", "read")) {
  fails.push("finance must read audit");
}
if (core.roleAllowsFromSchema(rbac, "marketing", "audit", "read")) {
  fails.push("marketing must be denied audit:read");
}
if (core.roleAllowsFromSchema(rbac, "marketing", "audit", "write")) {
  fails.push("marketing must be denied audit:write");
}

const results = (auditSchema.properties && auditSchema.properties.result) || {};
for (const item of ["preview", "applied", "denied", "rolled_back"]) {
  if (!Array.isArray(results.enum) || !results.enum.includes(item)) {
    fails.push("admin-audit schema missing result " + item);
  }
}

const events = [];
core.resetAuditSink();
core.setAuditSink((event) => {
  events.push(event);
});

const denied = core.buildDeniedEvent({
  actorKey: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
  actorId: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
  role: "marketing",
  action: fixture.denyAction,
  targetType: "admin_route",
  targetId: fixture.denyAction,
  reason: fixture.denyReason,
});

(async () => {
  const written = await core.writeAuditEvent(denied);
  if (!written.ok || written.event.result !== "denied") {
    fails.push("audit write fixture must persist result=denied");
  }
  if (events.length !== 1 || events[0].result !== "denied") {
    fails.push("deny fixture sink must receive one denied event");
  }
  if ((events[0] || {}).role !== "marketing") {
    fails.push("deny fixture must record marketing role");
  }

  const forbidden = await core.writeAuditEvent({
    ...denied,
    payload: { token: "eyJhbGciOiJub25lIn0.e30.x" },
  });
  if (forbidden.ok) {
    fails.push("audit write must reject token/PII fields");
  }

  core.resetAuditSink();

  const mig = read("supabase/migrations/20260823160000_admin_audit_events.sql");
  for (const needle of [
    "admin_audit_events",
    "append-only",
    "ENABLE ROW LEVEL SECURITY",
    "BEFORE UPDATE OR DELETE",
    "REVOKE ALL",
  ]) {
    if (!mig.includes(needle)) fails.push("migration missing " + needle);
  }

  const ctrl = read(
    "services/api-nest/src/audit/audit-events.admin.controller.ts",
  );
  if (/@Delete\b/.test(ctrl) || /\bdelete\s*\(/.test(ctrl)) {
    fails.push("audit controller must not expose delete");
  }
  mustInclude(
    "services/api-nest/src/audit/audit-events.admin.controller.ts",
    "@UseGuards(AdminGuard)",
    "audit controller",
  );
  mustInclude(
    "services/api-nest/src/common/admin-capabilities.ts",
    "AuditEventsAdminController",
    "capability table",
  );
  mustInclude(
    "services/api-nest/src/common/admin-capabilities.ts",
    'read("audit")',
    "capability table",
  );
  mustInclude(
    "services/api-nest/src/common/admin.guard.ts",
    "buildDeniedEvent",
    "admin.guard",
  );
  mustInclude(
    "services/api-nest/src/common/admin.guard.ts",
    "ADMIN_CAPABILITY_DENIED",
    "admin.guard",
  );
  mustInclude(
    "services/api-nest/src/app.module.ts",
    "AdminAuditModule",
    "app.module",
  );

  const ui = path.join(root, "apps/admin/app/admin/audit/page.tsx");
  const serverReady =
    fs.existsSync(
      path.join(root, "services/api-nest/src/audit/audit-events.admin.controller.ts"),
    ) &&
    fs.existsSync(path.join(root, "services/api-nest/admin-audit.core.cjs")) &&
    fs.existsSync(
      path.join(root, "supabase/migrations/20260823160000_admin_audit_events.sql"),
    );
  if (fs.existsSync(ui) && !serverReady) {
    fails.push("EXIT_GATE: UI only — server RBAC/audit missing");
  }
  if (!serverReady) fails.push("EXIT_GATE: server audit foundation missing");

  const webAdmin = path.join(root, "apps/web/app/admin");
  if (fs.existsSync(webAdmin)) {
    fails.push("apps/web must not grow /admin");
  }

  const pkg = read("package.json");
  const catalog = read("tooling/verify/CATALOG.md");
  const gate = read(".github/workflows/gate.yml");
  const spec = read("governance/admin/rbac-audit-foundation.md");
  const evidence = read("governance/release-master/REL-405-RBAC-AUDIT.md");
  if (!pkg.includes("verify:rel-405-rbac-audit")) {
    fails.push("package.json missing verify:rel-405-rbac-audit");
  }
  if (!catalog.includes("rel-405-rbac-audit")) {
    fails.push("CATALOG missing rel-405-rbac-audit");
  }
  if (!gate.includes("verify:rel-405-rbac-audit")) {
    fails.push("gate.yml must run verify:rel-405-rbac-audit");
  }
  for (const needle of [
    "LOCKED_ROLES = 5",
    "INVENTED_ROLES = 0",
    "AUDIT_DELETE = 0",
    "EXIT_GATE",
  ]) {
    if (!spec.includes(needle)) fails.push("foundation spec missing " + needle);
  }
  if (!evidence.includes("STATUS = COMPLETED")) {
    fails.push("REL-405 evidence must be COMPLETED");
  }
  if (!evidence.includes("INVENTED_ROLES = 0")) {
    fails.push("evidence must keep INVENTED_ROLES = 0");
  }

  if (fails.length) {
    console.error("[verify:rel-405-rbac-audit] FAIL");
    for (const f of fails) console.error(" - " + f);
    process.exit(1);
  }
  console.log(
    "[verify:rel-405-rbac-audit] PASS (5-role lock · deny+write fixture · server guard)",
  );
})().catch((err) => {
  console.error("[verify:rel-405-rbac-audit] FAIL");
  console.error(" - " + (err && err.message ? err.message : String(err)));
  process.exit(1);
});
