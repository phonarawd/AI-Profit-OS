/**
 * verify:ai-general-no-money-tools — Engine §47.8 / §47.14
 * G-lane money tools must be empty
 */
const fs = require("fs");
const path = require("path");

const root = path.resolve(__dirname, "../..");
const fails = [];
const ai = require(path.join(root, "services/ai-platform/src/index.cjs"));

if (ai.toolsForLane("G").length !== 0) {
  fails.push("toolsForLane(G) must be empty");
}
if (ai.toolsForLane("S").length !== 0) {
  fails.push("toolsForLane(S) must be empty");
}
if (ai.toolsForLane("P").length < 1) {
  fails.push("toolsForLane(P) must expose Fact tools");
}

const route = ai.routeAssistant({ text: "오늘 기분 어때?", llm: true });
if (route.lane !== "G" || route.tools_called.length !== 0) {
  fails.push("G chat must have tools=[]");
}

try {
  ai.assertToolsAllowedForLane("G", ["getBalance"]);
  fails.push("G must forbid getBalance");
} catch (e) {
  if (e.code !== "LANE_TOOLS_FORBIDDEN") {
    fails.push("G tools forbid code");
  }
}

const gGuard = ai.guardAnswer({
  lane: "G",
  toolsCalled: ["getBalance"],
  answerText: "hi",
});
if (gGuard.pass || gGuard.status !== "block") {
  fails.push("guard must block G money tools");
}

const prompt = ai.buildCoachMessages({
  lane: "G",
  userText: "hello",
  facts: [],
});
if (!prompt[0].content.includes("tools=[]") && !prompt[0].content.includes("레인=G")) {
  fails.push("G coach prompt must lock general lane");
}

const pkg = fs.readFileSync(path.join(root, "package.json"), "utf8");
if (!pkg.includes("verify:ai-general-no-money-tools")) {
  fails.push("package.json missing verify:ai-general-no-money-tools");
}

if (fails.length) {
  console.error(
    "[verify:ai-general-no-money-tools] FAIL\n- " + fails.join("\n- "),
  );
  process.exit(1);
}
console.log("[verify:ai-general-no-money-tools] PASS");
