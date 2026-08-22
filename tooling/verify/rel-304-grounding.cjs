/**
 * verify:rel-304-grounding — REL-304 numeric-grounding + fact-freshness
 * source/asOf · stale≠current · missing≠0 · REL-007 UNAVAILABLE
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

const rows = loadJsonl("eval/rel-304-grounding.jsonl");
if (rows.length < 5) fails.push("rel-304-grounding.jsonl must have >=5 cases");

function freshFact(payload) {
  const now = Date.now();
  return ai.buildFactCard({
    source: "ledger",
    payload,
    captured_at: new Date(now).toISOString(),
    expires_at: new Date(now + 60_000).toISOString(),
    confidence: 1,
  });
}

for (const row of rows) {
  if (row.needSourceAsOf) {
    const fact = freshFact({ profitUsdt: row.profitUsdt, liabilityUsdt: "10" });
    const items = ai.collectGroundedNumerics([fact]);
    const hit = items.find((x) => x.field === "profitUsdt");
    if (!hit || !hit.source || !hit.asOf) {
      fails.push(`${row.id}: grounded numeric must carry source+asOf`);
    }
    if (hit.source !== "ledger") {
      fails.push(`${row.id}: source must be ledger`);
    }
  }

  if (row.stale) {
    const past = Date.now() - 120_000;
    const stale = ai.buildFactCard({
      source: "ledger",
      payload: { liabilityUsdt: "9" },
      captured_at: new Date(past).toISOString(),
      expires_at: new Date(past + 1000).toISOString(),
      confidence: 1,
    });
    const g = ai.guardAnswer({
      lane: "P",
      toolsCalled: ["getBalance"],
      factsUsed: [stale],
      now: new Date().toISOString(),
      answerText: "지금 잔액은 9 USDT예요.",
    });
    if (g.status !== "refresh") {
      fails.push(`${row.id}: stale fact must refresh, not present as current (${g.status})`);
    }
    const grounded = ai.collectGroundedNumerics([stale]);
    const liab = grounded.find((x) => x.field === "liabilityUsdt");
    if (!liab || liab.freshness !== "stale" || liab.availability !== "stale") {
      fails.push(`${row.id}: stale metadata must be preserved`);
    }
  }

  if (row.nullProfit) {
    const fact = freshFact({ expectedProfitUsdt: null, count: 2 }, );
    const items = ai.collectGroundedNumerics([
      ai.buildFactCard({
        source: "opportunity",
        payload: { expectedProfitUsdt: null, count: 2 },
        captured_at: new Date().toISOString(),
        expires_at: new Date(Date.now() + 60_000).toISOString(),
        confidence: 1,
      }),
    ]);
    const ep = items.find((x) => x.field === "expectedProfitUsdt");
    if (!ep || ep.availability !== "unknown" || ep.value != null) {
      fails.push(`${row.id}: null must stay unknown, not 0`);
    }
  }

  if (row.invented) {
    const fact = freshFact({ liabilityUsdt: "5" });
    const ng = ai.groundAnswerNumerics({
      lane: "P",
      answerPath: "llm_p",
      answerText: `잔액은 ${row.invented} USDT예요.`,
      factsUsed: [fact],
    });
    if (ng.pass) {
      fails.push(`${row.id}: ungrounded current claim must fail`);
    }
  }

  if (row.emptyFacts) {
    const text = ai.renderFactAnswer([], {});
    if (/[0-9]+(?:\.\d+)?\s*USDT/.test(text)) {
      fails.push(`${row.id}: empty must not invent numbers`);
    }
    if (!/없|확인/.test(text)) {
      fails.push(`${row.id}: empty must be UNAVAILABLE`);
    }
  }

  if (row.knownZero) {
    const items = ai.collectGroundedNumerics([
      freshFact({ liabilityUsdt: "0", profitUsdt: "0" }),
    ]);
    const z = items.find((x) => x.field === "liabilityUsdt");
    if (!z || z.availability !== "known_zero" || z.value !== "0") {
      fails.push(`${row.id}: real 0 must stay known_zero`);
    }
  }
}

if (typeof ai.P_UNAVAILABLE_TEMPLATE?.text !== "string") {
  fails.push("P_UNAVAILABLE_TEMPLATE must exist (REL-007 UNAVAILABLE)");
}

const pkg = fs.readFileSync(path.join(root, "package.json"), "utf8");
if (!pkg.includes("verify:rel-304-grounding")) {
  fails.push("package.json missing verify:rel-304-grounding");
}

if (fails.length) {
  console.error("[verify:rel-304-grounding] FAIL");
  for (const f of fails) console.error(" -", f);
  process.exit(1);
}
console.log("[verify:rel-304-grounding] PASS (source/asOf · stale · UNAVAILABLE)");
