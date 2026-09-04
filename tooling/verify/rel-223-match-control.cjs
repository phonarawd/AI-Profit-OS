/**
 * verify:rel-223-match-control
 * 5 동사 lock + 미허용 거부 + bulk preview + LIVE preview/confirm + 잔액 API 0.
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
  read("tooling/verify/fixtures/rel-223-match-control.v1.json") || "{}",
);
const schema = JSON.parse(read("schemas/admin-match-control.v1.json") || "{}");
const core = require(path.join(root, "services/api-nest/admin-match-control.core.cjs"));
const auditCore = require(path.join(root, "services/api-nest/admin-audit.core.cjs"));

const verbs = Array.isArray(core.MATCH_VERBS) ? [...core.MATCH_VERBS] : [];
if (verbs.join(",") !== (fixture.verbs || []).join(",")) {
  fails.push("match verbs drifted: " + verbs.join(","));
}
if (verbs.length !== 5) fails.push("must publish exactly 5 verbs");
if (verbs.join(",") !== "ALLOW,BLOCK,PAUSE,CANCEL,REASSIGN") {
  fails.push("canonical verb order broken");
}

const schemaVerbs = (((schema.properties || {}).verbs || {}).items || {}).enum || [];
if (schemaVerbs.length !== 5) fails.push("schema verbs must be 5");
for (const verb of verbs) {
  if (!schemaVerbs.includes(verb)) fails.push("schema missing " + verb);
}

const kinds = Array.isArray(core.MATCH_KINDS) ? [...core.MATCH_KINDS] : [];
if (kinds.join(",") !== (fixture.kinds || []).join(",")) {
  fails.push("match kinds drifted: " + kinds.join(","));
}

for (const invented of fixture.inventedVerbsForbidden || []) {
  const got = core.normalizeVerb(invented);
  if (got.ok) fails.push("invented/forbidden verb must be rejected: " + invented);
}
for (const bad of fixture.forbiddenVerbs || []) {
  const got = core.normalizeVerb(bad);
  if (got.ok || got.error !== "MATCH_VERB_LEDGER_FORBIDDEN") {
    if (got.ok) fails.push("ledger verb must not pass: " + bad);
  }
}

const empty = core.normalizeVerb("");
if (empty.ok) fails.push("empty verb must fail");

const bulkZero = core.requireImpact("bulk", 0);
if (bulkZero.ok || bulkZero.error !== "BULK_PREVIEW_REQUIRED") {
  fails.push("bulk impact 0 must require preview count");
}
const bulkMissing = core.requireImpact("bulk", undefined);
if (bulkMissing.ok) fails.push("bulk without impactCount must fail");
const bulkOk = core.requireImpact("bulk", 12);
if (!bulkOk.ok || bulkOk.impactCount !== 12) {
  fails.push("bulk impact 12 must pass");
}
const matchDefault = core.requireImpact("match", undefined);
if (!matchDefault.ok || matchDefault.impactCount !== 1) {
  fails.push("single match may default impactCount=1");
}

const reassignBare = core.requireReassignTarget("REASSIGN", "");
if (reassignBare.ok) fails.push("REASSIGN without target must fail");
const reassignOk = core.requireReassignTarget(
  "REASSIGN",
  "11111111-1111-4111-8111-111111111111",
);
if (!reassignOk.ok) fails.push("REASSIGN with uuid must pass");

const liveBare = core.decideMatchWrite({
  mode: "LIVE",
  confirmed: true,
  previewed: false,
  stage: "apply",
});
if (liveBare.ok || liveBare.error !== "PREVIEW_REQUIRED") {
  fails.push("LIVE apply without preview must FAIL");
}
const liveNoConfirm = core.decideMatchWrite({
  mode: "LIVE",
  confirmed: false,
  previewed: true,
  stage: "apply",
});
if (liveNoConfirm.ok || liveNoConfirm.error !== "LIVE_CONFIRM_REQUIRED") {
  fails.push("LIVE apply without confirm must FAIL");
}
const liveOk = core.decideMatchWrite({
  mode: "LIVE",
  confirmed: true,
  previewed: true,
  stage: "apply",
});
if (!liveOk.ok || liveOk.persist !== true || liveOk.ledgerWrite !== false) {
  fails.push("LIVE preview+confirm may persist control only, never ledger");
}
const dry = core.decideMatchWrite({
  mode: "DRY_RUN",
  confirmed: true,
  previewed: true,
  stage: "apply",
});
if (!dry.ok || dry.persist !== false || dry.ledgerWrite !== false) {
  fails.push("DRY_RUN must not persist ledger");
}

const svc = read("services/api-nest/src/match-control/match-control.service.ts");
const ctrl = read(
  "services/api-nest/src/match-control/match-control.admin.controller.ts",
);
const app = read("services/api-nest/src/app.module.ts");
const caps = read("services/api-nest/src/common/admin-capabilities.ts");
const routes = read("apps/admin/routes.ts");

if (!app.includes("MatchControlModule")) {
  fails.push("AppModule must import MatchControlModule");
}
if (!ctrl.includes("@UseGuards(AdminGuard)")) {
  fails.push("match-control controller must use AdminGuard");
}
if (!caps.includes("MatchControlAdminController")) {
  fails.push("admin-capabilities must classify MatchControlAdminController");
}
const capBlock = caps.slice(
  caps.indexOf("MatchControlAdminController"),
  caps.indexOf("MatchControlAdminController") + 350,
);
if (/"(kyc|wallet|growth|circuit|audit|rbac|ledger|balanceAdjust)"/.test(capBlock)) {
  fails.push("REL-223 must reuse all, not invent a capability");
}
if (/@(Get|Post|Put|Patch)\([^)]*(credit|debit|adjust|balance)/i.test(ctrl)) {
  fails.push("EXIT_GATE: hidden balance route on match-control");
}
if (/UPDATE\s+public\.ledger/i.test(svc) || /INSERT\s+INTO\s+public\.ledger/i.test(svc)) {
  fails.push("EXIT_GATE: match-control must not write ledger");
}
if (/balanceAdjust|wallet_balances|ledger_entries/i.test(svc)) {
  fails.push("EXIT_GATE: match-control must not name balance write tables");
}
if (!/ADMIN_TOP_LEVEL_COUNT\s*=\s*12/.test(routes)) {
  fails.push("sidebar must stay 12");
}
if (/id: 13/.test(routes)) {
  fails.push("must not add 13th sidebar module");
}

const mig = read("supabase/migrations/20260823200000_admin_match_controls.sql");
for (const needle of [
  "admin_match_controls",
  "ENABLE ROW LEVEL SECURITY",
  "APPLY_THIS_SLICE = NO",
  "ALLOW",
  "REASSIGN",
  "BULK",
]) {
  if (!mig.includes(needle) && needle !== "BULK") {
    fails.push("migration missing " + needle);
  }
}
if (!mig.includes("bulk")) fails.push("migration missing bulk kind");
if (/INSERT\s+INTO\s+public\.ledger/i.test(mig)) {
  fails.push("migration must not touch ledger");
}

const fixtureMig = JSON.parse(
  read("tooling/verify/fixtures/migrations-applied.v1.json") || "{}",
);
// REL-701-DB 실행 전 = committedUnapplied · 실행 후(fixture rel701db APPLIED) = versions + appliedVersions. 이 REL 은 apply 주체가 아니다.
if (fixtureMig.rel701db && fixtureMig.rel701db.status === "APPLIED") {
  if (
    !(fixtureMig.versions || []).includes("20260823200000") ||
    !((fixtureMig.rel701db.appliedVersions || []).includes("20260823200000"))
  ) {
    fails.push("20260823200000 must be recorded applied by REL-701-DB after apply");
  }
} else if (!(fixtureMig.committedUnapplied || []).includes("20260823200000")) {
  fails.push("20260823200000 must stay committedUnapplied (no production apply)");
}

const webAdmin = path.join(root, "apps/web/app/admin");
if (fs.existsSync(webAdmin)) fails.push("apps/web must not grow /admin");

const pkg = read("package.json");
const catalog = read("tooling/verify/CATALOG.md");
const gate = read(".github/workflows/gate.yml");
const spec = read("governance/admin/match-control.md");
const evidence = read("governance/release-master/REL-223-MATCH-CONTROL.md");
if (!pkg.includes("verify:rel-223-match-control")) {
  fails.push("package.json missing verify:rel-223-match-control");
}
if (!catalog.includes("rel-223-match-control")) {
  fails.push("CATALOG missing rel-223-match-control");
}
if (!gate.includes("verify:rel-223-match-control")) {
  fails.push("gate.yml must run verify:rel-223-match-control");
}
for (const needle of [
  "LOCKED_VERBS = 5",
  "INVENTED_VERBS = 0",
  "SERVER_ENFORCE = 1",
  "LEDGER_EDIT_VERBS = 0",
  "EXIT_GATE",
]) {
  if (!spec.includes(needle)) fails.push("match-control spec missing " + needle);
}
if (!evidence.includes("STATUS = COMPLETED")) {
  fails.push("REL-223 evidence must be COMPLETED");
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
    action: "MatchControlAdminController.apply",
    targetType: "match_control",
    targetId: "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb",
    mode: "LIVE",
    result: "applied",
    reason: "fixture reason long enough",
    payload: { verb: "ALLOW", kind: "bulk", persist: true, ledgerWrite: false },
  });
  if (!written.ok || written.event.result !== "applied") {
    fails.push("audit write fixture must persist result=applied: " + (written.error || ""));
  }
  if (events.length !== 1) fails.push("audit sink must receive match-control apply");
  auditCore.resetAuditSink();

  const moneyAudit = await auditCore.writeAuditEvent({
    actorKey: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
    actorId: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
    role: "super",
    action: "MatchControlAdminController.apply",
    targetType: "match_control",
    targetId: "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb",
    mode: "LIVE",
    result: "applied",
    reason: "fixture reason long enough",
    payload: { usdt: "1" },
  });
  if (moneyAudit.ok) fails.push("audit payload must reject money keys");

  if (fails.length) {
    console.error("[verify:rel-223-match-control] FAIL");
    for (const f of fails) console.error(" - " + f);
    process.exit(1);
  }
  console.log(
    "[verify:rel-223-match-control] PASS (5 verbs · preview LIVE · ledger verbs 0)",
  );
})().catch((err) => {
  console.error("[verify:rel-223-match-control] FAIL");
  console.error(" - " + (err && err.message ? err.message : String(err)));
  process.exit(1);
});
