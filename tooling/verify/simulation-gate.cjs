/**
 * verify:simulation-gate — Engine §51.4 M0.5
 * S1~S4 gates · platform_reserve S2 · Growth ON ≤24h · Admin surfaces · Nest API
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
  "services/simulation-engine/package.json",
  "services/simulation-engine/src/index.cjs",
  "services/simulation-engine/src/gates.cjs",
  "services/simulation-engine/src/report.cjs",
  "services/simulation-engine/src/feasibility.cjs",
  "services/simulation-engine/src/growth-gate.cjs",
  "services/api-nest/src/simulation/simulation.module.ts",
  "services/api-nest/src/simulation/simulation.admin.service.ts",
  "services/api-nest/src/simulation/simulation.admin.controller.ts",
  "services/api-nest/src/simulation/platform-reserve.admin.service.ts",
  "services/api-nest/src/simulation/platform-reserve.admin.controller.ts",
  "services/api-nest/src/simulation/simulation.routes.ts",
  "services/api-nest/src/simulation/simulation.events.ts",
  "schemas/simulation-report.v1.json",
  "schemas/simulation-gate.v1.json",
  "supabase/migrations/20260809102109_simulation_engine_m05_platform_reserve.sql",
  "apps/admin/app/admin/growth/page.tsx",
  "apps/admin/app/admin/system-control/page.tsx",
  "packages/ui/canon/surfaces/admin-growth-simulation.wire.json",
  "packages/ui/canon/surfaces/admin-system-control-reserve.wire.json",
];
for (const f of files) mustExist(f);

if (fails.length) {
  console.error("[verify:simulation-gate] FAIL\n- " + fails.join("\n- "));
  process.exit(1);
}

// --- package name ---
const pkg = JSON.parse(read("services/simulation-engine/package.json"));
if (pkg.name !== "@aipo/simulation-engine") {
  fails.push("package name must be @aipo/simulation-engine");
}

const eng = require(path.join(root, "services/simulation-engine/src/index.cjs"));

if (eng.PLATFORM_RESERVE_ACCOUNT_CODE !== "ops.platform_reserve_usdt") {
  fails.push("PLATFORM_RESERVE_ACCOUNT_CODE must be ops.platform_reserve_usdt");
}
if (eng.GATE_THRESHOLDS.s2ReserveDrainMaxPct !== "0.10") {
  fails.push("S2 threshold must be 0.10");
}
if (eng.GATE_THRESHOLDS.s3PayoutFeasibilityMin !== 0.85) {
  fails.push("S3 threshold must be 0.85");
}
if (eng.GATE_THRESHOLDS.s4AdapterMatchFailureRateMax !== 0.15) {
  fails.push("S4 threshold must be 0.15");
}
if (eng.GATE_THRESHOLDS.growthPassMaxAgeHours !== 24) {
  fails.push("Growth pass max age must be 24h");
}

// --- S1 ---
const s1pass = eng.evaluateS1([
  { field: "expectedProfitUsdt", sample: 10, mismatch: 0 },
]);
if (!s1pass.pass || s1pass.failAction !== "block_publish") {
  fails.push("S1 zero mismatch must pass with block_publish");
}
const s1fail = eng.evaluateS1([
  { field: "expectedProfitUsdt", sample: 10, mismatch: 1 },
]);
if (s1fail.pass) fails.push("S1 mismatch>0 must fail");

// --- S2 ---
const s2unset = eng.evaluateS2("10", { isSet: false });
if (s2unset.pass || s2unset.reason !== "platform_reserve_unset") {
  fails.push("S2 unset reserve must fail");
}
// reserve 1000 → max 100 · drain 50 pass · drain 200 fail
const s2ok = eng.evaluateS2("50", { isSet: true, targetUsdt: "1000" });
if (!s2ok.pass || s2ok.maxAllowedUsdt !== "100") {
  fails.push(`S2 50/1000 must pass max=100 got ${JSON.stringify(s2ok)}`);
}
const s2bad = eng.evaluateS2("200", { isSet: true, targetUsdt: "1000" });
if (s2bad.pass || s2bad.failAction !== "admin_alert") {
  fails.push("S2 200/1000 must fail admin_alert");
}

// --- S3 ---
const s3ok = eng.evaluateS3(0.85);
if (!s3ok.pass) fails.push("S3 0.85 must pass");
const s3bad = eng.evaluateS3(0.84);
if (s3bad.pass || s3bad.failAction !== "hide_feed") {
  fails.push("S3 0.84 must fail hide_feed");
}

// --- S4 ---
const s4ok = eng.evaluateS4(0.15);
if (!s4ok.pass) fails.push("S4 0.15 must pass");
const s4bad = eng.evaluateS4(0.16);
if (s4bad.pass || s4bad.failAction !== "adapter_alert") {
  fails.push("S4 0.16 must fail adapter_alert");
}

// --- full report + gates ---
const { report, gates } = eng.buildSimulationReport(
  {
    opportunityPublishRate: 0.9,
    spreadDistribution: { p50: "10", p10: "2", p90: "40" },
    payoutFeasibilityScore: 0.9,
    worstCasePlatformDrainUsdt: "50",
    uxDisplayAccuracy: [{ field: "x", sample: 1, mismatch: 0 }],
    adapterMatchFailureRate: 0.1,
    opportunities: [
      { opportunityId: "opp-1", compareReady: true },
      { opportunityId: "opp-2", forceInfeasible: true },
    ],
  },
  { isSet: true, targetUsdt: "1000" },
);
if (report.horizonHours !== 24) fails.push("horizonHours must be 24");
if (!gates.overallPass) fails.push("fixture report must overallPass");
if (!eng.payoutFeasible("opp-1", report.feasibility)) {
  fails.push("payoutFeasible opp-1 must be true");
}
if (eng.payoutFeasible("opp-2", report.feasibility)) {
  fails.push("payoutFeasible opp-2 must be false (R8)");
}

// --- Growth gate ---
const now = Date.now();
const gOk = eng.evaluateGrowthEnableGate({
  latest: { overallPass: true, asOf: new Date(now - 3600_000).toISOString() },
  reserveIsSet: true,
  now,
});
if (!gOk.allowed) fails.push("Growth gate must allow fresh PASS + reserve");

const gStale = eng.evaluateGrowthEnableGate({
  latest: {
    overallPass: true,
    asOf: new Date(now - 25 * 3600_000).toISOString(),
  },
  reserveIsSet: true,
  now,
});
if (gStale.allowed || !gStale.reasons.includes("simulation_stale")) {
  fails.push("Growth gate must block stale >24h");
}

const gNoReserve = eng.evaluateGrowthEnableGate({
  latest: { overallPass: true, asOf: new Date(now).toISOString() },
  reserveIsSet: false,
  now,
});
if (gNoReserve.allowed || !gNoReserve.reasons.includes("platform_reserve_unset")) {
  fails.push("Growth gate must block unset reserve");
}

const gFail = eng.evaluateGrowthEnableGate({
  latest: { overallPass: false, asOf: new Date(now).toISOString() },
  reserveIsSet: true,
  now,
});
if (gFail.allowed || !gFail.reasons.includes("simulation_not_pass")) {
  fails.push("Growth gate must block non-PASS");
}

// --- schemas ---
const reportSchema = JSON.parse(read("schemas/simulation-report.v1.json"));
if (reportSchema.title !== "SimulationReportV1") {
  fails.push("simulation-report title");
}
for (const key of [
  "runId",
  "asOf",
  "horizonHours",
  "payoutFeasibilityScore",
  "worstCasePlatformDrainUsdt",
  "uxDisplayAccuracy",
  "adapterMatchFailureRate",
]) {
  if (!reportSchema.required.includes(key)) {
    fails.push(`simulation-report required missing ${key}`);
  }
}
const gateSchema = JSON.parse(read("schemas/simulation-gate.v1.json"));
if (gateSchema.title !== "SimulationGateV1") {
  fails.push("simulation-gate title");
}
if (!/51\.4/.test(gateSchema.description || "")) {
  fails.push("simulation-gate description must cite §51.4");
}

// --- migration ---
const mig = read(
  "supabase/migrations/20260809102109_simulation_engine_m05_platform_reserve.sql",
);
for (const needle of [
  "ops.platform_reserve_usdt",
  "platform_reserve_config",
  "platform_reserve_audit",
  "simulation_runs",
  "growth_control",
  "ENABLE ROW LEVEL SECURITY",
]) {
  if (!mig.includes(needle)) fails.push(`migration missing ${needle}`);
}

// --- Nest wiring ---
const appMod = read("services/api-nest/src/app.module.ts");
if (!appMod.includes("SimulationModule")) {
  fails.push("app.module must import SimulationModule");
}
const apiPkg = read("services/api-nest/package.json");
if (!apiPkg.includes("@aipo/simulation-engine")) {
  fails.push("api-nest must depend on @aipo/simulation-engine");
}

const routes = read("services/api-nest/src/simulation/simulation.routes.ts");
for (const needle of [
  "simulation/run",
  "simulation/latest",
  "simulation/growth-gate",
  "growth/enabled",
  "system-control/reserve",
]) {
  if (!routes.includes(needle)) fails.push(`routes missing ${needle}`);
}

const events = read("services/api-nest/src/simulation/simulation.events.ts");
if (!events.includes("simulation.completed")) {
  fails.push("SIMULATION_EVENTS must include simulation.completed");
}
if (!events.includes("admin.platform_reserve.updated")) {
  fails.push("PLATFORM_RESERVE_EVENTS missing");
}
if (!events.includes("admin.growth.enabled")) {
  fails.push("GROWTH_EVENTS missing");
}

const simSvc = read(
  "services/api-nest/src/simulation/simulation.admin.service.ts",
);
for (const needle of [
  "buildSimulationReport",
  "evaluateGrowthEnableGate",
  "simulationS4Input",
  "GROWTH_GATE_BLOCKED",
  "SIMULATION_EVENTS.completed",
]) {
  if (!simSvc.includes(needle)) fails.push(`simulation.admin.service missing ${needle}`);
}

const reserveSvc = read(
  "services/api-nest/src/simulation/platform-reserve.admin.service.ts",
);
for (const needle of [
  "PLATFORM_RESERVE_ACCOUNT_CODE",
  "asS2Input",
  "platform_reserve_audit",
  "is_set",
]) {
  if (!reserveSvc.includes(needle)) {
    fails.push(`platform-reserve.admin.service missing ${needle}`);
  }
}
const reserveTypes = read(
  "services/api-nest/src/simulation/simulation.types.ts",
);
if (!reserveTypes.includes('ops.platform_reserve_usdt')) {
  fails.push("simulation.types must lock ops.platform_reserve_usdt");
}

const ledgerTypes = read("services/api-nest/src/ledger/ledger.types.ts");
if (!ledgerTypes.includes("ops.platform_reserve_usdt")) {
  fails.push("ledger.types must include PLATFORM_RESERVE code");
}

// --- Admin UI ---
const growthPage = read("apps/admin/app/admin/growth/page.tsx");
for (const needle of [
  "tab=simulation",
  "growth-simulation-panel",
  'id: "S1"',
  'id: "S2"',
  'id: "S3"',
  'id: "S4"',
  "data-gate={g.id}",
  "/api/v1/admin/simulation/run",
  "/api/v1/admin/simulation/latest",
  "admin.growth.enabled",
  "adapterMatchFailureRate",
]) {
  if (!growthPage.includes(needle)) {
    fails.push(`growth page missing ${needle}`);
  }
}

const sysPage = read("apps/admin/app/admin/system-control/page.tsx");
for (const needle of [
  'tab=reserve',
  "system-control-reserve-panel",
  "ops.platform_reserve_usdt",
  "/api/v1/admin/system-control/reserve",
  "data-s2-input",
]) {
  if (!sysPage.includes(needle)) {
    fails.push(`system-control page missing ${needle}`);
  }
}

const routesAdmin = read("apps/admin/routes.ts");
if (!routesAdmin.includes("/admin/growth?tab=simulation")) {
  fails.push("admin routes missing growth?tab=simulation");
}
if (!routesAdmin.includes("/admin/system-control?tab=reserve")) {
  fails.push("admin routes missing system-control?tab=reserve");
}

// --- Canon ---
const wireSim = read(
  "packages/ui/canon/surfaces/admin-growth-simulation.wire.json",
);
if (!wireSim.includes("admin-growth-simulation")) {
  fails.push("canon growth-simulation id");
}
if (!wireSim.includes("gates_s1_s4")) fails.push("canon missing gates_s1_s4");
const wireRes = read(
  "packages/ui/canon/surfaces/admin-system-control-reserve.wire.json",
);
if (!wireRes.includes("ops.platform_reserve_usdt")) {
  fails.push("canon reserve must cite account code");
}

// --- package scripts / catalog ---
const rootPkg = read("package.json");
if (!rootPkg.includes("verify:simulation-gate")) {
  fails.push("package.json missing verify:simulation-gate script");
}
const catalog = read("tooling/verify/CATALOG.md");
if (!/simulation-gate[^\n]*\*\*live\*\*/.test(catalog) && !catalog.includes("simulation-gate")) {
  fails.push("CATALOG must mention simulation-gate");
}

if (fails.length) {
  console.error("[verify:simulation-gate] FAIL");
  for (const f of fails) console.error(" -", f);
  process.exit(1);
}
console.log("[verify:simulation-gate] PASS");
