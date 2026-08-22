/**
 * verify:rel-300-fact-only — REL-300 P-lane fact-only fixture
 * 사실 없는 수익 질문 → 창작 0 · UNAVAILABLE/거절
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

const rows = loadJsonl("eval/rel-300-fact-only.jsonl");
if (rows.length < 4) fails.push("rel-300-fact-only.jsonl must have >=4 cases");

for (const row of rows) {
  const route = ai.routeAssistant({ text: row.input });
  if (row.expectLane && route.lane !== row.expectLane) {
    fails.push(`${row.id}: lane ${route.lane} != ${row.expectLane}`);
  }
  if (Array.isArray(row.expectToolsAny) && row.expectToolsAny.length) {
    const hit = row.expectToolsAny.some((t) => route.tools_called.includes(t));
    if (!hit) {
      fails.push(
        `${row.id}: tools ${JSON.stringify(route.tools_called)} missing ${JSON.stringify(row.expectToolsAny)}`,
      );
    }
  }
  if (route.tools_called.some((t) => /withdraw|payout|credit|ledger_post/i.test(t))) {
    fails.push(`${row.id}: mutate tool leaked`);
  }

  if (row.emptyFacts === "unavailable") {
    const text = ai.renderFactAnswer([], {});
    if (/[0-9]+(?:\.\d+)?\s*USDT/.test(text)) {
      fails.push(`${row.id}: empty facts invented USDT`);
    }
    if (!/없|확인/.test(text)) {
      fails.push(`${row.id}: empty facts must say unavailable/refuse`);
    }
  }

  if (row.factProfitUsdt) {
    const now = Date.now();
    const fact = ai.buildFactCard({
      source: "ledger",
      payload: { profitUsdt: row.factProfitUsdt, liabilityUsdt: "10.00" },
      captured_at: new Date(now).toISOString(),
      expires_at: new Date(now + 60_000).toISOString(),
      confidence: 1,
    });
    const text = ai.renderFactAnswer([fact], {});
    if (!text.includes(row.expectAnswerIncludes || row.factProfitUsdt)) {
      fails.push(`${row.id}: must use Fact profitUsdt`);
    }
  }

  if (row.missingProfitUsdt) {
    const now = Date.now();
    const fact = ai.buildFactCard({
      source: "ledger",
      payload: { liabilityUsdt: "10.00" },
      captured_at: new Date(now).toISOString(),
      expires_at: new Date(now + 60_000).toISOString(),
      confidence: 1,
    });
    const text = ai.renderFactAnswer([fact], {});
    if (/출금 가능 수익은 0(?:\.0+)? USDT/.test(text)) {
      fails.push(`${row.id}: missing profitUsdt must not become 0`);
    }
    if (!/확인할 수 없/.test(text)) {
      fails.push(`${row.id}: missing profitUsdt must be UNAVAILABLE`);
    }
  }

  if (row.forbidGuarantee) {
    const g = ai.guardAnswer({
      lane: "P",
      toolsCalled: [],
      factsUsed: [],
      answerText: "원금 보장이고 확정 수익 100 USDT예요.",
    });
    if (g.pass) fails.push(`${row.id}: guarantee copy must block`);
  }

  if (row.unknownTool) {
    try {
      ai.assertToolsAllowedForLane("P", [row.unknownTool]);
      fails.push(`${row.id}: unknown tool must throw`);
    } catch (e) {
      if (!String(e.message || "").includes(row.expectThrow || "FACT_TOOL")) {
        fails.push(`${row.id}: wrong unknown-tool error ${e.message}`);
      }
    }
  }
}

const pkg = fs.readFileSync(path.join(root, "package.json"), "utf8");
if (!pkg.includes("verify:rel-300-fact-only")) {
  fails.push("package.json missing verify:rel-300-fact-only");
}

if (fails.length) {
  console.error("[verify:rel-300-fact-only] FAIL");
  for (const f of fails) console.error(" -", f);
  process.exit(1);
}
console.log("[verify:rel-300-fact-only] PASS (fact-only fixture executed)");
