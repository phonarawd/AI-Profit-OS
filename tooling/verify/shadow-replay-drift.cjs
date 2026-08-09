/**
 * verify:shadow-replay-drift — Engine shadow-replay · 0.000% gate
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
  fails.push("FAIL_ACTION must be block_settlement");
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

const bad = eng.evaluateDrift([{ id: "x", expected: 100, actual: 99 }]);
if (bad.pass || bad.failAction !== "block_settlement") {
  fails.push("nonzero drift must fail block_settlement");
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

const schema = JSON.parse(read("schemas/shadow-replay-report.v1.json"));
if (schema.properties?.maxDriftPct?.const !== 0) {
  fails.push("schema maxDriftPct const 0");
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
]) {
  if (!svc.includes(needle)) {
    fails.push(`shadow-replay.admin.service missing ${needle}`);
  }
}

const rootPkg = read("package.json");
if (!rootPkg.includes("verify:shadow-replay-drift")) {
  fails.push("package.json missing verify:shadow-replay-drift");
}
const catalog = read("tooling/verify/CATALOG.md");
if (!catalog.includes("shadow-replay-drift")) {
  fails.push("CATALOG must mention shadow-replay-drift");
}

if (fails.length) {
  console.error("[verify:shadow-replay-drift] FAIL");
  for (const f of fails) console.error(" -", f);
  process.exit(1);
}
console.log("[verify:shadow-replay-drift] PASS");
