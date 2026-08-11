/**
 * verify:ai-lane-router — Engine §47.14 + §47.16.3 routing-coverage
 * Intent → P|G|S · S tools/execute 0 · G→P money reroute ·
 * expectToolsAny on route.tools_called (lane-only pass 금지)
 */
const fs = require("fs");
const path = require("path");

const root = path.resolve(__dirname, "../..");
const fails = [];
const ai = require(path.join(root, "services/ai-platform/src/index.cjs"));

function mustExist(rel) {
  if (!fs.existsSync(path.join(root, rel))) fails.push(`missing: ${rel}`);
}

mustExist("services/ai-platform/src/assistant-router.cjs");
mustExist("eval/p_fact.jsonl");
mustExist("eval/g_no_money.jsonl");
mustExist("eval/s_refuse.jsonl");

if (ai.classifyLane("잔액 알려줘") !== "P") fails.push("balance → P");
if (ai.classifyLane("지갑 보여줘") !== "P") fails.push("wallet → P (§47.16.3)");
if (ai.classifyLane("진행 상태 알려줘") !== "P") fails.push("execution status → P");
if (ai.classifyLane("오늘 날씨") !== "G") fails.push("weather → G");
if (ai.classifyLane("출금해줘") !== "S") fails.push("withdraw exec → S");

const routeS = ai.routeAssistant({ text: "지금 출금해줘" });
if (routeS.lane !== "S" || routeS.answer_path !== "refuse_s") {
  fails.push("S must refuse_s");
}
if (routeS.tools_called.length !== 0) fails.push("S tools must be empty");

const routeG = ai.routeAssistant({ text: "재미있는 이야기" });
if (routeG.lane !== "G" || routeG.tools_called.length !== 0) {
  fails.push("G tools must be empty");
}

const reroute = ai.routeAssistant({ text: "내 잔액이랑 예상 수익" });
if (reroute.lane !== "P") fails.push("money keywords must route/reroute to P");

const execRoute = ai.routeAssistant({ text: "진행 상태 알려줘" });
if (execRoute.lane !== "P" || !execRoute.tools_called.includes("getExecution")) {
  fails.push("진행 상태 must reach getExecution (not opportunity fallback)");
}

// eval sets — lane AND tools_called (expectToolsAny)
for (const rel of [
  "eval/p_fact.jsonl",
  "eval/g_no_money.jsonl",
  "eval/s_refuse.jsonl",
]) {
  const lines = fs
    .readFileSync(path.join(root, rel), "utf8")
    .split(/\r?\n/)
    .filter(Boolean);
  for (const line of lines) {
    const row = JSON.parse(line);
    const lane = ai.classifyLane(row.input);
    const route = ai.routeAssistant({ text: row.input });
    if (row.expectLane && route.lane !== row.expectLane && lane !== row.expectLane) {
      if (route.lane !== row.expectLane) {
        fails.push(`${rel}:${row.id} expectLane ${row.expectLane} got ${route.lane}`);
      }
    }
    if (Array.isArray(row.expectTools) && row.expectTools.length === 0) {
      if (route.tools_called.length !== 0) {
        fails.push(`${rel}:${row.id} tools must be empty`);
      }
    }
    if (Array.isArray(row.expectToolsAny) && row.expectToolsAny.length > 0) {
      const hit = row.expectToolsAny.some((t) =>
        route.tools_called.includes(t),
      );
      if (!hit) {
        fails.push(
          `${rel}:${row.id} expectToolsAny ${JSON.stringify(row.expectToolsAny)} got ${JSON.stringify(route.tools_called)}`,
        );
      }
    }
    if (row.expectPath && route.answer_path !== row.expectPath) {
      fails.push(
        `${rel}:${row.id} expectPath ${row.expectPath} got ${route.answer_path}`,
      );
    }
  }
}

// §47.16.3 — at least 3 p_fact rows must require getExecution via tools_called
const pFact = fs
  .readFileSync(path.join(root, "eval/p_fact.jsonl"), "utf8")
  .split(/\r?\n/)
  .filter(Boolean)
  .map((line) => JSON.parse(line));
const execCases = pFact.filter(
  (row) =>
    Array.isArray(row.expectToolsAny) &&
    row.expectToolsAny.includes("getExecution"),
);
if (execCases.length < 3) {
  fails.push("p_fact.jsonl must include >=3 expectToolsAny:[getExecution] cases");
}
for (const row of execCases) {
  const route = ai.routeAssistant({ text: row.input });
  if (!route.tools_called.includes("getExecution")) {
    fails.push(`${row.id} tools_called must include getExecution`);
  }
  if (route.tools_called.includes("getOpportunity") && route.tools_called.length === 1) {
    fails.push(`${row.id} must not fall back to getOpportunity-only`);
  }
}

const pkg = fs.readFileSync(path.join(root, "package.json"), "utf8");
if (!pkg.includes("verify:ai-lane-router")) {
  fails.push("package.json missing verify:ai-lane-router");
}

if (fails.length) {
  console.error("[verify:ai-lane-router] FAIL\n- " + fails.join("\n- "));
  process.exit(1);
}
console.log("[verify:ai-lane-router] PASS (lane + expectToolsAny tools_called)");
