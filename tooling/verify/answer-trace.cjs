/**
 * verify:answer-trace — Engine §47.5 / §47.15
 * Every assistant response must carry lane + trace fields
 */
const fs = require("fs");
const path = require("path");

const root = path.resolve(__dirname, "../..");
const fails = [];
const ai = require(path.join(root, "services/ai-platform/src/index.cjs"));

function mustExist(rel) {
  if (!fs.existsSync(path.join(root, rel))) fails.push(`missing: ${rel}`);
}

mustExist("schemas/ai-answer-trace.v1.json");
mustExist("services/api-nest/src/ai/coach.orchestrator.ts");
mustExist("services/api-nest/src/ai/ai-logs.admin.service.ts");

const schema = JSON.parse(
  fs.readFileSync(
    path.join(root, "schemas/ai-answer-trace.v1.json"),
    "utf8",
  ),
);
for (const req of [
  "intent",
  "lane",
  "facts_used",
  "tools_called",
  "provider_id",
  "answer_path",
  "guard_result",
]) {
  if (!(schema.required || []).includes(req)) {
    fails.push(`ai-answer-trace schema missing required ${req}`);
  }
}

const rec = ai.buildAiLogRecord({
  intent: "balance",
  lane: "P",
  tools_called: ["getBalance"],
  facts_used: [],
  provider_id: "none",
  answer_path: "fact",
  guard_result: { status: "pass" },
  answer_preview: "ok",
});
if (rec.schema !== "ai-answer-trace.v1") fails.push("trace schema id");
if (rec.lane !== "P") fails.push("trace lane");

const orch = fs.readFileSync(
  path.join(root, "services/api-nest/src/ai/coach.orchestrator.ts"),
  "utf8",
);
for (const needle of [
  "logs.append",
  "trace_id",
  "lane",
  "provider_id",
  "coachAnswerCompleted",
]) {
  if (!orch.includes(needle)) {
    fails.push(`CoachOrchestrator missing ${needle}`);
  }
}

const ctrl = fs.readFileSync(
  path.join(root, "services/api-nest/src/ai/coach.controller.ts"),
  "utf8",
);
if (!ctrl.includes("text/event-stream") && !ctrl.includes("event-stream")) {
  fails.push("CoachController must expose SSE");
}
if (!ctrl.includes("me/peotteok/chat")) {
  fails.push("CoachController route me/peotteok/chat");
}

const pkg = fs.readFileSync(path.join(root, "package.json"), "utf8");
if (!pkg.includes("verify:answer-trace")) {
  fails.push("package.json missing verify:answer-trace");
}

if (fails.length) {
  console.error("[verify:answer-trace] FAIL\n- " + fails.join("\n- "));
  process.exit(1);
}
console.log("[verify:answer-trace] PASS");
