/**
 * verify:rel-301-tool-call — REL-301 G-lane tools=[] · FAKE_TOOL_RESULT=0
 */
const fs = require("fs");
const path = require("path");

const root = path.resolve(__dirname, "../..");
const fails = [];
const ai = require(path.join(root, "services/ai-platform/src/index.cjs"));

function loadJsonl(rel) {
  const p = path.join(root, rel);
  if (!fs.existsSync(p)) {
    fails.push(`missing: ${rel}`);
    return [];
  }
  return fs
    .readFileSync(p, "utf8")
    .split(/\r?\n/)
    .filter(Boolean)
    .map((line) => JSON.parse(line));
}

if (ai.toolsForLane("G").length !== 0) fails.push("toolsForLane(G) must be []");
if (ai.toolsForLane("S").length !== 0) fails.push("toolsForLane(S) must be []");

const rows = loadJsonl("eval/rel-301-tool-call.jsonl");
if (rows.length < 5) fails.push("rel-301-tool-call.jsonl must have >=5 cases");

for (const row of rows) {
  const route = ai.routeAssistant({
    text: row.input,
    requestedTools: row.requestedTools,
  });
  if (row.expectLane && route.lane !== row.expectLane) {
    fails.push(`${row.id}: lane ${route.lane} != ${row.expectLane}`);
  }
  if (row.expectPath && route.answer_path !== row.expectPath) {
    fails.push(`${row.id}: path ${route.answer_path} != ${row.expectPath}`);
  }
  if (Array.isArray(row.expectTools) && row.expectTools.length === 0) {
    if (route.tools_called.length !== 0) {
      fails.push(`${row.id}: tools must be [] got ${JSON.stringify(route.tools_called)}`);
    }
  }
  if (row.assertLaneToolsForbidden) {
    try {
      ai.assertToolsAllowedForLane("G", row.assertLaneToolsForbidden);
      fails.push(`${row.id}: G must forbid ${row.assertLaneToolsForbidden}`);
    } catch (e) {
      if (e.code !== "LANE_TOOLS_FORBIDDEN") {
        fails.push(`${row.id}: wrong forbid code ${e.code}`);
      }
    }
  }
  if (row.fakeAnswer && row.expectGuard) {
    const g = ai.guardAnswer({
      lane: "G",
      toolsCalled: [],
      factsUsed: [],
      userText: row.input,
      answerText: row.fakeAnswer,
    });
    if (g.pass || !String(g.reason || "").includes(row.expectGuard)) {
      fails.push(
        `${row.id}: expect guard ${row.expectGuard} got ${g.status}/${g.reason}`,
      );
    }
  }
}

const gMoney = loadJsonl("eval/g_no_money.jsonl");
for (const row of gMoney) {
  const route = ai.routeAssistant({ text: row.input });
  if (row.expectLane === "G" && route.tools_called.length !== 0) {
    fails.push(`g_no_money:${row.id} G tools must be []`);
  }
}

const pkg = fs.readFileSync(path.join(root, "package.json"), "utf8");
if (!pkg.includes("verify:rel-301-tool-call")) {
  fails.push("package.json missing verify:rel-301-tool-call");
}

if (fails.length) {
  console.error("[verify:rel-301-tool-call] FAIL");
  for (const f of fails) console.error(" -", f);
  process.exit(1);
}
console.log("[verify:rel-301-tool-call] PASS (G tools=[] + FAKE_TOOL_RESULT=0)");
