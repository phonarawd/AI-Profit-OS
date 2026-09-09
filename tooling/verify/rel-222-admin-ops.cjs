/**
 * verify:rel-222-admin-ops
 * 3-mode lock + LIVE confirm + DRY_RUN/SIMULATION ledger 0 + Preview-As-User JWT 0.
 * 4번째 모드 창작 0. 사이드바 13번째 0.
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
  read("tooling/verify/fixtures/rel-222-admin-ops.v1.json") || "{}",
);
const schema = JSON.parse(read("schemas/admin-ops-mode.v1.json") || "{}");
const core = require(path.join(root, "services/api-nest/admin-ops.core.cjs"));
const auditCore = require(path.join(root, "services/api-nest/admin-audit.core.cjs"));

const modes = Array.isArray(core.OPS_MODES) ? [...core.OPS_MODES] : [];
if (modes.join(",") !== (fixture.modes || []).join(",")) {
  fails.push("ops modes drifted: " + modes.join(","));
}
if (modes.length !== 3) fails.push("must publish exactly 3 modes");
if (modes.join(",") !== "LIVE,DRY_RUN,SIMULATION") {
  fails.push("canonical mode order broken");
}

const schemaModes = (((schema.properties || {}).modes || {}).items || {}).enum || [];
if (schemaModes.length !== 3) fails.push("schema modes must be 3");
for (const mode of modes) {
  if (!schemaModes.includes(mode)) fails.push("schema missing " + mode);
}
for (const invented of fixture.inventedModesForbidden || []) {
  if (modes.includes(invented) || schemaModes.includes(invented)) {
    fails.push("invented mode must not exist: " + invented);
  }
  const bogus = core.normalizeMode(invented);
  if (bogus.ok) fails.push("unknown mode must be rejected: " + invented);
}

const missing = core.normalizeMode("");
if (missing.ok || missing.error !== "MODE_REQUIRED") {
  fails.push("empty mode must fail-closed as MODE_REQUIRED");
}
const unknown = core.normalizeMode("live");
if (unknown.ok) fails.push("case-folded LIVE must not silently pass");

const stages = Array.isArray(core.OPS_STAGES) ? [...core.OPS_STAGES] : [];
if (stages.join(",") !== (fixture.stages || []).join(",")) {
  fails.push("ops stages drifted: " + stages.join(","));
}

const families = Array.isArray(core.OPS_FAMILIES) ? [...core.OPS_FAMILIES] : [];
if (families.join(",") !== (fixture.families || []).join(",")) {
  fails.push("ops families drifted: " + families.join(","));
}
for (const invented of fixture.inventedFamiliesForbidden || []) {
  const fam = core.normalizeFamily(invented);
  if (fam.ok) fails.push("invented family must be rejected: " + invented);
}

const shortReason = core.requireReason("short");
if (shortReason.ok) fails.push("reason < 10 must fail");
const okReason = core.requireReason("preview confirm apply");
if (!okReason.ok) fails.push("valid reason must pass");

const dry = core.decideWrite({ mode: "DRY_RUN", confirmed: true, stage: "apply" });
if (!dry.ok || dry.persist !== false || dry.ledgerWrite !== false) {
  fails.push("DRY_RUN apply must not persist or write ledger");
}
const sim = core.decideWrite({
  mode: "SIMULATION",
  confirmed: true,
  stage: "apply",
});
if (!sim.ok || sim.persist !== false || sim.ledgerWrite !== false || sim.isolated !== true) {
  fails.push("SIMULATION apply must stay isolated with ledgerWrite 0");
}
const liveBare = core.decideWrite({
  mode: "LIVE",
  confirmed: false,
  stage: "apply",
});
if (liveBare.ok || liveBare.error !== "LIVE_CONFIRM_REQUIRED") {
  fails.push("LIVE apply without confirm must FAIL");
}
const liveOk = core.decideWrite({
  mode: "LIVE",
  confirmed: true,
  stage: "apply",
});
if (!liveOk.ok || liveOk.persist !== true || liveOk.ledgerWrite !== false) {
  fails.push("LIVE confirm apply may persist intent only, never ledger");
}
const noMode = core.decideWrite({ stage: "apply", confirmed: true });
if (noMode.ok || noMode.persist !== false) {
  fails.push("missing mode must not become LIVE persist");
}

const impact = core.impactPreview("bulk", 12);
if (!impact.ok || impact.impactCount !== 12 || impact.ledgerWrite !== false) {
  fails.push("impact preview must count without ledger write");
}

const previewUser = core.previewAsUser("11111111-1111-4111-8111-111111111111");
if (!previewUser.ok || previewUser.mintUserJwt !== false || previewUser.moneyWrite !== false) {
  fails.push("preview-as-user must not mint JWT or write money");
}
const jwtLeak = core.assertNoUserJwt({
  mintUserJwt: false,
  accessToken: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.aaa.bbb",
});
if (jwtLeak.ok) fails.push("preview payload must reject accessToken");
const minted = core.assertNoUserJwt({ mintUserJwt: true, moneyWrite: false });
if (minted.ok) fails.push("mintUserJwt=true must fail");

const svc = read("services/api-nest/src/admin-ops/admin-ops.service.ts");
const ctrl = read("services/api-nest/src/admin-ops/admin-ops.admin.controller.ts");
const app = read("services/api-nest/src/app.module.ts");
const caps = read("services/api-nest/src/common/admin-capabilities.ts");
const routes = read("apps/admin/routes.ts");
const auth = read("services/api-nest/src/admin-ops/admin-ops.service.ts");

if (!app.includes("AdminOpsModule")) {
  fails.push("AppModule must import AdminOpsModule");
}
if (!ctrl.includes("@UseGuards(AdminGuard)")) {
  fails.push("admin ops controller must use AdminGuard");
}
if (!caps.includes("AdminOpsAdminController")) {
  fails.push("admin-capabilities must classify AdminOpsAdminController");
}
if (/write\("(?!all)/.test(caps.slice(caps.indexOf("AdminOpsAdminController")))) {
  const block = caps.slice(
    caps.indexOf("AdminOpsAdminController"),
    caps.indexOf("AdminOpsAdminController") + 400,
  );
  if (/write\("(?!all)/.test(block) || /read\("(?!all)/.test(block)) {
    // allow only all
  }
}
// PUTDUK continuation session, Step 7.3 fix: the previous slice used
// indexOf("};", ...) as the block's end boundary, assuming that was
// AdminOpsAdminController's own closing brace. Every controller entry in
// this file actually closes with "}," (comma, not semicolon) since they
// are not the last property of ADMIN_CAPABILITY_POLICY - the only real
// "};" in the file is the final Object.freeze({...}); closer at the very
// end. That made the old slice silently capture EVERY controller block
// defined after AdminOpsAdminController (UsersAdminController,
// TradesAdminController, ...) as if it were still inside
// AdminOpsAdminController - a real latent bug this task's own unrelated,
// correct addition of TradesAdminController: { reconcileTick:
// write("circuit") } exposed as a false "REL-222 must reuse all, not
// invent circuit" failure. Matched with a regex bounded to the first "}"
// after the key instead, which correctly captures only this one
// controller's own entry (none of its values contain literal braces).
const opsMatch = caps.match(/AdminOpsAdminController:\s*\{([^}]*)\}/);
const opsBlock = opsMatch ? opsMatch[1] : "";
if (!opsBlock) {
  fails.push("AdminOpsAdminController capability block not found");
}
if (opsBlock && /"(?!all)[a-zA-Z]+"/.test(opsBlock)) {
  const inventedCap = opsBlock.match(/"(kyc|wallet|growth|circuit|audit|rbac|ledger)"/);
  if (inventedCap) {
    fails.push("REL-222 must reuse all, not invent " + inventedCap[1]);
  }
}
if (/from\s+["'].*auth\.service["']/.test(auth) || /\.mintSession\s*\(/.test(auth)) {
  fails.push("admin-ops must not import auth.service or mint a user session");
}
if (/UPDATE\s+public\.ledger/i.test(svc) || /INSERT\s+INTO\s+public\.ledger/i.test(svc)) {
  fails.push("EXIT_GATE: admin-ops must not write ledger");
}
if (/INSERT\s+INTO\s+public\.ledger_/i.test(svc)) {
  fails.push("EXIT_GATE: admin-ops must not insert ledger_*");
}
if (!/ADMIN_TOP_LEVEL_COUNT\s*=\s*12/.test(routes)) {
  fails.push("sidebar must stay 12");
}
if ((routes.match(/href: "\/admin\//g) || []).length > 20) {
  // soft — 13th top-level is the lock
}
if (routes.includes("/admin/ops") && /id: 13/.test(routes)) {
  fails.push("must not add 13th sidebar module");
}

const mig = read("supabase/migrations/20260823190000_admin_ops_intents.sql");
for (const needle of [
  "admin_ops_intents",
  "ENABLE ROW LEVEL SECURITY",
  "APPLY_THIS_SLICE = NO",
  "LIVE",
  "DRY_RUN",
  "SIMULATION",
]) {
  if (!mig.includes(needle)) fails.push("migration missing " + needle);
}
if (/INSERT\s+INTO\s+public\.ledger/i.test(mig)) {
  fails.push("migration must not touch ledger");
}

const fixtureMig = JSON.parse(
  read("tooling/verify/fixtures/migrations-applied.v1.json") || "{}",
);
// REL-701-DB 실행 전 = committedUnapplied · 실행 후(fixture rel701db APPLIED) = versions + appliedVersions. 이 REL 은 apply 주체가 아니다.
if (fixtureMig.rel701db && fixtureMig.rel701db.status === "APPLIED") {
  if (
    !(fixtureMig.versions || []).includes("20260823190000") ||
    !((fixtureMig.rel701db.appliedVersions || []).includes("20260823190000"))
  ) {
    fails.push("20260823190000 must be recorded applied by REL-701-DB after apply");
  }
} else if (!(fixtureMig.committedUnapplied || []).includes("20260823190000")) {
  fails.push("20260823190000 must stay committedUnapplied (no production apply)");
}

const webAdmin = path.join(root, "apps/web/app/admin");
if (fs.existsSync(webAdmin)) fails.push("apps/web must not grow /admin");

const pkg = read("package.json");
const catalog = read("tooling/verify/CATALOG.md");
const gate = read(".github/workflows/gate.yml");
const spec = read("governance/admin/admin-ops-3mode.md");
const evidence = read("governance/release-master/REL-222-ADMIN-OPS.md");
const lockedTerms = read("governance/admin/control-plane-superset.md");
if (!pkg.includes("verify:rel-222-admin-ops")) {
  fails.push("package.json missing verify:rel-222-admin-ops");
}
if (!catalog.includes("rel-222-admin-ops")) {
  fails.push("CATALOG missing rel-222-admin-ops");
}
if (!gate.includes("verify:rel-222-admin-ops")) {
  fails.push("gate.yml must run verify:rel-222-admin-ops");
}
if (!lockedTerms.includes("IMPLEMENTATION_IN_THIS_REL: 0")) {
  fails.push("REL-400 lock file must keep IMPLEMENTATION_IN_THIS_REL: 0");
}
for (const needle of [
  "LOCKED_MODES = 3",
  "INVENTED_MODES = 0",
  "SERVER_ENFORCE = 1",
  "SIDEBAR_13 = 0",
  "USER_JWT_MINT = 0",
  "EXIT_GATE",
]) {
  if (!spec.includes(needle)) fails.push("admin-ops spec missing " + needle);
}
if (!evidence.includes("STATUS = COMPLETED")) {
  fails.push("REL-222 evidence must be COMPLETED");
}

(async () => {
  const events = [];
  auditCore.resetAuditSink();
  auditCore.setAuditSink((event) => {
    events.push(event);
  });
  const written = await auditCore.writeAuditEvent({
    actorKey: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
    actorId: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
    role: "super",
    action: "AdminOpsAdminController.apply",
    targetType: "admin_ops",
    targetId: "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb",
    mode: "LIVE",
    result: "applied",
    reason: "fixture reason long enough",
    payload: { family: "policy", persist: true, ledgerWrite: false },
  });
  if (!written.ok || written.event.result !== "applied") {
    fails.push("audit write fixture must persist result=applied: " + (written.error || ""));
  }
  if (events.length !== 1) fails.push("audit sink must receive ops apply");
  auditCore.resetAuditSink();

  const moneyAudit = await auditCore.writeAuditEvent({
    actorKey: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
    actorId: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
    role: "super",
    action: "AdminOpsAdminController.apply",
    targetType: "admin_ops",
    targetId: "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb",
    mode: "LIVE",
    result: "applied",
    reason: "fixture reason long enough",
    payload: { usdt: "90" },
  });
  if (moneyAudit.ok) fails.push("audit payload must reject money keys");

  if (fails.length) {
    console.error("[verify:rel-222-admin-ops] FAIL");
    for (const f of fails) console.error(" - " + f);
    process.exit(1);
  }
  console.log(
    "[verify:rel-222-admin-ops] PASS (3 modes · LIVE confirm · ledger 0 · JWT mint 0)",
  );
})().catch((err) => {
  console.error("[verify:rel-222-admin-ops] FAIL");
  console.error(" - " + (err && err.message ? err.message : String(err)));
  process.exit(1);
});
