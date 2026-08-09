/**
 * verify:fact-freshness — Engine §47.4 / §47.15
 * Expired Fact must not answer money · refresh path
 */
const fs = require("fs");
const path = require("path");

const root = path.resolve(__dirname, "../..");
const fails = [];
const ai = require(path.join(root, "services/ai-platform/src/index.cjs"));

const fresh = ai.buildFactCard({
  source: "ledger",
  payload: { balanceUsdt: "10.00" },
  captured_at: "2026-08-09T12:00:00.000Z",
  expires_at: "2026-08-09T12:05:00.000Z",
  confidence: 1,
});

if (!ai.isFactFresh(fresh, { now: "2026-08-09T12:01:00.000Z" })) {
  fails.push("fresh fact must pass");
}
if (ai.isFactFresh(fresh, { now: "2026-08-09T12:06:00.000Z" })) {
  fails.push("expired fact must fail");
}

const part = ai.partitionFreshness(
  [
    fresh,
    ai.buildFactCard({
      source: "ledger",
      payload: { balanceUsdt: "1" },
      captured_at: "2026-08-09T11:00:00.000Z",
      expires_at: "2026-08-09T11:01:00.000Z",
      confidence: 1,
    }),
  ],
  { now: "2026-08-09T12:01:00.000Z" },
);
if (!part.needsRefresh || part.stale.length !== 1) {
  fails.push("partition must flag stale");
}

try {
  ai.assertFactsFreshOrThrow([fresh], {
    now: "2026-08-09T12:06:00.000Z",
  });
  fails.push("assertFactsFreshOrThrow must throw on stale");
} catch (e) {
  if (e.code !== "FACT_STALE") fails.push("FACT_STALE code");
}

const gRefresh = ai.guardAnswer({
  lane: "P",
  toolsCalled: ["getBalance"],
  factsUsed: [fresh],
  now: "2026-08-09T12:06:00.000Z",
});
if (gRefresh.status !== "refresh") {
  fails.push("guard must refresh on expired P facts");
}

const orch = fs.readFileSync(
  path.join(root, "services/api-nest/src/ai/coach.orchestrator.ts"),
  "utf8",
);
if (!orch.includes("P_REFRESH_TEMPLATE") && !orch.includes("stale")) {
  fails.push("CoachOrchestrator must handle stale Fact refresh");
}

const pkg = fs.readFileSync(path.join(root, "package.json"), "utf8");
if (!pkg.includes("verify:fact-freshness")) {
  fails.push("package.json missing verify:fact-freshness");
}

if (fails.length) {
  console.error("[verify:fact-freshness] FAIL\n- " + fails.join("\n- "));
  process.exit(1);
}
console.log("[verify:fact-freshness] PASS");
