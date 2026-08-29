/**
 * verify:ai-coach-fact-only — Engine §47.12 P-lane
 * Unregistered Fact/tool → money/status answer 0
 */
const fs = require("fs");
const path = require("path");

const root = path.resolve(__dirname, "../..");
const fails = [];
const ai = require(path.join(root, "services/ai-platform/src/index.cjs"));

function mustExist(rel) {
  if (!fs.existsSync(path.join(root, rel))) fails.push(`missing: ${rel}`);
}

const files = [
  "services/ai-platform/src/fact-tools.cjs",
  "services/ai-platform/src/coach-templates.cjs",
  "services/ai-platform/src/coach-prompt.cjs",
  "services/api-nest/src/ai/fact-tool.service.ts",
  "services/api-nest/src/ai/coach.orchestrator.ts",
  "services/api-nest/src/ai/coach.controller.ts",
  "packages/ui/copy/ko/peotteok.ts",
  "eval/p_fact.jsonl",
];
for (const f of files) mustExist(f);

if (fails.length) {
  console.error("[verify:ai-coach-fact-only] FAIL\n- " + fails.join("\n- "));
  process.exit(1);
}

if (!Array.isArray(ai.FACT_TOOLS) || ai.FACT_TOOLS.length < 13) {
  fails.push("FACT_TOOLS must list ≥13 read-only tools");
}

for (const bad of [
  "withdraw",
  "execute_withdraw",
  "payout",
  "raise_limit",
  "credit_balance",
  "ledger_post",
]) {
  if (ai.FACT_TOOLS.includes(bad)) {
    fails.push(`FACT_TOOLS must not include ${bad}`);
  }
}

try {
  ai.assertToolsAllowedForLane("P", ["getBalance", "unknownTool"]);
  fails.push("unknown tool must throw on P");
} catch (e) {
  if (!String(e.message || "").includes("FACT_TOOL_UNKNOWN")) {
    fails.push("unknown tool wrong error");
  }
}

const fresh = ai.buildFactCard({
  source: "ledger",
  payload: { profitUsdt: "3.50", liabilityUsdt: "10.00", principalUsdt: "6.50" },
  captured_at: "2026-08-09T12:00:00.000Z",
  expires_at: "2026-08-09T12:05:00.000Z",
  confidence: 1,
});
const answer = ai.renderFactAnswer([fresh], { toneBand: "mid" });
if (!answer.includes("3.50")) {
  fails.push("P fact answer must use Fact profitUsdt");
}
if (/확정\s*수익|원금\s*보장/.test(answer)) {
  fails.push("P answer must not invent guarantee copy");
}

const missingProfit = ai.renderFactAnswer([
  ai.buildFactCard({
    source: "ledger",
    payload: { liabilityUsdt: "10.00" },
    captured_at: "2026-08-23T00:00:00.000Z",
    expires_at: "2026-08-23T00:05:00.000Z",
    confidence: 1,
  }),
], { now: "2026-08-23T00:01:00.000Z" });
if (!String(missingProfit).includes("\uD655\uC778\uD560 \uC218 \uC5C6")) {
  fails.push("missing profitUsdt must be UNAVAILABLE, not invented 0");
}
if (/\uC218\uC775\uC740 0/.test(missingProfit)) {
  fails.push("missing profitUsdt must not invent 0 copy");
}

const empty = ai.renderFactAnswer([], {});
if (!empty || !String(empty).includes("다시")) {
  fails.push("empty facts must refresh template (no invented numbers)");
}

const nestFact = fs.readFileSync(
  path.join(root, "services/api-nest/src/ai/fact-tool.service.ts"),
  "utf8",
);
for (const tool of ai.FACT_TOOLS) {
  if (!nestFact.includes(tool)) {
    fails.push(`FactToolService missing loader for ${tool}`);
  }
}

const pkg = fs.readFileSync(path.join(root, "package.json"), "utf8");
if (!pkg.includes("verify:ai-coach-fact-only")) {
  fails.push("package.json missing verify:ai-coach-fact-only");
}

const pHelpInput = "\uC774\uC6A9\uBC95 FAQ \uC54C\uB824\uC918";
if (ai.classifyLane(pHelpInput) !== "P") {
  fails.push("p_help input must classify as P");
}
const pHelpRoute = ai.routeAssistant({ text: pHelpInput });
if (!pHelpRoute.tools_called.includes("searchHelp")) {
  fails.push("p_help must route searchHelp");
}
try {
  ai.rankHelpChunks("faq", [{ text: "faq guide" }], 1);
} catch (e) {
  fails.push("rankHelpChunks must not throw without tags: " + e.message);
}
const helpSrc = fs.readFileSync(path.join(root, "services/api-nest/src/ai/help-rag.service.ts"), "utf8");
const llmSrc = fs.readFileSync(path.join(root, "services/api-nest/src/ai/llm.adapter.service.ts"), "utf8");
const ctrlSrc = fs.readFileSync(path.join(root, "services/api-nest/src/ai/coach.controller.ts"), "utf8");
const orchSrc = fs.readFileSync(path.join(root, "services/api-nest/src/ai/coach.orchestrator.ts"), "utf8");
if (!helpSrc.includes("P_HELP_FAIL_CLOSED")) fails.push("HelpRagService missing P_HELP_FAIL_CLOSED");
if (!nestFact.includes("failClosedHelpFacts")) fails.push("FactToolService missing failClosedHelpFacts");
if (!llmSrc.includes("P_HELP_FAIL_CLOSED")) fails.push("LlmAdapterService missing P_HELP_FAIL_CLOSED");
if (!ctrlSrc.includes("P_HELP_FAIL_CLOSED") || !/fail_closed/.test(ctrlSrc)) {
  fails.push("CoachController chatOnce must fail-closed");
}
if (!orchSrc.includes("P_HELP_FAIL_CLOSED")) fails.push("CoachOrchestrator missing P_HELP_FAIL_CLOSED");

if (fails.length) {
  console.error("[verify:ai-coach-fact-only] FAIL\n- " + fails.join("\n- "));
  process.exit(1);
}
console.log("[verify:ai-coach-fact-only] PASS");
