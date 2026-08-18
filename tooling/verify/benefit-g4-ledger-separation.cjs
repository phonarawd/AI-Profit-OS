/**
 * verify:benefit-g4-ledger-separation — M-A11 · Engine §48.13.4 · UI §5.9.5
 * G4/demo/ticker/presentation → mission accrual / Promo Pool ledger path = 0
 */
const fs = require("fs");
const path = require("path");

const root = path.resolve(__dirname, "../..");
const fails = [];

function read(rel) {
  return fs.readFileSync(path.join(root, rel), "utf8");
}

const engine = read(".cursor/plans/ai_profit_os_02_engine_b2c3d4e5.plan.md");
if (!engine.includes("G4/demo/ticker/presentation → accrual 경로 **0**")) {
  fails.push("Engine §48.13.4 must forbid G4→accrual");
}

const money = read(".cursor/plans/ai_profit_os_01_money_c3d4e5f6.plan.md");
if (!money.includes("G4/demo→ledger **0**")) {
  fails.push("Money §51.8a must forbid G4/demo ledger path");
}

const rulePath = path.join(root, "services/engine-rust/src/settlement_rule.rs");
if (fs.existsSync(rulePath)) {
  const rule = fs.readFileSync(rulePath, "utf8");
  if (/ticker|demo|g4|G4|hybrid/i.test(rule) && /accrual|mission|promo_pool/i.test(rule)) {
    fails.push("settlement_rule must not couple G4/ticker with mission accrual");
  }
}

const missionDir = path.join(root, "services/api-nest/src/missions");
if (fs.existsSync(missionDir)) {
  for (const name of fs.readdirSync(missionDir)) {
    if (!/\.ts$/.test(name)) continue;
    const t = fs.readFileSync(path.join(missionDir, name), "utf8");
    // Coupling to ticker/demo presentation as accrual trigger = FAIL
    if (
      /PublicTickerEvent|ticker\.mode|demoHybrid|g4Mode|presentation\.duration/i.test(
        t,
      )
    ) {
      fails.push(`missions/${name} must not couple G4/ticker/presentation → accrual`);
    }
  }

  const evaluator = read(
    "services/api-nest/src/missions/mission-reward.evaluator.ts",
  );
  if (!evaluator.includes("g4TickerPresentationCoupling: false")) {
    fails.push("MissionRewardEvaluator must declare g4TickerPresentationCoupling: false");
  }
  const fanout = read(
    "services/api-nest/src/missions/settlement-completed.fanout.ts",
  );
  if (!fanout.includes("g4TickerCoupling: false")) {
    fails.push("SettlementCompletedFanout must declare g4TickerCoupling: false");
  }
} else {
  fails.push("missions Nest module missing (fanout boundary not landed)");
}

if (fails.length) {
  console.error("[verify:benefit-g4-ledger-separation] FAIL");
  for (const f of fails) console.error(" -", f);
  process.exit(1);
}
console.log("[verify:benefit-g4-ledger-separation] PASS");
