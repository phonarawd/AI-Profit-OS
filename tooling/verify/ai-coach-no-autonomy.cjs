/**
 * verify:ai-coach-no-autonomy — Engine §47.12
 * All lanes: withdraw/payout mutate path 0
 */
const fs = require("fs");
const path = require("path");

const root = path.resolve(__dirname, "../..");
const fails = [];
const ai = require(path.join(root, "services/ai-platform/src/index.cjs"));

function read(rel) {
  return fs.readFileSync(path.join(root, rel), "utf8");
}

const coachFiles = [
  "services/ai-platform/src/fact-tools.cjs",
  "services/ai-platform/src/coach-templates.cjs",
  "services/ai-platform/src/assistant-router.cjs",
  "services/api-nest/src/ai/coach.orchestrator.ts",
  "services/api-nest/src/ai/fact-tool.service.ts",
  "services/api-nest/src/ai/coach.controller.ts",
];

for (const f of coachFiles) {
  if (!fs.existsSync(path.join(root, f))) fails.push(`missing: ${f}`);
}

if (fails.length) {
  console.error("[verify:ai-coach-no-autonomy] FAIL\n- " + fails.join("\n- "));
  process.exit(1);
}

for (const action of ai.FORBIDDEN_L3_MONEY_ACTIONS) {
  if (ai.FACT_TOOLS.some((t) => t.toLowerCase().includes(action))) {
    fails.push(`FACT_TOOLS overlaps forbidden ${action}`);
  }
}

const refuse = ai.S_REFUSE_TEMPLATE;
if (!refuse?.deepLink || !/withdraw/i.test(refuse.deepLink)) {
  fails.push("S refuse must deep-link to withdraw UI (not execute)");
}
if (/실행했|지급했|완료했/.test(refuse.text || "")) {
  fails.push("S refuse must not claim execution");
}

const orch = read("services/api-nest/src/ai/coach.orchestrator.ts");
for (const bad of [
  "execute_withdraw",
  "approve_withdraw",
  "ledger_post",
  "credit_balance",
  "raise_limit",
]) {
  if (orch.includes(bad)) {
    fails.push(`CoachOrchestrator must not call ${bad}`);
  }
}

const routeS = ai.routeAssistant({ text: "지급해줘" });
if (routeS.lane !== "S" || routeS.tools_called.length !== 0) {
  fails.push("payout request must be S with empty tools");
}

const guard = ai.guardAnswer({
  lane: "S",
  toolsCalled: [],
  answerText: refuse.text,
});
if (!guard.pass) fails.push("S refuse template must pass guard");

const pkg = read("package.json");
if (!pkg.includes("verify:ai-coach-no-autonomy")) {
  fails.push("package.json missing verify:ai-coach-no-autonomy");
}

if (fails.length) {
  console.error("[verify:ai-coach-no-autonomy] FAIL\n- " + fails.join("\n- "));
  process.exit(1);
}
console.log("[verify:ai-coach-no-autonomy] PASS");
