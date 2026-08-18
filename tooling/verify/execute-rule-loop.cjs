/**
 * verify:execute-rule-loop — Engine §0.9 E-R5 · §48.13
 * Nest → settlement_rule.cjs (Rust SSOT · FFI 0)
 * GET /api/v1/trades/:id · POST /api/v1/trades/:id/execute-tick
 * Soft60/Hard90/REQUEUE/MATCH_TIMEOUT · MATCH_SUCCESS → settlement journal
 * SettlementCompletedFanout unmodified · ticker/mission/demo Rule input 0
 */
const fs = require("fs");
const path = require("path");

const root = path.resolve(__dirname, "../..");
const fails = [];

function mustExist(rel) {
  if (!fs.existsSync(path.join(root, rel))) fails.push(`missing: ${rel}`);
}

function read(rel) {
  const p = path.join(root, rel);
  if (!fs.existsSync(p)) {
    fails.push(`missing: ${rel}`);
    return "";
  }
  return fs.readFileSync(p, "utf8");
}

const files = [
  "schemas/trade-execution-state.v1.json",
  "services/api-nest/src/trades/trades.user.routes.ts",
  "services/api-nest/src/trades/trades.user.controller.ts",
  "services/api-nest/src/trades/trades.execution.service.ts",
  "services/api-nest/src/trades/trades.module.ts",
  "services/engine-rust/settlement_rule.cjs",
  "services/engine-rust/src/settlement_rule.rs",
  "services/api-nest/src/missions/settlement-completed.fanout.ts",
];
for (const f of files) mustExist(f);

if (fails.length) {
  console.error("[verify:execute-rule-loop] FAIL\n- " + fails.join("\n- "));
  process.exit(1);
}

const routes = read("services/api-nest/src/trades/trades.user.routes.ts");
const ctrl = read("services/api-nest/src/trades/trades.user.controller.ts");
const svc = read("services/api-nest/src/trades/trades.execution.service.ts");
const mod = read("services/api-nest/src/trades/trades.module.ts");
const app = read("services/api-nest/src/app.module.ts");
const idx = read("services/api-nest/src/trades/index.ts");
const fanout = read(
  "services/api-nest/src/missions/settlement-completed.fanout.ts",
);
const schema = JSON.parse(read("schemas/trade-execution-state.v1.json"));
const rule = require(path.join(
  root,
  "services/engine-rust/settlement_rule.cjs",
));

// --- routes ---
if (!routes.includes('get: "trades/:id"')) {
  fails.push('TRADE_USER_ROUTES.get must be "trades/:id"');
}
if (!routes.includes('executeTick: "trades/:id/execute-tick"')) {
  fails.push(
    'TRADE_USER_ROUTES.executeTick must be "trades/:id/execute-tick"',
  );
}
if (!/as const/.test(routes)) {
  fails.push("TRADE_USER_ROUTES must use as const");
}

// --- controller ---
if (!ctrl.includes("@Get(TRADE_USER_ROUTES.get)")) {
  fails.push("GET trade must bind TRADE_USER_ROUTES.get");
}
if (!ctrl.includes("@Post(TRADE_USER_ROUTES.executeTick)")) {
  fails.push("POST execute-tick must bind TRADE_USER_ROUTES.executeTick");
}
if (!ctrl.includes("TradeExecutionService")) {
  fails.push("controller must inject TradeExecutionService");
}
if (/@Controller\(\s*["']admin["']\s*\)/.test(ctrl)) {
  fails.push("user trades controller must not be under admin");
}
if (/@Query\(\s*["']userId["']\s*\)/.test(ctrl)) {
  fails.push("must not take @Query('userId') — WalletController pattern forbidden");
}
if (/body\.userId/.test(ctrl)) {
  fails.push("must not trust body.userId");
}
if (!ctrl.includes("req.user")) {
  fails.push("must derive userId from JWT req.user");
}
if (!ctrl.includes("AUTH_REQUIRED") && !ctrl.includes("UnauthorizedException")) {
  fails.push("missing UnauthorizedException / AUTH_REQUIRED");
}

// --- service: settlement_rule.cjs wiring · no FFI ---
if (!svc.includes("settlement_rule.cjs")) {
  fails.push("TradeExecutionService must require settlement_rule.cjs");
}
if (!svc.includes("evaluateExecution")) {
  fails.push("must call settlement_rule.evaluateExecution");
}
for (const needle of [
  "MATCH_SUCCESS",
  "REQUEUE",
  "MATCH_TIMEOUT",
  "SOFT_SEC",
  "HARD_SEC",
  "journalType: \"settlement\"",
  "participate_unlock",
  'transport: "polling"',
]) {
  if (!svc.includes(needle)) {
    fails.push(`trades.execution.service missing: ${needle}`);
  }
}

// Soft60 / Hard90 constants from rule mirror
if (rule.SOFT_SEC !== 60) fails.push(`SOFT_SEC want 60 got ${rule.SOFT_SEC}`);
if (rule.HARD_SEC !== 90) fails.push(`HARD_SEC want 90 got ${rule.HARD_SEC}`);

// No new Rust FFI / neon / napi
if (
  /\bnapi\b|\bneon\b|\.node["']|ffi-napi|node-ffi|SettlementRuleNative|dlopen/.test(
    svc,
  )
) {
  fails.push("new Rust FFI forbidden — Phase0 uses settlement_rule.cjs only");
}

// P1-3 (Engine Final Re-Verification Audit) — trade_executions UPDATEs must
// be status-guarded so a losing concurrent execute-tick cannot regress a
// row another call already finalized (fund-safety was always OK via ledger
// idempotency; this closes the display/state-machine regression).
const statusGuardedUpdates = (
  svc.match(/status IN \('running', ?'requeue'\)/g) || []
).length;
if (statusGuardedUpdates < 3) {
  fails.push(
    `trades.execution.service must status-guard all 3 trade_executions UPDATEs (found ${statusGuardedUpdates}, want >=3)`,
  );
}
if (!svc.includes("reloadTrade")) {
  fails.push("trades.execution.service missing reloadTrade fallback for 0-row guarded UPDATE");
}

// Forbidden Rule inputs: ticker / mission / demo
for (const bad of [
  "tickerMode",
  "demoSchedule",
  "PublicTicker",
  "MissionReward",
  "missionCatalog",
  "fomo",
  "Math.random",
]) {
  if (svc.includes(bad)) {
    fails.push(`Rule path must not reference ${bad}`);
  }
}

// External HTTP 0 on execute path
if (
  /\bfetch\s*\(|\baxios\b|\bhttps?\.(get|request|post)\b|node-fetch|undici/.test(
    svc,
  )
) {
  fails.push("execute-tick path must not call external HTTP APIs");
}

// SettlementCompletedFanout must remain listener-only (unmodified contract)
if (!fanout.includes("LEDGER_EVENTS.journalPosted")) {
  fails.push("SettlementCompletedFanout must listen ledger.journal.posted");
}
if (!fanout.includes('journalType !== "settlement"')) {
  fails.push("SettlementCompletedFanout must filter journalType=settlement");
}
if (
  /evaluateExecution|settlement_rule\.cjs|TradeExecutionService/.test(fanout)
) {
  fails.push("SettlementCompletedFanout must not couple to Rule/execute service");
}

// MATCH_SUCCESS posts settlement → fanout consumes (service must NOT emit settlement.completed)
if (
  /SETTLEMENT_EVENTS\.completed|settlement\.completed/.test(svc) &&
  !svc.includes("SettlementCompletedFanout listens")
) {
  fails.push(
    "execute service must not emit settlement.completed (fanout owns emit)",
  );
}

// Module wiring
if (!mod.includes("TradeExecutionService")) {
  fails.push("TradesModule must provide TradeExecutionService");
}
if (!mod.includes("TradesUserController")) {
  fails.push("TradesModule must register TradesUserController");
}
if (!mod.includes("SimulationModule")) {
  fails.push("TradesModule must import SimulationModule (R8)");
}
if (!mod.includes("RiskModule")) {
  fails.push("TradesModule must import RiskModule");
}
if (!app.includes("TradesModule")) {
  fails.push("AppModule must import TradesModule");
}
if (!idx.includes("TradeExecutionService") || !idx.includes("TRADE_USER_ROUTES")) {
  fails.push("trades/index.ts must export service + routes");
}

// Schema contract
const codes = schema.properties?.resultCode?.enum || [];
for (const code of [
  "MATCH_SUCCESS",
  "REQUEUE",
  "MATCH_TIMEOUT",
  "PRICE_MOVED",
  "BELOW_MIN_PROFIT",
]) {
  if (!codes.includes(code)) {
    fails.push(`trade-execution-state.v1 missing resultCode ${code}`);
  }
}

// Live Rule unit: Soft/Hard + REQUEUE + MATCH_TIMEOUT (no HTTP)
const base = {
  circuitStatus: "closed",
  userStatus: "active",
  opportunityStatus: "available",
  compareReady: true,
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
};

const success = rule.evaluateExecution({
  ...base,
  nowMs: 1_000_000,
  participateAcceptedAtMs: 1_000_000,
  staleAtMs: 999_000,
});
if (success !== "MATCH_SUCCESS") {
  fails.push(`want MATCH_SUCCESS got ${success}`);
}

const requeue = rule.evaluateExecution({
  ...base,
  nowMs: 1_000_000,
  participateAcceptedAtMs: 1_000_000,
  staleAtMs: 999_000,
  listingLegsFresh: false,
});
if (requeue !== "REQUEUE") {
  fails.push(`want REQUEUE got ${requeue}`);
}

const timeout = rule.evaluateExecution({
  ...base,
  nowMs: 1_000_000 + 90_000,
  participateAcceptedAtMs: 1_000_000,
  staleAtMs: 999_000,
});
if (timeout !== "MATCH_TIMEOUT") {
  fails.push(`want MATCH_TIMEOUT got ${timeout}`);
}

const soft = rule.softDeadlineMs(1_000_000);
const hard = rule.hardDeadlineMs(1_000_000);
if (soft !== 1_000_000 + 60_000) fails.push("softDeadlineMs must be T0+60s");
if (hard !== 1_000_000 + 90_000) fails.push("hardDeadlineMs must be T0+90s");

// package + catalog
const pkg = JSON.parse(read("package.json"));
if (
  pkg.scripts?.["verify:execute-rule-loop"] !==
  "node tooling/verify/execute-rule-loop.cjs"
) {
  fails.push("package.json missing verify:execute-rule-loop script");
}
const catalog = read("tooling/verify/CATALOG.md");
if (!catalog.includes("execute-rule-loop")) {
  fails.push("CATALOG.md must list execute-rule-loop");
}

if (fails.length) {
  console.error("[verify:execute-rule-loop] FAIL\n- " + fails.join("\n- "));
  process.exit(1);
}
console.log(
  "[verify:execute-rule-loop] PASS (trades GET/execute-tick · settlement_rule.cjs · Soft60/Hard90 · fanout boundary)",
);
