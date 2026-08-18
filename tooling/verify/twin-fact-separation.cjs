/**
 * verify:twin-fact-separation — Engine §47.3 / §47.8
 * Twin fields must NEVER be the balance/price answer path
 */
const fs = require("fs");
const path = require("path");

const root = path.resolve(__dirname, "../..");
const fails = [];

function mustExist(rel) {
  if (!fs.existsSync(path.join(root, rel))) fails.push(`missing: ${rel}`);
}

function read(rel) {
  return fs.readFileSync(path.join(root, rel), "utf8");
}

const files = [
  "services/user-twin-service/package.json",
  "services/user-twin-service/src/twin.cjs",
  "services/memory-service/package.json",
  "services/memory-service/src/memory.cjs",
  "services/memory-service/src/embed-search.cjs",
  "services/ai-platform/src/assistant-router.cjs",
  "services/ai-platform/src/fact-card-loader.cjs",
  "services/ai-platform/src/fact-tools.cjs",
  "services/ai-platform/src/answer-guard.cjs",
  "services/ai-platform/src/help-rag.cjs",
  "services/api-nest/src/ai/user-twin.service.ts",
  "services/api-nest/src/ai/memory.service.ts",
  "services/api-nest/src/ai/assistant.service.ts",
  "schemas/user-twin.v1.json",
  "schemas/fact-card.v1.json",
  "supabase/migrations/20260808205853_ai_twin_memory.sql",
];
for (const f of files) mustExist(f);

if (fails.length) {
  console.error("[verify:twin-fact-separation] FAIL\n- " + fails.join("\n- "));
  process.exit(1);
}

const twinPkg = JSON.parse(read("services/user-twin-service/package.json"));
if (twinPkg.name !== "@aipo/user-twin-service") {
  fails.push("user-twin-service package name");
}
const memPkg = JSON.parse(read("services/memory-service/package.json"));
if (memPkg.name !== "@aipo/memory-service") {
  fails.push("memory-service package name");
}

const twin = require(path.join(
  root,
  "services/user-twin-service/src/index.cjs",
));
const mem = require(path.join(root, "services/memory-service/src/index.cjs"));
const ai = require(path.join(root, "services/ai-platform/src/index.cjs"));

// --- Twin rejects money cache keys ---
for (const key of ["balanceUsdt", "expectedProfitUsdt", "liveQuote"]) {
  if (!twin.FORBIDDEN_TWIN_MONEY_KEYS.includes(key)) {
    fails.push(`FORBIDDEN_TWIN_MONEY_KEYS missing ${key}`);
  }
  try {
    twin.buildTwin({ userId: "u1", [key]: "1" });
    fails.push(`buildTwin must reject ${key}`);
  } catch (e) {
    if (e.code !== "TWIN_MONEY_CACHE_FORBIDDEN") {
      fails.push(`buildTwin ${key} wrong code: ${e.code}`);
    }
  }
}

try {
  twin.resolveMoneyFromTwin(
    { userId: "u1", preferredCapitalBand: "micro" },
    "balanceUsdt",
  );
  fails.push("resolveMoneyFromTwin must never return money");
} catch (e) {
  if (e.code !== "TWIN_CANNOT_ANSWER_MONEY") {
    fails.push("resolveMoneyFromTwin code");
  }
}

const okTwin = twin.buildTwin({
  userId: "u1",
  preferredCapitalBand: "micro",
  toneBand: "senior",
  categoryInterest: ["watch"],
});
if (okTwin.balanceUsdt != null) fails.push("twin must not expose balanceUsdt");
if (Object.prototype.hasOwnProperty.call(okTwin, "balanceUsdt")) {
  fails.push("twin object must not own balanceUsdt");
}

// --- Schema locks ---
const twinSchema = JSON.parse(read("schemas/user-twin.v1.json"));
const notAny = twinSchema.not?.anyOf || [];
const requiredForbid = notAny.flatMap((x) => x.required || []);
for (const k of ["balanceUsdt", "expectedProfitUsdt", "liveQuote"]) {
  if (!requiredForbid.includes(k)) {
    fails.push(`user-twin.v1 schema must forbid ${k}`);
  }
}

// --- Migration CHECK ---
const mig = read("supabase/migrations/20260808205853_ai_twin_memory.sql");
for (const needle of [
  "ai_user_profile",
  "ai_memory",
  "memory_embeddings",
  "ai_user_profile_no_money_cache_chk",
  "balanceUsdt",
  "expectedProfitUsdt",
  "liveQuote",
  "vector(768)",
]) {
  if (!mig.includes(needle)) fails.push(`migration missing ${needle}`);
}

// --- Memory rejects money metadata ---
try {
  mem.buildMemoryRecord({
    userId: "u1",
    kind: "session_summary",
    content: "hello",
    metadata: { balanceUsdt: "9" },
  });
  fails.push("memory must reject balanceUsdt metadata");
} catch (e) {
  if (e.code !== "MEMORY_MONEY_CACHE_FORBIDDEN") {
    fails.push("memory money forbid code");
  }
}
if (mem.EMBEDDING_DIM !== 768) fails.push("EMBEDDING_DIM must be 768");

// --- Fact freshness ---
const fresh = ai.buildFactCard({
  source: "ledger",
  payload: { balanceUsdt: "10.00" },
  captured_at: "2026-08-09T12:00:00.000Z",
  expires_at: "2026-08-09T12:05:00.000Z",
  confidence: 1,
});
if (
  !ai.isFactFresh(fresh, { now: "2026-08-09T12:01:00.000Z" })
) {
  fails.push("fresh fact must pass");
}
if (ai.isFactFresh(fresh, { now: "2026-08-09T12:06:00.000Z" })) {
  fails.push("expired fact must fail freshness");
}

// --- Guard: Twin money key blocks ---
const gTwin = ai.guardAnswer({
  lane: "P",
  toolsCalled: ["getBalance"],
  factsUsed: [fresh],
  twin: { userId: "u1", balanceUsdt: "1" },
  now: "2026-08-09T12:01:00.000Z",
});
if (gTwin.status !== "block" || gTwin.pass) {
  fails.push("guard must block twin money keys");
}

// --- Guard: P money tool without fact → refresh ---
const gRefresh = ai.guardAnswer({
  lane: "P",
  toolsCalled: ["getBalance"],
  factsUsed: [],
});
if (gRefresh.status !== "refresh") {
  fails.push("P money tool without fact must refresh");
}

// --- Guard: G tools empty ---
const gG = ai.guardAnswer({
  lane: "G",
  toolsCalled: ["getBalance"],
});
if (gG.pass || gG.status !== "block") {
  fails.push("G lane must block money tools");
}

// --- Router P/G/S ---
if (ai.classifyLane("지금 잔액 얼마야?") !== "P") {
  fails.push("balance intent → P");
}
if (ai.classifyLane("오늘 날씨 어때?") !== "G") {
  fails.push("weather → G");
}
if (ai.classifyLane("출금해줘") !== "S") {
  fails.push("execute withdraw → S");
}

const routeP = ai.routeAssistant({
  text: "잔액 알려줘",
  twin: okTwin,
  facts: [fresh],
  now: "2026-08-09T12:01:00.000Z",
});
if (routeP.lane !== "P") fails.push("route balance → P");
if (!routeP.tools_called.includes("getBalance")) {
  fails.push("P balance route must call getBalance");
}
if (routeP.tools_called.some((t) => /withdraw|payout|execute/i.test(t))) {
  fails.push("P tools must not include mutate execute");
}
if (routeP.guard_result.status === "block") {
  fails.push(`routeP guard must not block: ${routeP.guard_result.reason}`);
}

const routeS = ai.routeAssistant({ text: "출금해줘", twin: okTwin });
if (routeS.lane !== "S" || routeS.answer_path !== "refuse_s") {
  fails.push("S must refuse_execute");
}
if (routeS.tools_called.length !== 0) {
  fails.push("S tools must be empty");
}

const routeG = ai.routeAssistant({ text: "재미있는 이야기 해줘", twin: okTwin });
if (routeG.lane !== "G" || routeG.tools_called.length !== 0) {
  fails.push("G tools must be empty");
}

// Fact tools catalog has no mutation names
for (const bad of [
  "withdraw",
  "execute_withdraw",
  "payout",
  "raise_limit",
  "credit_balance",
]) {
  if (ai.FACT_TOOLS.includes(bad)) {
    fails.push(`FACT_TOOLS must not include ${bad}`);
  }
}

// Nest wiring
const eng = read("services/api-nest/src/ai/ai.engine.ts");
for (const needle of [
  "@aipo/user-twin-service",
  "@aipo/memory-service",
  "resolveMoneyFromTwin",
  "routeAssistant",
  "buildFactCard",
]) {
  if (!eng.includes(needle)) fails.push(`ai.engine missing ${needle}`);
}

const mod = read("services/api-nest/src/ai/ai.module.ts");
for (const needle of [
  "UserTwinService",
  "MemoryService",
  "AssistantService",
]) {
  if (!mod.includes(needle)) fails.push(`ai.module missing ${needle}`);
}

const apiPkg = read("services/api-nest/package.json");
if (!apiPkg.includes("@aipo/user-twin-service")) {
  fails.push("api-nest missing user-twin-service dep");
}
if (!apiPkg.includes("@aipo/memory-service")) {
  fails.push("api-nest missing memory-service dep");
}

const twinSvc = read("services/api-nest/src/ai/user-twin.service.ts");
if (!twinSvc.includes("ai_user_profile")) {
  fails.push("UserTwinService must persist ai_user_profile");
}
if (!twinSvc.includes("twinRedisKey")) {
  fails.push("UserTwinService must use Redis hot key");
}

const memSvc = read("services/api-nest/src/ai/memory.service.ts");
if (!memSvc.includes("memory_embeddings")) {
  fails.push("MemoryService must use memory_embeddings");
}
if (!memSvc.includes("extensions.vector") && !memSvc.includes("::vector")) {
  fails.push("MemoryService must write pgvector");
}

const asst = read("services/api-nest/src/ai/assistant.service.ts");
if (!asst.includes("assertNoTwinMoneyKeys")) {
  fails.push("AssistantService must assert twin has no money keys");
}
if (!asst.includes("routeAssistant")) {
  fails.push("AssistantService must call routeAssistant");
}
if (!asst.includes("buildFactCard")) {
  fails.push("AssistantService must use Fact cards for money path");
}

// Redis get/set for hot twin
const redis = read("services/api-nest/src/redis/upstash.ts");
if (!/async get\(/.test(redis) || !/async set\(/.test(redis)) {
  fails.push("UpstashRedisService must expose get/set for Twin hot cache");
}

const rootPkg = read("package.json");
if (!rootPkg.includes("verify:twin-fact-separation")) {
  fails.push("package.json missing verify:twin-fact-separation");
}
const catalog = read("tooling/verify/CATALOG.md");
if (!catalog.includes("twin-fact-separation")) {
  fails.push("CATALOG must mention twin-fact-separation");
}

// Help RAG must not hold money Fact
try {
  ai.buildHelpChunk({
    kind: "guide",
    text: "입금 안내",
    balanceUsdt: "1",
  });
  fails.push("help-rag must reject balanceUsdt");
} catch {
  /* expected */
}

if (fails.length) {
  console.error("[verify:twin-fact-separation] FAIL");
  for (const f of fails) console.error(" -", f);
  process.exit(1);
}
console.log("[verify:twin-fact-separation] PASS");
