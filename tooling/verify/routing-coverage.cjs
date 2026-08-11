/**
 * verify:routing-coverage — Engine §47.16.3
 * Wallet + EXECUTION_PATTERNS → P · getExecution reachable before opportunity
 * fallback · eval tools_called · S/G safety · reference-resolution consume-only
 */
const fs = require("fs");
const path = require("path");

const root = path.resolve(__dirname, "../..");
const fails = [];

function read(rel) {
  const p = path.join(root, rel);
  if (!fs.existsSync(p)) {
    fails.push(`missing: ${rel}`);
    return "";
  }
  return fs.readFileSync(p, "utf8");
}

const routerPath = "services/ai-platform/src/assistant-router.cjs";
if (!fs.existsSync(path.join(root, routerPath))) {
  console.error("[verify:routing-coverage] FAIL\n- missing assistant-router.cjs");
  process.exit(1);
}

const ai = require(path.join(root, "services/ai-platform/src/index.cjs"));
const routerSrc = read(routerPath);
const orchSrc = read("services/api-nest/src/ai/coach.orchestrator.ts");

// --- structural exports ---
if (!Array.isArray(ai.EXECUTION_PATTERNS) || ai.EXECUTION_PATTERNS.length < 5) {
  fails.push("EXECUTION_PATTERNS must be exported with canonical patterns");
}
if (typeof ai.defaultToolsForText !== "function") {
  fails.push("defaultToolsForText must be exported for deterministic inspection");
}
if (!/지갑/.test(routerSrc)) fails.push("P_PATTERNS must include /지갑/");
for (const needle of [
  "진행\\s*상태",
  "안전\\s*중단",
  "매칭\\s*상태",
  "거래\\s*상태",
  "체결",
]) {
  if (!routerSrc.includes(needle)) {
    fails.push(`EXECUTION_PATTERNS missing /${needle}/`);
  }
}

// --- matrix (import router behavior, not greps alone) ---
const matrix = [
  {
    id: "wallet_fact",
    input: "지갑 보여줘",
    expectLane: "P",
    expectToolsAny: ["getBalance", "getBuckets"],
    forbidTools: ["execute_withdraw"],
  },
  {
    id: "execution_status",
    input: "진행 상태 알려줘",
    expectLane: "P",
    expectToolsAny: ["getExecution"],
    forbidTools: [],
  },
  {
    id: "execution_safe_stop",
    input: "안전 중단 됐어?",
    expectLane: "P",
    expectToolsAny: ["getExecution"],
    forbidTools: [],
  },
  {
    id: "execution_match",
    input: "매칭 상태 어떻게 돼",
    expectLane: "P",
    expectToolsAny: ["getExecution"],
    forbidTools: [],
  },
  {
    id: "execution_fill",
    input: "체결됐어?",
    expectLane: "P",
    expectToolsAny: ["getExecution"],
    forbidTools: [],
  },
  {
    id: "opportunity_fact",
    input: "지금 참여할 미션 있어?",
    expectLane: "P",
    expectToolsAny: ["getOpportunity"],
    forbidTools: [],
  },
  {
    id: "money_info",
    input: "잔액 얼마야",
    expectLane: "P",
    expectToolsAny: ["getBalance", "getBuckets"],
    forbidTools: [],
  },
  {
    id: "money_mutate",
    input: "출금해줘",
    expectLane: "S",
    expectToolsExact: [],
    forbidTools: ["getExecution", "getBalance"],
  },
  {
    id: "unsupported_general",
    input: "커피 맛있게 끓이는 법",
    expectLane: "G",
    expectToolsExact: [],
    forbidTools: ["getExecution", "getBalance", "getOpportunity"],
  },
  {
    id: "scope_redirect_sports",
    input: "오늘 축구 경기 결과",
    expectLane: "G",
    expectPath: "scope_redirect",
    expectToolsExact: [],
    forbidTools: ["getExecution", "getBalance", "getOpportunity"],
  },
  {
    id: "empty_intent",
    input: "   ",
    expectLane: "G",
    expectToolsExact: [],
    forbidTools: [],
  },
];

for (const row of matrix) {
  const route = ai.routeAssistant({ text: row.input });
  if (route.lane !== row.expectLane) {
    fails.push(`${row.id}: expect lane ${row.expectLane} got ${route.lane}`);
  }
  if (row.expectPath && route.answer_path !== row.expectPath) {
    fails.push(
      `${row.id}: expect path ${row.expectPath} got ${route.answer_path}`,
    );
  }
  if (Array.isArray(row.expectToolsExact)) {
    if (JSON.stringify(route.tools_called) !== JSON.stringify(row.expectToolsExact)) {
      fails.push(
        `${row.id}: expect tools ${JSON.stringify(row.expectToolsExact)} got ${JSON.stringify(route.tools_called)}`,
      );
    }
  }
  if (Array.isArray(row.expectToolsAny) && row.expectToolsAny.length) {
    const hit = row.expectToolsAny.some((t) => route.tools_called.includes(t));
    if (!hit) {
      fails.push(
        `${row.id}: expectToolsAny ${JSON.stringify(row.expectToolsAny)} got ${JSON.stringify(route.tools_called)}`,
      );
    }
  }
  for (const bad of row.forbidTools || []) {
    if (route.tools_called.includes(bad)) {
      fails.push(`${row.id}: forbidden tool ${bad} in ${JSON.stringify(route.tools_called)}`);
    }
  }
  // Route outcome must be inspectable
  for (const key of ["schema", "lane", "answer_path", "tools_called", "intent"]) {
    if (route[key] == null && key !== "intent") {
      fails.push(`${row.id}: route missing ${key}`);
    }
  }
  if (route.schema !== "assistant-route.v1") {
    fails.push(`${row.id}: schema must be assistant-route.v1`);
  }
}

// getExecution must beat opportunity fallback for execution cues
const tools = ai.defaultToolsForText("진행 상태");
if (!tools.includes("getExecution") || tools[0] !== "getExecution") {
  fails.push("defaultToolsForText(진행 상태) must return [getExecution] first");
}
const oppFallback = ai.defaultToolsForText("아무말");
if (!oppFallback.includes("getOpportunity")) {
  fails.push("unknown P-less text tools are selected only via classify; defaultTools still opportunity fallback");
}

// Unknown must NOT invent mutate tools
const unknown = ai.routeAssistant({ text: " agjkl 123" });
if (unknown.lane !== "G" || unknown.tools_called.length !== 0) {
  fails.push("unknown intent must be G with empty tools (safe fallback)");
}

// S precedence over execution-looking mutate language
const sOverP = ai.routeAssistant({ text: "출금 실행하고 진행 상태도 알려줘" });
if (sOverP.lane !== "S" || sOverP.tools_called.length !== 0) {
  fails.push("S mutate cues must win over P execution patterns");
}

// eval getExecution cases exist and pass tools_called
const pFact = read("eval/p_fact.jsonl")
  .split(/\r?\n/)
  .filter(Boolean)
  .map((line) => JSON.parse(line));
const execEval = pFact.filter(
  (r) =>
    Array.isArray(r.expectToolsAny) && r.expectToolsAny.includes("getExecution"),
);
if (execEval.length < 3) {
  fails.push("eval/p_fact.jsonl needs >=3 getExecution expectToolsAny rows");
}

// reference-resolution consume-only (no redesign) — orch still owns resolve + ownership
for (const needle of [
  "resolveResultReference",
  "executionId",
  "getExecution",
]) {
  if (!orchSrc.includes(needle)) {
    fails.push(`CoachOrchestrator must still wire ${needle} (consume reference-resolution)`);
  }
}
// unresolved must not invent tools via router alone
const clarifyText = "그중 첫번째";
const clarifyRoute = ai.routeAssistant({ text: clarifyText });
// deictic-only may be G or P depending on patterns; must NOT add mutate tools
if (clarifyRoute.tools_called.some((t) => /withdraw|payout|execute/i.test(t))) {
  fails.push("deictic reference text must not unlock mutate tools");
}

// no-autonomy / fact-only invariants
const payout = ai.routeAssistant({ text: "지급해줘" });
if (payout.lane !== "S" || payout.tools_called.length !== 0) {
  fails.push("routing-coverage must not weaken S no-autonomy");
}
if (ai.FACT_TOOLS.includes("execute_withdraw")) {
  fails.push("FACT_TOOLS must not gain mutate tools for coverage");
}

// numeric-grounding remains a later File-Serial slice
if (fs.existsSync(path.join(root, "services/ai-platform/src/numeric-grounding.cjs"))) {
  fails.push("routing-coverage must not pull forward numeric-grounding module");
}

const pkg = read("package.json");
if (!pkg.includes("verify:routing-coverage")) {
  fails.push("package.json missing verify:routing-coverage");
}
const catalog = read("tooling/verify/CATALOG.md");
if (!catalog.includes("routing-coverage")) {
  fails.push("CATALOG.md missing routing-coverage");
}

if (fails.length) {
  console.error("[verify:routing-coverage] FAIL");
  for (const f of fails) console.error(" -", f);
  process.exit(1);
}
console.log(
  "[verify:routing-coverage] PASS (wallet/execution→P · getExecution tools_called · S/G fallback)",
);
