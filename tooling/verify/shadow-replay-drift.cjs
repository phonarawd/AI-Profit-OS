/**
 * verify:shadow-replay-drift — Engine offline shadow-replay · 0.000% gate
 * + §47.16.6 additive advisory naming (FAIL_ACTION unchanged · ADVISORY_LABEL)
 */
const fs = require("fs");
const path = require("path");

const root = path.resolve(__dirname, "../..");
const fails = [];

function mustExist(rel) {
  if (!fs.existsSync(path.join(root, rel))) fails.push(`missing: ${rel}`);
}

function read(rel) {
  return fs.readFileSync(path.join(root, rel), "utf8");
}

const files = [
  "services/shadow-replay-engine/package.json",
  "services/shadow-replay-engine/src/index.cjs",
  "services/shadow-replay-engine/src/drift.cjs",
  "services/shadow-replay-engine/src/replay.cjs",
  "services/shadow-replay-engine/testdata/golden/pick_high.json",
  "services/shadow-replay-engine/testdata/golden/pick_threshold_edge.json",
  "services/shadow-replay-engine/testdata/golden/pick_below.json",
  "schemas/shadow-replay-report.v1.json",
  "packages/ui/canon/surfaces/admin-ledger-shadow-replay.wire.json",
  "apps/admin/app/admin/ledger/page.tsx",
  "services/api-nest/src/ai/shadow-replay.admin.service.ts",
  "supabase/migrations/20260811194832_shadow_replay_advisory_label.sql",
];
for (const f of files) mustExist(f);

if (fails.length) {
  console.error("[verify:shadow-replay-drift] FAIL\n- " + fails.join("\n- "));
  process.exit(1);
}

const eng = require(path.join(
  root,
  "services/shadow-replay-engine/src/index.cjs",
));

if (eng.MAX_DRIFT_PCT !== 0) fails.push("MAX_DRIFT_PCT must be 0");
if (eng.FAIL_ACTION !== "block_settlement") {
  fails.push("FAIL_ACTION must be block_settlement (breaking rename forbidden)");
}
if (eng.ADVISORY_LABEL !== "drift_advisory_only") {
  fails.push("ADVISORY_LABEL must be drift_advisory_only");
}
if (eng.DRIFT_ADVISORY_ONLY !== true) {
  fails.push("DRIFT_ADVISORY_ONLY must be true");
}
if (eng.HORIZON_HOURS !== 24) fails.push("HORIZON_HOURS must be 24");

if (eng.driftPct(100, 100) !== 0) fails.push("identical drift must be 0");
if (eng.driftPct(100, 100.001) === 0) {
  fails.push("nonzero absolute diff must have drift>0");
}

const ok = eng.evaluateDrift([
  { id: "a", expected: 88, actual: 88 },
  { id: "b", expected: 0, actual: 0 },
]);
if (!ok.pass || ok.driftPct !== 0 || ok.failAction !== null) {
  fails.push("zero mismatch must pass with drift 0");
}
if (ok.driftAdvisoryOnly !== true || ok.contractLabel !== "drift_advisory_only") {
  fails.push("evaluateDrift must expose advisory contract fields");
}

const bad = eng.evaluateDrift([{ id: "x", expected: 100, actual: 99 }]);
if (bad.pass || bad.failAction !== "block_settlement") {
  fails.push("nonzero drift must fail block_settlement");
}
if (bad.driftAdvisoryOnly !== true || bad.contractLabel !== eng.ADVISORY_LABEL) {
  fails.push("fail path must keep advisory-only contract label");
}

const report = eng.runAiPickShadowReplay({ runId: "verify_shadow_1" });
if (!report.pass) {
  fails.push(
    `AI PICK shadow replay must pass: ${JSON.stringify(report.mismatches)}`,
  );
}
if (report.driftPct !== 0) fails.push(`driftPct want 0 got ${report.driftPct}`);
if (report.horizonHours !== 24) fails.push("report horizonHours");
if (report.traceCount < 3) fails.push("need ≥3 AI PICK goldens");
if (report.maxDriftPct !== 0) fails.push("report maxDriftPct");
if (report.executionMode !== "offline_replay") {
  fails.push("report.executionMode must be offline_replay");
}
if (report.driftAdvisoryOnly !== true) {
  fails.push("report.driftAdvisoryOnly must be true");
}
if (report.contractLabel !== "drift_advisory_only") {
  fails.push("report.contractLabel must be drift_advisory_only");
}

const schema = JSON.parse(read("schemas/shadow-replay-report.v1.json"));
if (schema.properties?.maxDriftPct?.const !== 0) {
  fails.push("schema maxDriftPct const 0");
}
if (schema.properties?.contractLabel?.const !== "drift_advisory_only") {
  fails.push("schema must const contractLabel=drift_advisory_only");
}
if (schema.properties?.driftAdvisoryOnly?.const !== true) {
  fails.push("schema must const driftAdvisoryOnly=true");
}
if (schema.properties?.executionMode?.const !== "offline_replay") {
  fails.push("schema must const executionMode=offline_replay");
}
// failAction enum must retain block_settlement (no breaking rename)
const failEnum = schema.properties?.failAction?.enum || [];
if (!failEnum.includes("block_settlement")) {
  fails.push("schema failAction must keep block_settlement");
}

const wire = read(
  "packages/ui/canon/surfaces/admin-ledger-shadow-replay.wire.json",
);
if (!wire.includes("block_settlement")) {
  fails.push("canon must cite block_settlement");
}
if (!wire.includes("nonzero_drift_pass")) {
  fails.push("canon forbidden missing nonzero_drift_pass");
}
// Admin copy conversion is 04 Admin pointer — Engine may only note advisory fields
if (!wire.includes("drift_advisory_only") && !wire.includes("driftAdvisoryOnly")) {
  fails.push("canon wire must pointer advisory contract (Admin copy track separate)");
}

const ledger = read("apps/admin/app/admin/ledger/page.tsx");
if (!ledger.includes("tab=shadow-replay") && !ledger.includes('"shadow-replay"')) {
  fails.push("ledger page missing shadow-replay tab");
}
if (!ledger.includes('data-max-drift="0"')) {
  fails.push("ledger shadow panel must lock max drift 0");
}

const adminRoutes = read("apps/admin/routes.ts");
if (!adminRoutes.includes("/admin/ledger?tab=shadow-replay")) {
  fails.push("admin routes missing ledger?tab=shadow-replay");
}

const svc = read(
  "services/api-nest/src/ai/shadow-replay.admin.service.ts",
);
for (const needle of [
  "runAiPickShadowReplay",
  "shadow_replay_runs",
  "SHADOW_REPLAY_EVENTS",
  "block_settlement",
  "settlementBlocked",
  "driftAdvisoryOnly",
  "contractLabel",
  "ADVISORY_LABEL",
  "drift_advisory_only",
  "contract_label",
]) {
  if (!svc.includes(needle)) {
    fails.push(`shadow-replay.admin.service missing ${needle}`);
  }
}

// Production safety: settlement engine must NOT consume shadow_replay failAction
function walkHas(dirRel, re) {
  const abs = path.join(root, dirRel);
  if (!fs.existsSync(abs)) return false;
  const stack = [abs];
  while (stack.length) {
    const cur = stack.pop();
    const st = fs.statSync(cur);
    if (st.isDirectory()) {
      for (const name of fs.readdirSync(cur)) {
        if (name === "node_modules" || name === "target") continue;
        stack.push(path.join(cur, name));
      }
      continue;
    }
    if (!/\.(rs|ts|cjs|js)$/.test(cur)) continue;
    const txt = fs.readFileSync(cur, "utf8");
    if (re.test(txt)) return true;
  }
  return false;
}
if (walkHas("services/engine-rust", /shadow_replay|block_settlement/)) {
  fails.push("engine-rust must not wire shadow_replay/block_settlement (advisory only)");
}
if (walkHas("services/api-nest/src/trades", /shadow_replay|runAiPickShadowReplay/)) {
  fails.push("trades must not call shadow replay (mutation isolation)");
}
// Coach path must not import shadow replay runner
const orch = read("services/api-nest/src/ai/coach.orchestrator.ts");
if (/runAiPickShadowReplay|shadow-replay-engine/.test(orch)) {
  fails.push("CoachOrchestrator must not run shadow replay (user-visible isolation)");
}

const mig = read(
  "supabase/migrations/20260811194832_shadow_replay_advisory_label.sql",
);
if (!/ADD COLUMN IF NOT EXISTS drift_advisory_only/.test(mig)) {
  fails.push("migration must add drift_advisory_only additive");
}
if (!/ADD COLUMN IF NOT EXISTS contract_label/.test(mig)) {
  fails.push("migration must add contract_label additive");
}
if (/DROP CONSTRAINT\s+\S*fail_action/i.test(mig)) {
  fails.push("migration must not drop fail_action CHECK (breaking)");
}
if (/ALTER\s+COLUMN\s+fail_action/i.test(mig)) {
  fails.push("migration must not alter fail_action column (breaking)");
}
const orig = read(
  "supabase/migrations/20260809103208_ai_feature_platform_pick_eval_shadow.sql",
);
if (!orig.includes("fail_action = 'block_settlement'")) {
  fails.push("original fail_action CHECK must remain in baseline migration");
}

const fixture = JSON.parse(
  read("tooling/verify/fixtures/migrations-applied.v1.json"),
);
if (!(fixture.versions || []).includes("20260811194832")) {
  fails.push("migrations-applied fixture must include 20260811194832");
}

const rootPkg = read("package.json");
if (!rootPkg.includes("verify:shadow-replay-drift")) {
  fails.push("package.json missing verify:shadow-replay-drift");
}
const catalog = read("tooling/verify/CATALOG.md");
if (!catalog.includes("shadow-replay-drift")) {
  fails.push("CATALOG must mention shadow-replay-drift");
}
if (!catalog.includes("drift_advisory_only") && !catalog.includes("ADVISORY_LABEL")) {
  fails.push("CATALOG must document advisory naming (§47.16.6)");
}

const domain = read("tooling/verify/domain-by-path.cjs");
if (!domain.includes("shadow-replay-drift.cjs")) {
  fails.push("domain-by-path must route shadow-replay-drift");
}

if (fails.length) {
  console.error("[verify:shadow-replay-drift] FAIL");
  for (const f of fails) console.error(" -", f);
  process.exit(1);
}
console.log(
  "[verify:shadow-replay-drift] PASS (0.000% · advisory label · offline_replay · settlement unwired)",
);
