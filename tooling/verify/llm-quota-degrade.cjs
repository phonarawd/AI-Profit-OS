/**
 * verify:llm-quota-degrade — Engine §47.13
 * 429/quota → G busy template · P fact path · no money tools on G
 */
const path = require("path");

const root = path.resolve(__dirname, "../..");
const fails = [];

const ai = require(path.join(root, "services/ai-platform/src/index.cjs"));

const quota = ai.shouldDegradeForQuota({
  rpmCount: 11,
  rpdCount: 0,
  softRpm: 10,
  softRpd: 200,
});
if (!quota.degrade || quota.provider_effective !== "none") {
  fails.push("soft rpm exceed must degrade to none");
}

const ok = ai.shouldDegradeForQuota({
  rpmCount: 5,
  rpdCount: 100,
  softRpm: 10,
  softRpd: 200,
});
if (ok.degrade) {
  fails.push("under quota must not degrade");
}

const gPath = ai.degradeAnswerPath("G", true);
if (!gPath || gPath.path !== "template" || !gPath.text) {
  fails.push("G degrade must use busy template");
}
if (gPath?.text !== ai.G_BUSY_TEMPLATE) {
  fails.push("G busy text must match G_BUSY_TEMPLATE");
}

const pPath = ai.degradeAnswerPath("P", true);
if (!pPath || pPath.path !== "fact") {
  fails.push("P degrade must keep fact path");
}

const gLane = ai.routeAssistant({ text: "오늘 날씨", llm: true });
if (gLane.lane !== "G" || gLane.tools_called.length !== 0) {
  fails.push("G lane must have empty tools");
}

(async () => {
  const openaiNoKey = ai.createLlmAdapter("openai", {});
  const degraded = await openaiNoKey.chat({
    messages: [{ role: "user", content: "hello" }],
  });
  if (!degraded.degraded || degraded.provider_effective !== "none") {
    fails.push("openai without key must degrade");
  }

  const geminiNoKey = ai.createLlmAdapter("gemini_free", {});
  const geminiDegraded = await geminiNoKey.chat({
    messages: [{ role: "user", content: "hello" }],
  });
  if (!geminiDegraded.degraded || geminiDegraded.provider_effective !== "none") {
    fails.push("gemini_free without key must degrade");
  }

  const gDegrade = ai.degradeAnswerPath("P", true);
  if (gDegrade?.path !== "fact") {
    fails.push("provider failure must not invent P money facts");
  }

  if (fails.length) {
    console.error("[verify:llm-quota-degrade] FAIL\n- " + fails.join("\n- "));
    process.exit(1);
  }
  console.log("[verify:llm-quota-degrade] PASS");
})();
