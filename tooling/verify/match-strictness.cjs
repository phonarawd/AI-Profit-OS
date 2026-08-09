/**
 * verify:match-strictness — Engine §48.13.3
 * preset→policy map snapshot · Admin execution-policy API · Soft60/Hard90
 * goldens g_strictness_* · random/successRatePercent 0 · observed KPI write 0
 */
const fs = require("fs");
const path = require("path");
const crypto = require("crypto");

const root = path.resolve(__dirname, "../..");
const fails = [];

function mustExist(rel) {
  if (!fs.existsSync(path.join(root, rel))) fails.push(`missing: ${rel}`);
}

function read(rel) {
  return fs.readFileSync(path.join(root, rel), "utf8");
}

const files = [
  "schemas/execution-policy.v1.json",
  "services/market-intelligence/src/match-strictness.cjs",
  "services/api-nest/src/execution-policy/execution-policy.admin.service.ts",
  "services/api-nest/src/execution-policy/execution-policy.admin.controller.ts",
  "services/api-nest/src/execution-policy/execution-policy.routes.ts",
  "services/api-nest/src/execution-policy/execution-policy.module.ts",
  "services/api-nest/src/execution-policy/execution-policy.mi.ts",
  "supabase/migrations/20260809100440_execution_policy_feed_audit.sql",
  "packages/ui/canon/surfaces/admin-execution-policy.wire.json",
  "apps/admin/app/admin/execution-policy/page.tsx",
  "services/engine-rust/testdata/golden/g_strictness_tight_below_min.json",
  "services/engine-rust/testdata/golden/g_strictness_lenient_ok.json",
];
for (const f of files) mustExist(f);

if (fails.length) {
  console.error("[verify:match-strictness] FAIL\n- " + fails.join("\n- "));
  process.exit(1);
}

const ms = require(path.join(
  root,
  "services/market-intelligence/src/match-strictness.cjs",
));
const rule = require(path.join(root, "services/engine-rust/settlement_rule.cjs"));

// --- Soft60 / Hard90 ---
if (ms.SOFT_SEC !== 60) fails.push(`SOFT_SEC want 60 got ${ms.SOFT_SEC}`);
if (ms.HARD_SEC !== 90) fails.push(`HARD_SEC want 90 got ${ms.HARD_SEC}`);
const softHard = ms.softHardReadOnly();
if (softHard.softSec !== 60 || softHard.hardSec !== 90) {
  fails.push("softHardReadOnly must be 60/90");
}
if (softHard.membershipUniform !== true) {
  fails.push("membershipUniform must be true");
}

// --- Preset map 오차0 ---
const want = {
  lenient: {
    minProfitUsdt: "2",
    staleAllowanceSec: 5,
    maxRematchCount: 4,
    slippageBoundBps: 80,
    dailyUserMatchCap: 8,
    dailyOppSlotsDefault: 20,
  },
  standard: {
    minProfitUsdt: "5",
    staleAllowanceSec: 3,
    maxRematchCount: 2,
    slippageBoundBps: 50,
    dailyUserMatchCap: 5,
    dailyOppSlotsDefault: 12,
  },
  tight: {
    minProfitUsdt: "8",
    staleAllowanceSec: 2,
    maxRematchCount: 1,
    slippageBoundBps: 30,
    dailyUserMatchCap: 3,
    dailyOppSlotsDefault: 6,
  },
  scarce: {
    minProfitUsdt: "12",
    staleAllowanceSec: 1,
    maxRematchCount: 0,
    slippageBoundBps: 15,
    dailyUserMatchCap: 2,
    dailyOppSlotsDefault: 3,
  },
};
for (const [k, row] of Object.entries(want)) {
  const got = ms.MATCH_STRICTNESS_PRESETS[k];
  for (const [fk, fv] of Object.entries(row)) {
    if (got?.[fk] !== fv) {
      fails.push(`preset ${k}.${fk} want ${fv} got ${got?.[fk]}`);
    }
  }
}

try {
  ms.assertPresetSnapshot();
} catch (e) {
  fails.push(String(e.message || e));
}

const snapHash = crypto
  .createHash("sha256")
  .update(ms.MATCH_STRICTNESS_PRESET_SNAPSHOT)
  .digest("hex");
const recomputed = crypto
  .createHash("sha256")
  .update(ms.presetSnapshotCanonical())
  .digest("hex");
if (recomputed !== snapHash) {
  fails.push("preset snapshot hash drift vs canonical");
}
/** Locked sha256 of §48.13.3 Day-1 preset canonical JSON — bump with map edits */
const LOCKED_PRESET_SHA256 =
  "ae687fedd311f2a56941d4f6cc786a9cdcfb6ea267812e78f9f82ea8e9db1984";
if (snapHash !== LOCKED_PRESET_SHA256) {
  fails.push(
    `preset snapshot sha256 want ${LOCKED_PRESET_SHA256} got ${snapHash}`,
  );
}

// expand / apply
const tight = ms.expandMatchStrictness("tight");
if (tight.minProfitUsdt !== "8") fails.push("expand tight minProfit");
const applied = ms.applyMatchStrictness({ matchStrictness: "lenient" });
if (applied.minProfitUsdt !== "2" || applied.matchStrictness !== "lenient") {
  fails.push("apply lenient failed");
}
const custom = ms.applyMatchStrictness({
  matchStrictness: "custom",
  minProfitUsdt: "7",
  staleAllowanceSec: 4,
  maxRematchCount: 3,
  slippageBoundBps: 40,
  dailyUserMatchCap: 4,
  dailyOppSlotsDefault: 10,
});
if (custom.matchStrictness !== "custom" || custom.minProfitUsdt !== "7") {
  fails.push("custom must keep fields");
}
const coerced = ms.coerceStrictnessLabel({
  matchStrictness: "standard",
  minProfitUsdt: "9",
  staleAllowanceSec: 3,
  maxRematchCount: 2,
  slippageBoundBps: 50,
  dailyUserMatchCap: 5,
  dailyOppSlotsDefault: 12,
});
if (coerced !== "custom") fails.push("diverged standard must coerce to custom");

// --- Schema forbids successRatePercent as property ---
const schema = JSON.parse(read("schemas/execution-policy.v1.json"));
if (schema.properties?.successRatePercent) {
  fails.push("execution-policy.v1 must not define successRatePercent property");
}
if (!schema.not?.required?.includes("successRatePercent")) {
  fails.push("execution-policy.v1 must not.required successRatePercent");
}
for (const req of [
  "matchStrictness",
  "minProfitUsdt",
  "staleAllowanceSec",
  "maxRematchCount",
  "slippageBoundBps",
  "dailyUserMatchCap",
  "dailyOppSlotsDefault",
]) {
  if (!(schema.required || []).includes(req)) {
    fails.push(`execution-policy.v1 must require ${req}`);
  }
}

// --- Nest API surface ---
const ctrl = read(
  "services/api-nest/src/execution-policy/execution-policy.admin.controller.ts",
);
const svc = read(
  "services/api-nest/src/execution-policy/execution-policy.admin.service.ts",
);
const routes = read(
  "services/api-nest/src/execution-policy/execution-policy.routes.ts",
);
const appMod = read("services/api-nest/src/app.module.ts");

if (!routes.includes('get: "execution-policy"')) {
  fails.push("routes must expose execution-policy GET");
}
if (!routes.includes("stats/today")) {
  fails.push("routes must expose stats/today");
}
if (!ctrl.includes("@Put") || !ctrl.includes("@Get")) {
  fails.push("controller must have GET/PUT");
}
if (!ctrl.includes("successRatePercent FORBIDDEN")) {
  fails.push("controller must reject successRatePercent");
}
if (!svc.includes("statsToday") || !svc.includes("readOnly: true")) {
  fails.push("statsToday must be readOnly");
}
if (!svc.includes("EXECUTION_POLICY_EVENTS") && !svc.includes("admin.execution_policy.updated")) {
  fails.push("put must emit admin.execution_policy.updated");
}
if (!appMod.includes("ExecutionPolicyModule")) {
  fails.push("AppModule must import ExecutionPolicyModule");
}

// observed KPI write path 0 — statsToday must not UPDATE execution_policies
const statsFn = svc.slice(svc.indexOf("statsToday"));
const statsBody = statsFn.slice(0, statsFn.indexOf("\n  async ") > 0
  ? statsFn.indexOf("\n  async listAudit")
  : 800);
if (/UPDATE\s+public\.execution_policies/i.test(statsBody)) {
  fails.push("statsToday must not UPDATE execution_policies");
}
if (/min_profit_usdt\s*=/.test(statsBody)) {
  fails.push("statsToday must not tune min_profit");
}

// --- FORBIDDEN random in map module ---
function stripComments(src) {
  return src
    .replace(/\/\*[\s\S]*?\*\//g, "")
    .replace(/^\s*\/\/.*$/gm, "");
}
const mapCode = stripComments(
  read("services/market-intelligence/src/match-strictness.cjs"),
);
const svcCode = stripComments(svc);
for (const re of [/Math\.random\s*\(/, /successRatePercent\s*[:=]/, /rngSuccess/]) {
  if (re.test(mapCode)) fails.push(`forbidden ${re} in match-strictness.cjs`);
}
if (/Math\.random\s*\(/.test(svcCode)) {
  fails.push("forbidden Math.random in execution-policy.admin.service");
}

// --- Migration ---
const mig = read(
  "supabase/migrations/20260809100440_execution_policy_feed_audit.sql",
);
if (!mig.includes("execution_policy_audit")) {
  fails.push("migration must create execution_policy_audit");
}
if (!mig.includes("nearMissCapUsdt")) {
  fails.push("migration must add feed.nearMissCapUsdt");
}
if (/success_rate_percent|successRatePercent/i.test(mig) && !/FORBIDDEN/.test(mig)) {
  fails.push("migration must not add successRatePercent column");
}

// --- Admin page + Canon ---
const page = read("apps/admin/app/admin/execution-policy/page.tsx");
for (const needle of [
  'data-field="matchStrictness"',
  'data-soft-sec="60"',
  'data-hard-sec="90"',
  'data-forbid="successRatePercent"',
  'data-kpi="observedSuccessRate"',
  "매칭 성공 조절",
]) {
  if (!page.includes(needle)) fails.push(`admin page missing: ${needle}`);
}
if (/type=["']range["']/.test(page) && /success/i.test(page)) {
  fails.push("admin page must not expose success rate slider");
}

const wire = JSON.parse(
  read("packages/ui/canon/surfaces/admin-execution-policy.wire.json"),
);
if (wire.softHard?.softSec !== 60 || wire.softHard?.hardSec !== 90) {
  fails.push("canon softHard must be 60/90");
}
const blockIds = (wire.blocks || []).map((b) => b.id);
for (const id of ["matchStrictness", "observedSuccessKpi", "forbidRng"]) {
  if (!blockIds.includes(id)) fails.push(`canon missing block ${id}`);
}
if (!(wire.forbidden || []).includes("successRatePercent_field")) {
  fails.push("canon must forbid successRatePercent_field");
}
if (!(wire.forbidden || []).includes("observed_kpi_write")) {
  fails.push("canon must forbid observed_kpi_write");
}

// --- Goldens: map → Rule ---
const baseOk = {
  nowMs: 1_000_000,
  participateAcceptedAtMs: 1_000_000,
  circuitStatus: "closed",
  userStatus: "active",
  opportunityStatus: "available",
  compareReady: true,
  staleAtMs: 999_000,
  tradePricingVersion: 1,
  opportunityPricingVersion: 1,
  simulationPayoutFeasible: true,
  listingLegsFresh: true,
  rematchCount: 0,
  presentationDurationSec: 12,
};

for (const [file, expect] of [
  ["g_strictness_tight_below_min.json", "BELOW_MIN_PROFIT"],
  ["g_strictness_lenient_ok.json", "MATCH_SUCCESS"],
]) {
  const g = JSON.parse(
    read(path.join("services/engine-rust/testdata/golden", file)),
  );
  if (g.expect !== expect) fails.push(`${file} expect want ${expect}`);
  const preset = ms.expandMatchStrictness(g.matchStrictness);
  if (!preset) fails.push(`${file} matchStrictness must be a preset`);
  if (g.context.policy.minProfitUsdt !== preset.minProfitUsdt) {
    fails.push(`${file} policy.minProfit must match preset map`);
  }
  if (g.context.policy.staleAllowanceSec !== preset.staleAllowanceSec) {
    fails.push(`${file} staleAllowance must match preset map`);
  }
  if (g.context.policy.maxRematchCount !== preset.maxRematchCount) {
    fails.push(`${file} maxRematch must match preset map`);
  }
  const got = rule.evaluateMatchSuccess(g.context);
  if (got !== expect) {
    fails.push(`${g.id} Rule got ${got} want ${expect}`);
  }
}

// Cross-check: same profit 6 → standard OK · tight BELOW
const profit6 = {
  ...baseOk,
  expectedProfitUsdt: "6",
  policy: ms.toRulePolicy({
    ...ms.expandMatchStrictness("standard"),
    retryWaitSec: 4,
  }),
};
if (rule.evaluateMatchSuccess(profit6) !== "MATCH_SUCCESS") {
  fails.push("standard+profit6 must MATCH_SUCCESS");
}
const profit6Tight = {
  ...profit6,
  policy: ms.toRulePolicy({
    ...ms.expandMatchStrictness("tight"),
    retryWaitSec: 4,
  }),
};
if (rule.evaluateMatchSuccess(profit6Tight) !== "BELOW_MIN_PROFIT") {
  fails.push("tight+profit6 must BELOW_MIN_PROFIT");
}

if (fails.length) {
  console.error("[verify:match-strictness] FAIL\n- " + fails.join("\n- "));
  process.exit(1);
}
console.log(
  "[verify:match-strictness] PASS (preset map · Soft60/Hard90 · Admin API · goldens · rng0 · observed write0)",
);
