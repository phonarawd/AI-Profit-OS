/**
 * verify:ai-lane-router — Engine §47.14
 * Intent → P|G|S · S tools/execute 0 · G→P money reroute
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

// eval sets
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
      // allow classify vs final route for reroute cases — check final route
      if (route.lane !== row.expectLane) {
        fails.push(`${rel}:${row.id} expectLane ${row.expectLane} got ${route.lane}`);
      }
    }
    if (Array.isArray(row.expectTools) && row.expectTools.length === 0) {
      if (route.tools_called.length !== 0) {
        fails.push(`${rel}:${row.id} tools must be empty`);
      }
    }
    if (row.expectPath && route.answer_path !== row.expectPath) {
      fails.push(
        `${rel}:${row.id} expectPath ${row.expectPath} got ${route.answer_path}`,
      );
    }
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
console.log("[verify:ai-lane-router] PASS");
