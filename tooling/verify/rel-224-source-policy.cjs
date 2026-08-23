/**
 * verify:rel-224-source-policy
 * V1/V2/V3 history + overwrite 0 + founder HIGH + health missing≠HEALTHY.
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

const fixture = JSON.parse(
  read("tooling/verify/fixtures/rel-224-source-policy.v1.json") || "{}",
);
const schema = JSON.parse(read("schemas/admin-policy-version.v1.json") || "{}");
const core = require(
  path.join(root, "services/api-nest/admin-policy-version.core.cjs"),
);
const auditCore = require(path.join(root, "services/api-nest/admin-audit.core.cjs"));

const labels = Array.isArray(core.VERSION_LABELS) ? [...core.VERSION_LABELS] : [];
if (labels.join(",") !== (fixture.labels || []).join(",")) {
  fails.push("version labels drifted: " + labels.join(","));
}
if (labels.join(",") !== "V1,V2,V3") fails.push("canonical labels broken");

const keys = Array.isArray(core.POLICY_KEYS) ? [...core.POLICY_KEYS] : [];
if (keys.join(",") !== (fixture.policyKeys || []).join(",")) {
  fails.push("policy keys drifted: " + keys.join(","));
}

const schemaLabels =
  (((schema.properties || {}).labels || {}).items || {}).enum || [];
if (schemaLabels.length !== 3) fails.push("schema labels must be 3");

for (const invented of fixture.inventedLabelsForbidden || []) {
  const got = core.normalizeLabel(invented);
  if (got.ok) fails.push("invented label must fail: " + invented);
}

const overwrite = core.publishVersion(["V1"], "V1");
if (overwrite.ok || overwrite.error !== "OVERWRITE_FORBIDDEN") {
  fails.push("existing label publish must be OVERWRITE_FORBIDDEN");
}
const skip = core.publishVersion(["V1"], "V3");
if (skip.ok || skip.error !== "VERSION_ORDER") {
  fails.push("V3 after V1 only must be VERSION_ORDER");
}
const v2 = core.publishVersion(["V1"], "V2");
if (!v2.ok || v2.label !== "V2") fails.push("V2 after V1 must pass");
const cap = core.publishVersion(["V1", "V2", "V3"], "V1");
if (cap.ok) fails.push("fourth publish must fail");

const rbMissing = core.rollbackHead(["V1"], "V2");
if (rbMissing.ok) fails.push("rollback to missing version must fail");
const rbOk = core.rollbackHead(["V1", "V2"], "V1");
if (!rbOk.ok || rbOk.versionsUntouched !== true) {
  fails.push("rollback must move head and leave versions untouched");
}

const founderCs = core.requireFounder("cs", "HIGH");
if (founderCs.ok) fails.push("non-super founder override must fail");
const founderLow = core.requireFounder("super", "NORMAL");
if (founderLow.ok) fails.push("founder override without HIGH must fail");
const founderOk = core.requireFounder("super", "HIGH");
if (!founderOk.ok) fails.push("super + HIGH must pass");

const missingHealth = core.projectHealth(null);
if (!missingHealth.ok || missingHealth.status !== null || missingHealth.filledHealthy) {
  fails.push("missing health must not become HEALTHY");
}
const badHealth = core.projectHealth("GREEN");
if (badHealth.ok) fails.push("invented health status must fail");
const money = core.assertNoMoney({ usdt: "1" });
if (money.ok) fails.push("policy payload must reject money keys");

const svc = read("services/api-nest/src/source-policy/source-policy.service.ts");
const ctrl = read(
  "services/api-nest/src/source-policy/source-policy.admin.controller.ts",
);
const app = read("services/api-nest/src/app.module.ts");
const caps = read("services/api-nest/src/common/admin-capabilities.ts");
const routes = read("apps/admin/routes.ts");

if (!app.includes("SourcePolicyModule")) {
  fails.push("AppModule must import SourcePolicyModule");
}
if (!ctrl.includes("@UseGuards(AdminGuard)")) {
  fails.push("source-policy controller must use AdminGuard");
}
if (!caps.includes("SourcePolicyAdminController")) {
  fails.push("admin-capabilities must classify SourcePolicyAdminController");
}
if (!svc.includes("ProviderHealthService")) {
  fails.push("health must reuse ProviderHealthService");
}
if (/UPDATE\s+public\.admin_policy_versions/i.test(svc)) {
  fails.push("EXIT_GATE: service must not UPDATE version rows");
}
if (/UPDATE\s+public\.ledger/i.test(svc)) {
  fails.push("source-policy must not write ledger");
}
if (!/ADMIN_TOP_LEVEL_COUNT\s*=\s*12/.test(routes)) {
  fails.push("sidebar must stay 12");
}
if (/id: 13/.test(routes)) fails.push("must not add 13th sidebar module");

const mig = read("supabase/migrations/20260823210000_admin_policy_versions.sql");
for (const needle of [
  "admin_policy_versions",
  "admin_policy_heads",
  "ENABLE ROW LEVEL SECURITY",
  "APPLY_THIS_SLICE = NO",
  "overwrite forbidden",
  "BEFORE UPDATE OR DELETE",
]) {
  if (!mig.includes(needle)) fails.push("migration missing " + needle);
}

const fixtureMig = JSON.parse(
  read("tooling/verify/fixtures/migrations-applied.v1.json") || "{}",
);
if (!(fixtureMig.committedUnapplied || []).includes("20260823210000")) {
  fails.push("20260823210000 must stay committedUnapplied");
}

const webAdmin = path.join(root, "apps/web/app/admin");
if (fs.existsSync(webAdmin)) fails.push("apps/web must not grow /admin");

const pkg = read("package.json");
const catalog = read("tooling/verify/CATALOG.md");
const gate = read(".github/workflows/gate.yml");
const spec = read("governance/admin/source-policy-version.md");
const evidence = read("governance/release-master/REL-224-SOURCE-POLICY.md");
if (!pkg.includes("verify:rel-224-source-policy")) {
  fails.push("package.json missing verify:rel-224-source-policy");
}
if (!catalog.includes("rel-224-source-policy")) {
  fails.push("CATALOG missing rel-224-source-policy");
}
if (!gate.includes("verify:rel-224-source-policy")) {
  fails.push("gate.yml must run verify:rel-224-source-policy");
}
for (const needle of [
  "LOCKED_LABELS = 3",
  "OVERWRITE = 0",
  "FOUNDER_ROLE = super",
  "FOUNDER_SEVERITY = HIGH",
  "EXIT_GATE",
]) {
  if (!spec.includes(needle)) fails.push("source-policy spec missing " + needle);
}
if (!evidence.includes("STATUS = COMPLETED")) {
  fails.push("REL-224 evidence must be COMPLETED");
}

(async () => {
  const events = [];
  auditCore.resetAuditSink();
  auditCore.setAuditSink((event) => events.push(event));
  const written = await auditCore.writeAuditEvent({
    actorKey: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
    actorId: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
    role: "super",
    action: "SourcePolicyAdminController.founderOverride",
    targetType: "policy_version",
    targetId: "founder_override:V1",
    mode: "LIVE",
    result: "applied",
    reason: "fixture reason long enough",
    payload: { policyKey: "founder_override", label: "V1", severity: "HIGH" },
  });
  if (!written.ok) {
    fails.push("founder override audit must write: " + (written.error || ""));
  }
  if (events.length !== 1) fails.push("audit sink must receive founder override");
  auditCore.resetAuditSink();

  if (fails.length) {
    console.error("[verify:rel-224-source-policy] FAIL");
    for (const f of fails) console.error(" - " + f);
    process.exit(1);
  }
  console.log(
    "[verify:rel-224-source-policy] PASS (V1-V3 · overwrite 0 · founder HIGH)",
  );
})().catch((err) => {
  console.error("[verify:rel-224-source-policy] FAIL");
  console.error(" - " + (err && err.message ? err.message : String(err)));
  process.exit(1);
});
