/**
 * verify:mission-auto-payout — Money §51.8a · Engine §48.13.4
 * Nest MissionRewardEvaluator async fanout · Rule/settlement_rule 불변
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

const required = [
  "schemas/mission-definition.v1.json",
  "schemas/mission-accrual.v1.json",
  ".cursor/plans/ai_profit_os_01_money_c3d4e5f6.plan.md",
  ".cursor/plans/ai_profit_os_02_engine_b2c3d4e5.plan.md",
  ".cursor/plans/ai_profit_os_03_ui_ux_d4e5f6a7.plan.md",
  "services/api-nest/src/missions/mission-reward.evaluator.ts",
  "services/api-nest/src/missions/settlement-completed.fanout.ts",
  "services/api-nest/src/missions/mission.accrual.service.ts",
  "services/api-nest/src/missions/mission.module.ts",
  "services/api-nest/src/missions/mission.events.ts",
  "supabase/migrations/20260809042549_mission_auto_accrual_fanout.sql",
];
for (const f of required) mustExist(f);

const money = read(".cursor/plans/ai_profit_os_01_money_c3d4e5f6.plan.md");
for (const needle of [
  "### 51.8a Mission Auto-Accrual",
  "amountUsdtSnap",
  "queued_pool",
  "manual per-user grant",
  "M-A1",
  "ME1",
]) {
  if (!money.includes(needle)) fails.push(`Money plan missing: ${needle}`);
}

const engine = read(".cursor/plans/ai_profit_os_02_engine_b2c3d4e5.plan.md");
for (const needle of [
  "#### 48.13.4 Mission reward fanout",
  "MissionRewardEvaluator",
  "match-success-rule-engine",
]) {
  if (!engine.includes(needle)) fails.push(`Engine plan missing: ${needle}`);
}

const def = read("schemas/mission-definition.v1.json");
if (!def.includes('"const": true') || !def.includes("autoClaim")) {
  fails.push("mission-definition must lock autoClaim: true");
}

const acc = read("schemas/mission-accrual.v1.json");
for (const st of ["queued_pool", "pending_hold", "released", "clawed_back"]) {
  if (!acc.includes(`"${st}"`)) fails.push(`mission-accrual missing status ${st}`);
}

// settlement_rule must NOT import mission evaluator
const rulePath = "services/engine-rust/src/settlement_rule.rs";
if (fs.existsSync(path.join(root, rulePath))) {
  const rule = read(rulePath);
  if (/mission|MissionReward|benefit_hub/i.test(rule)) {
    fails.push("settlement_rule.rs must not reference mission accrual (§48.13.4)");
  }
}

const evaluator = read(
  "services/api-nest/src/missions/mission-reward.evaluator.ts",
);
for (const needle of [
  "MissionRewardEvaluator",
  "SETTLEMENT_EVENTS.completed",
  "safeEvaluateSettlement",
  "settlementLedgerImmutable",
  "g4TickerPresentationCoupling: false",
  "ruleEngineCoupling: false",
  "void this.safeEvaluateSettlement",
  "Money §51.8a",
]) {
  if (!evaluator.includes(needle)) {
    fails.push(`MissionRewardEvaluator missing: ${needle}`);
  }
}

const fanout = read(
  "services/api-nest/src/missions/settlement-completed.fanout.ts",
);
for (const needle of [
  "LEDGER_EVENTS.journalPosted",
  "SETTLEMENT_EVENTS.completed",
  'journalType !== "settlement"',
  "settlementLedgerImmutable: true",
  "g4TickerCoupling: false",
]) {
  if (!fanout.includes(needle)) {
    fails.push(`SettlementCompletedFanout missing: ${needle}`);
  }
}

const appMod = read("services/api-nest/src/app.module.ts");
if (!appMod.includes("MissionModule")) {
  fails.push("AppModule must import MissionModule");
}

const types = read("services/api-nest/src/ledger/ledger.types.ts");
if (!types.includes('"mission_reward"') || !types.includes('"mission_clawback"')) {
  fails.push("ledger.types must include mission_reward / mission_clawback");
}

const mig = read(
  "supabase/migrations/20260809042549_mission_auto_accrual_fanout.sql",
);
for (const needle of [
  "mission_accruals",
  "mission_definitions",
  "mission_program_config",
  "mission_reward",
  "UNIQUE (idempotency_key)",
  "amount_usdt_snap",
  "'M07'",
]) {
  if (!mig.includes(needle)) fails.push(`migration missing: ${needle}`);
}

// Accrual service must freeze amountUsdtSnap · never G4 path
const accrual = read("services/api-nest/src/missions/mission.accrual.service.ts");
if (/PublicTickerEvent|ticker\.mode|demoHybrid|g4Mode/i.test(accrual)) {
  fails.push("mission.accrual must not reference G4/ticker demo paths");
}
if (!accrual.includes("amount_usdt_snap") || !accrual.includes("queued_pool")) {
  fails.push("mission.accrual must snap amount + support queued_pool");
}

if (fails.length) {
  console.error("[verify:mission-auto-payout] FAIL");
  for (const f of fails) console.error(" -", f);
  process.exit(1);
}
console.log("[verify:mission-auto-payout] PASS (§51.8a·§48.13.4 Nest fanout)");
