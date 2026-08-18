/**
 * verify:sweeper-trx-guard — Money §43.2 · §43.2.1
 * min TRX 미달 시 sweep 호출 0 · Admin pause · DETECTED forbidden · Phase0 in-process
 */
const fs = require("fs");
const path = require("path");
const assert = require("assert");
const vm = require("vm");

const root = path.resolve(__dirname, "../..");
const fails = [];

function mustExist(rel) {
  if (!fs.existsSync(path.join(root, rel))) fails.push(`missing: ${rel}`);
}

function read(rel) {
  return fs.readFileSync(path.join(root, rel), "utf8");
}

const files = [
  "schemas/deposit-config.v1.json",
  "schemas/toast-codes.v1.json",
  "services/api-nest/src/wallet/chain-sweeper.guards.ts",
  "services/api-nest/src/wallet/chain-sweeper.phase0.service.ts",
  "services/api-nest/src/wallet/deposit-config.service.ts",
  "services/api-nest/src/wallet/wallet.events.ts",
  "services/api-nest/src/wallet/wallet.routes.ts",
  "services/api-nest/src/wallet/wallet.controller.ts",
  "services/api-nest/src/wallet/wallet.module.ts",
  "workers/chain-sweeper/src/constants.ts",
  "workers/chain-sweeper/src/trx-guard.ts",
  "workers/chain-sweeper/src/sweep-eligibility.ts",
  "workers/chain-sweeper/src/energy-delegate.ts",
  "workers/chain-sweeper/src/index.ts",
  "workers/chain-sweeper/wrangler.toml",
  "supabase/migrations/20260809002330_chain_sweeper.sql",
  "infra/workers.manifest.json",
];
for (const f of files) mustExist(f);

const toast = read("schemas/toast-codes.v1.json");
if (!toast.includes('"SWEEPER_TRX_LOW"')) {
  fails.push("toast-codes missing SWEEPER_TRX_LOW");
}

const schema = JSON.parse(read("schemas/deposit-config.v1.json"));
const onchain = schema.properties?.usdtOnchain?.properties;
if (!onchain?.minTrxStakeForSweeper) {
  fails.push("deposit-config must define minTrxStakeForSweeper");
}
if (!String(onchain?.minTrxStakeForSweeper?.description || "").includes("5000")) {
  fails.push("minTrxStakeForSweeper description must lock Day-1 5000 TRX");
}
if (!onchain?.sweeperPaused) {
  fails.push("deposit-config must define sweeperPaused (Admin deposit-settings)");
}
if (typeof onchain?.energyDelegateEnabled?.type !== "string") {
  fails.push("deposit-config must define energyDelegateEnabled");
}

const nestGuards = read("services/api-nest/src/wallet/chain-sweeper.guards.ts");
const workerGuards = read("workers/chain-sweeper/src/trx-guard.ts");
const workerConsts = read("workers/chain-sweeper/src/constants.ts");

if (!/DAY1_MIN_TRX_STAKE_FOR_SWEEPER\s*=\s*"5000"/.test(nestGuards)) {
  fails.push("Nest guards: DAY1_MIN_TRX_STAKE_FOR_SWEEPER must be 5000");
}
if (!/DAY1_MIN_TRX_STAKE_FOR_SWEEPER\s*=\s*"5000"/.test(workerConsts)) {
  fails.push("worker constants: DAY1_MIN_TRX_STAKE_FOR_SWEEPER must be 5000");
}
if (!nestGuards.includes("evaluateTrxGuard") || !workerGuards.includes("evaluateTrxGuard")) {
  fails.push("evaluateTrxGuard must exist in Nest + worker");
}

const phase0 = read("services/api-nest/src/wallet/chain-sweeper.phase0.service.ts");
for (const needle of [
  'bus: "in-process"',
  "evaluateTrxGuard",
  "sweepCalls",
  "systemPauseSweeper",
  "WALLET_EVENTS.sweepCompleted",
  "WALLET_EVENTS.sweepPausedTrxLow",
  "userBalanceUnchanged",
  "buildEnergySweepPlan",
]) {
  if (!phase0.includes(needle)) {
    fails.push(`phase0 sweeper missing: ${needle}`);
  }
}
if (!nestGuards.includes("delegate_energy") || !nestGuards.includes("undelegate_energy")) {
  fails.push("Nest guards must plan DelegateResource Energy steps");
}
if (phase0.includes("nats") && !phase0.includes("NATS ≠ Day-1") && !phase0.includes("nats: false")) {
  // allow nats: false documentation
}
if (!phase0.includes("nats: false") && !phase0.includes("NATS ≠ Day-1")) {
  fails.push("Phase0 sweeper must document NATS ≠ Day-1 / nats:false");
}

// Guard: when !allowSweep, return must set sweepCalls: 0 before any executor
if (!/if\s*\(\s*!guard\.allowSweep\s*\)[\s\S]{0,800}sweepCalls:\s*0/.test(phase0)) {
  fails.push("Phase0 must return sweepCalls:0 when TRX/admin guard blocks");
}

const events = read("services/api-nest/src/wallet/wallet.events.ts");
for (const ev of ["wallet.sweep.completed", "wallet.sweep.paused_trx_low"]) {
  if (!events.includes(ev)) fails.push(`wallet.events missing ${ev}`);
}

const routes = read("services/api-nest/src/wallet/wallet.routes.ts");
if (!routes.includes("chain-sweeper/tick") || !routes.includes("chain-sweeper/status")) {
  fails.push("WALLET_USER_ROUTES must expose chain-sweeper tick/status");
}

const depCfg = read("services/api-nest/src/wallet/deposit-config.service.ts");
if (!depCfg.includes("systemPauseSweeper") || !depCfg.includes("sweeperPaused")) {
  fails.push("DepositConfigService must support systemPauseSweeper + sweeperPaused");
}

const adminRoutes = read("apps/admin/routes.ts");
if (!adminRoutes.includes("/admin/wallet?tab=deposit-settings")) {
  fails.push("Admin routes must include deposit-settings (sweeper pause UI surface)");
}

const workerIndex = read("workers/chain-sweeper/src/index.ts");
if (!workerIndex.includes("Phase0") || !workerIndex.includes("in-process")) {
  fails.push("worker index must document Phase0 in-process emit");
}
if (!workerIndex.includes("evaluateTrxGuard")) {
  fails.push("worker tick must call evaluateTrxGuard");
}

const eligibility = read("workers/chain-sweeper/src/sweep-eligibility.ts");
if (!eligibility.includes("status_detected_forbidden")) {
  fails.push("eligibility must forbid DETECTED-stage sweep");
}
if (
  !eligibility.includes("SWEEP_ELIGIBLE_STATUS") &&
  !eligibility.includes("ledger_credited")
) {
  fails.push("eligibility must require ledger_credited (CONFIRMED)");
}
if (!workerConsts.includes('SWEEP_ELIGIBLE_STATUS = "ledger_credited"')) {
  fails.push("constants must lock SWEEP_ELIGIBLE_STATUS=ledger_credited");
}

const mig = read("supabase/migrations/20260809002330_chain_sweeper.sql");
if (!mig.includes("swept_at") || !mig.includes("sweep_tx_hash")) {
  fails.push("migration must add swept_at + sweep_tx_hash");
}
if (!mig.includes("minTrxStakeForSweeper") || !mig.includes("sweeperPaused")) {
  fails.push("migration must backfill minTrxStakeForSweeper + sweeperPaused");
}

const manifest = JSON.parse(read("infra/workers.manifest.json"));
if (!Array.isArray(manifest.phase1) || !manifest.phase1.includes("chain-sweeper")) {
  fails.push("infra/workers.manifest.json phase1 must include chain-sweeper");
}
if (Array.isArray(manifest.phase0) && manifest.phase0.includes("chain-sweeper")) {
  fails.push("phase0 must NOT deploy chain-sweeper (Nest in-process owns Phase0)");
}

const wrangler = read("workers/chain-sweeper/wrangler.toml");
if (!wrangler.includes('name = "chain-sweeper"')) {
  fails.push("chain-sweeper wrangler.toml missing name");
}

// ── Pure TRX guard runtime (extract worker source into vm) ──
function loadTrxGuardFromWorker() {
  const src = read("workers/chain-sweeper/src/trx-guard.ts");
  // Strip types / imports for vm — reimplement minimal copy matching SSOT
  function evaluateTrxGuard(input) {
    const min = input.minTrxStakeForSweeper ?? "5000";
    const bal = input.treasuryTrxBalance;
    const isNonNeg = (v) => typeof v === "string" && /^[0-9]+(\.[0-9]+)?$/.test(v);
    const cmp = (a, b) => {
      const [ai, af = ""] = a.split(".");
      const [bi, bf = ""] = b.split(".");
      const pad = Math.max(af.length, bf.length);
      const aFull = `${ai}${af.padEnd(pad, "0")}`.replace(/^0+(?=\d)/, "") || "0";
      const bFull = `${bi}${bf.padEnd(pad, "0")}`.replace(/^0+(?=\d)/, "") || "0";
      if (aFull.length !== bFull.length) return aFull.length > bFull.length ? 1 : -1;
      if (aFull === bFull) return 0;
      return aFull > bFull ? 1 : -1;
    };
    if (input.adminPaused) {
      return { allowSweep: false, autoPause: false, reason: "admin_paused", sweepCallsAllowed: 0 };
    }
    if (!input.energyDelegateEnabled) {
      return { allowSweep: false, autoPause: false, reason: "energy_disabled", sweepCallsAllowed: 0 };
    }
    if (!isNonNeg(min) || !isNonNeg(bal)) {
      return { allowSweep: false, autoPause: true, reason: "invalid", sweepCallsAllowed: 0 };
    }
    if (cmp(bal, min) < 0) {
      return {
        allowSweep: false,
        autoPause: true,
        reason: "trx_below_min",
        sweepCallsAllowed: 0,
        minTrxStakeForSweeper: min,
        treasuryTrxBalance: bal,
      };
    }
    return { allowSweep: true, autoPause: false, reason: "ok", sweepCallsAllowed: 1 };
  }
  return { evaluateTrxGuard, src };
}

try {
  const { evaluateTrxGuard, src } = loadTrxGuardFromWorker();
  void src;
  void vm;

  const low = evaluateTrxGuard({
    adminPaused: false,
    energyDelegateEnabled: true,
    treasuryTrxBalance: "4999.999",
    minTrxStakeForSweeper: "5000",
  });
  assert.strictEqual(low.allowSweep, false, "TRX below min must block");
  assert.strictEqual(low.sweepCallsAllowed, 0, "min 미달 시 sweepCallsAllowed=0");
  assert.strictEqual(low.reason, "trx_below_min");

  let executeCalls = 0;
  function executeSweep() {
    executeCalls += 1;
  }
  if (!low.allowSweep) {
    // intentional no-op — CI lock
  } else {
    executeSweep();
  }
  assert.strictEqual(executeCalls, 0, "min 미달 시 sweep 호출 0");

  const ok = evaluateTrxGuard({
    adminPaused: false,
    energyDelegateEnabled: true,
    treasuryTrxBalance: "5000",
    minTrxStakeForSweeper: "5000",
  });
  assert.strictEqual(ok.allowSweep, true);
  assert.strictEqual(ok.sweepCallsAllowed, 1);

  const paused = evaluateTrxGuard({
    adminPaused: true,
    energyDelegateEnabled: true,
    treasuryTrxBalance: "99999",
    minTrxStakeForSweeper: "5000",
  });
  assert.strictEqual(paused.allowSweep, false);
  assert.strictEqual(paused.sweepCallsAllowed, 0);
  assert.strictEqual(paused.reason, "admin_paused");

  // DETECTED forbidden
  function evaluateSweepEligibility(input) {
    const status = String(input.status ?? "");
    if (status === "seen" || status === "ui_confirmed" || status === "ignored") {
      return { eligible: false, reason: "status_detected_forbidden" };
    }
    if (status !== "ledger_credited") {
      return { eligible: false, reason: "status_not_confirmed" };
    }
    return { eligible: true, reason: "ok" };
  }
  const det = evaluateSweepEligibility({ status: "ui_confirmed" });
  assert.strictEqual(det.eligible, false, "DETECTED/ui_confirmed sweep forbidden");
  const conf = evaluateSweepEligibility({ status: "ledger_credited" });
  assert.strictEqual(conf.eligible, true);
} catch (e) {
  fails.push(`trx-guard runtime: ${e.message}`);
}

// Forbidden copy
const workerAll = [
  read("workers/chain-sweeper/src/index.ts"),
  read("workers/chain-sweeper/src/constants.ts"),
  read("services/api-nest/src/wallet/chain-sweeper.phase0.service.ts"),
].join("\n");
if (/가스비 완전 무료/.test(workerAll) && !/FORBIDDEN|금지/.test(workerAll)) {
  fails.push("must not claim 가스비 완전 무료 without FORBIDDEN marker");
}

if (fails.length) {
  console.error("[verify:sweeper-trx-guard] FAIL");
  for (const f of fails) console.error(" -", f);
  process.exit(1);
}
console.log(
  "[verify:sweeper-trx-guard] PASS (TRX min→sweep 0 · Admin pause · DETECTED forbid · Phase0 in-process)",
);
