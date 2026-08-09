/**
 * verify:match-success-rule — Engine §48.13.2
 * golden 6 · Soft60/Hard90 · REQUEUE/MATCH_TIMEOUT · P0b · random/timer 0
 * presentation-cannot-credit (duration ≠ settlement)
 */
const fs = require("fs");
const path = require("path");

const root = path.resolve(__dirname, "../..");
const fails = [];

function mustExist(rel) {
  if (!fs.existsSync(path.join(root, rel))) fails.push(`missing: ${rel}`);
}

const rustRel = "services/engine-rust/src/settlement_rule.rs";
const cjsRel = "services/engine-rust/settlement_rule.cjs";
const goldenDir = "services/engine-rust/testdata/golden";

const goldenFiles = [
  ["g_match_success", "match_success.json"],
  ["g_price_moved_stale", "price_moved_stale.json"],
  ["g_below_min_profit", "below_min_profit.json"],
  ["g_circuit_open", "circuit_open.json"],
  ["g_requeue_then_success", "requeue_then_success.json"],
  ["g_soft_version_ok", "soft_version_ok.json"],
];

mustExist(rustRel);
mustExist(cjsRel);
for (const [, file] of goldenFiles) {
  mustExist(path.join(goldenDir, file));
}

if (fails.length) {
  console.error("[verify:match-success-rule] FAIL\n- " + fails.join("\n- "));
  process.exit(1);
}

const rule = require(path.join(root, cjsRel));
const rustSrc = fs.readFileSync(path.join(root, rustRel), "utf8");
const cjsSrc = fs.readFileSync(path.join(root, cjsRel), "utf8");

// --- Soft60 / Hard90 lock (Rust + CJS) ---
if (rule.SOFT_SEC !== 60) fails.push(`SOFT_SEC want 60 got ${rule.SOFT_SEC}`);
if (rule.HARD_SEC !== 90) fails.push(`HARD_SEC want 90 got ${rule.HARD_SEC}`);
if (!/SOFT_SEC:\s*i64\s*=\s*60/.test(rustSrc) && !/SOFT_SEC:\s*i64 = 60/.test(rustSrc)) {
  fails.push("settlement_rule.rs SOFT_SEC must be 60");
}
if (!/HARD_SEC:\s*i64\s*=\s*90/.test(rustSrc) && !/HARD_SEC:\s*i64 = 90/.test(rustSrc)) {
  fails.push("settlement_rule.rs HARD_SEC must be 90");
}

// --- R1~R10 markers in Rust SSOT ---
for (const marker of ["R1", "R2", "R3", "R4", "R5", "R6", "R7", "R8", "R9", "R10"]) {
  if (!rustSrc.includes(marker)) {
    fails.push(`settlement_rule.rs missing ${marker}`);
  }
}
for (const fn of ["evaluate_execution", "guard_participate", "evaluate_match_success"]) {
  if (!rustSrc.includes(`fn ${fn}`)) {
    fails.push(`settlement_rule.rs missing fn ${fn}`);
  }
}
for (const code of [
  "MATCH_SUCCESS",
  "REQUEUE",
  "PRICE_MOVED",
  "BELOW_MIN_PROFIT",
  "CIRCUIT_OPEN",
  "SYSTEM_FAILED",
  "MATCH_TIMEOUT",
  "MATCH_BLOCKED",
]) {
  if (!rustSrc.includes(code)) {
    fails.push(`settlement_rule.rs missing code ${code}`);
  }
}

// --- FORBIDDEN: random / successRatePercent / timer credit ---
// Strip line comments before scanning for forbidden runtime paths
function stripComments(src) {
  return src
    .replace(/\/\*[\s\S]*?\*\//g, "")
    .replace(/^\s*\/\/.*$/gm, "")
    .replace(/^\s*\*.*$/gm, "");
}
const rustCode = stripComments(rustSrc);
const cjsCode = stripComments(cjsSrc);
const forbidden = [
  /Math\.random\s*\(/,
  /successRatePercent/,
  /\brand\s*::/,
  /thread_rng/,
  /rngSuccess/,
];
for (const re of forbidden) {
  if (re.test(rustCode) || re.test(cjsCode)) {
    fails.push(`forbidden pattern ${re} in settlement_rule`);
  }
}
if (/presentation_duration/.test(rustSrc) && /presentation_duration_sec/.test(rustSrc)) {
  // field may exist but must not branch result — checked below via runtime
}

// --- Golden 6 ---
for (const [id, file] of goldenFiles) {
  const g = JSON.parse(
    fs.readFileSync(path.join(root, goldenDir, file), "utf8"),
  );
  if (g.id !== id) fails.push(`${file} id want ${id} got ${g.id}`);

  if (Array.isArray(g.steps)) {
    g.steps.forEach((step, i) => {
      const got = rule.evaluateExecution(step.context);
      if (got !== step.expect) {
        fails.push(`${id} step[${i}] got ${got} want ${step.expect}`);
      }
    });
  } else {
    const got = rule.evaluateExecution(g.context);
    if (got !== g.expect) {
      fails.push(`${id} got ${got} want ${g.expect}`);
    }
  }
}

// --- P0b matchBlocked ---
const p0b = rule.guardParticipate({
  matchBlocked: true,
  compareReady: true,
  nowMs: 1_000_000,
  staleAtMs: 999_000,
  priceStaleMaxSec: 3,
});
if (p0b !== "MATCH_BLOCKED") {
  fails.push(`P0b want MATCH_BLOCKED got ${p0b}`);
}
const p0bOk = rule.guardParticipate({
  matchBlocked: false,
  compareReady: true,
  nowMs: 1_000_000,
  staleAtMs: 999_000,
  priceStaleMaxSec: 3,
});
if (p0bOk !== "OK") fails.push(`P0b clear want OK got ${p0bOk}`);

// --- Hard wall MATCH_TIMEOUT ---
const timeoutGot = rule.evaluateExecution({
  nowMs: 1_000_000 + 90_000,
  participateAcceptedAtMs: 1_000_000,
  circuitStatus: "closed",
  userStatus: "active",
  opportunityStatus: "available",
  compareReady: true,
  staleAtMs: 1_089_000,
  expectedProfitUsdt: "10",
  tradePricingVersion: 1,
  opportunityPricingVersion: 1,
  simulationPayoutFeasible: true,
  listingLegsFresh: true,
  rematchCount: 0,
  policy: {
    minProfitUsdt: "5",
    staleAllowanceSec: 3,
    maxRematchCount: 2,
    retryWaitSec: 4,
  },
  presentationDurationSec: 12,
});
if (timeoutGot !== "MATCH_TIMEOUT") {
  fails.push(`Hard90 want MATCH_TIMEOUT got ${timeoutGot}`);
}

// --- REQUEUE blocked when retry would cross hard ---
const noRequeue = rule.evaluateExecution({
  nowMs: 1_000_000 + 88_000,
  participateAcceptedAtMs: 1_000_000,
  circuitStatus: "closed",
  userStatus: "active",
  opportunityStatus: "available",
  compareReady: true,
  staleAtMs: 1_087_000,
  expectedProfitUsdt: "10",
  tradePricingVersion: 1,
  opportunityPricingVersion: 1,
  simulationPayoutFeasible: true,
  listingLegsFresh: false,
  rematchCount: 0,
  policy: {
    minProfitUsdt: "5",
    staleAllowanceSec: 3,
    maxRematchCount: 2,
    retryWaitSec: 4,
  },
  presentationDurationSec: 12,
});
// now+retryWait = 88s+4s = 92s >= hard 90s → PRICE_MOVED (not REQUEUE)
if (noRequeue !== "PRICE_MOVED") {
  fails.push(`REQUEUE guard want PRICE_MOVED got ${noRequeue}`);
}

// --- presentation-cannot-credit ---
const base = {
  nowMs: 1_000_000,
  participateAcceptedAtMs: 1_000_000,
  circuitStatus: "closed",
  userStatus: "active",
  opportunityStatus: "available",
  compareReady: true,
  staleAtMs: 999_000,
  expectedProfitUsdt: "10",
  tradePricingVersion: 1,
  opportunityPricingVersion: 1,
  simulationPayoutFeasible: true,
  listingLegsFresh: true,
  rematchCount: 0,
  policy: {
    minProfitUsdt: "5",
    staleAllowanceSec: 3,
    maxRematchCount: 2,
    retryWaitSec: 4,
  },
};
const a = rule.evaluateExecution({ ...base, presentationDurationSec: 8 });
const b = rule.evaluateExecution({ ...base, presentationDurationSec: 15 });
if (a !== b || a !== "MATCH_SUCCESS") {
  fails.push(
    `presentation-cannot-credit: duration must not change result (got ${a}/${b})`,
  );
}

// --- lib.rs exports module ---
const libSrc = fs.readFileSync(
  path.join(root, "services/engine-rust/src/lib.rs"),
  "utf8",
);
if (!libSrc.includes("pub mod settlement_rule")) {
  fails.push("lib.rs must pub mod settlement_rule");
}

if (fails.length) {
  console.error("[verify:match-success-rule] FAIL\n- " + fails.join("\n- "));
  process.exit(1);
}
console.log(
  "[verify:match-success-rule] PASS (golden6 · Soft60/Hard90 · REQUEUE/MATCH_TIMEOUT · P0b · random/timer0 · presentation≠credit)",
);
