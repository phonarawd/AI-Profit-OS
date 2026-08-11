/**
 * verify:conversation-state-bounded — Engine §47.16.2 (conv-state slice)
 * userId+conversationId 바인딩 · ownership fail-closed · TTL config-driven+bounded
 * scope guard: reference-resolution/durable-memory/routing/scope/numeric-grounding
 * must NOT be pulled forward into this slice.
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
  "services/ai-platform/src/conversation-state.cjs",
  "services/api-nest/src/ai/conversation-state.service.ts",
  "services/api-nest/src/ai/coach.orchestrator.ts",
  "services/api-nest/src/ai/coach.controller.ts",
  "services/api-nest/src/ai/ai.module.ts",
  "services/api-nest/src/config/phase0.env.ts",
  "packages/sdk/src/peotteok/chat-sse.ts",
  "packages/sdk/src/peotteok/types.ts",
  "packages/sdk/src/peotteok/usePeotteokChat.ts",
];
for (const f of files) mustExist(f);
if (fails.length) {
  console.error("[verify:conversation-state-bounded] FAIL\n- " + fails.join("\n- "));
  process.exit(1);
}

const ai = require(path.join(root, "services/ai-platform/src/index.cjs"));

// --- Redis key binds both userId and conversationId ---
const keyA = ai.conversationStateRedisKey("u1", "c1");
const keyB = ai.conversationStateRedisKey("u2", "c1");
if (keyA === keyB) fails.push("conversationStateRedisKey must bind userId (differ across users)");
if (!keyA.includes("u1") || !keyA.includes("c1")) {
  fails.push("conversationStateRedisKey must include both userId and conversationId");
}
try {
  ai.conversationStateRedisKey("", "c1");
  fails.push("conversationStateRedisKey must require userId");
} catch (e) {
  if (!String(e.message || "").includes("CONV_STATE_KEY_REQUIRES")) {
    fails.push("conversationStateRedisKey missing-user error code");
  }
}

// --- Ownership fail-closed ---
const state = ai.buildConversationState({ userId: "u1", conversationId: "c1" });
try {
  ai.assertStateOwnership(state, "u2");
  fails.push("assertStateOwnership must throw on mismatch");
} catch (e) {
  if (e.code !== "CONV_STATE_OWNERSHIP_MISMATCH") {
    fails.push("assertStateOwnership wrong error code");
  }
}
ai.assertStateOwnership(state, "u1"); // same owner must not throw

// --- Bounded turns (sliding window + truncation) ---
let bounded = state;
for (let i = 0; i < 20; i++) {
  bounded = ai.appendTurn(bounded, {
    role: i % 2 === 0 ? "user" : "assistant",
    text: `turn-${i}-${"x".repeat(500)}`,
  });
}
if (bounded.turns.length > ai.MAX_TURNS) {
  fails.push(`turns must stay bounded to MAX_TURNS=${ai.MAX_TURNS}, got ${bounded.turns.length}`);
}
if (bounded.turns.some((t) => t.text.length > ai.MAX_TURN_TEXT_LEN)) {
  fails.push(`turn text must be truncated to MAX_TURN_TEXT_LEN=${ai.MAX_TURN_TEXT_LEN}`);
}
try {
  ai.appendTurn(state, { role: "system", text: "x" });
  fails.push("appendTurn must reject non user/assistant roles");
} catch {
  /* expected */
}

// --- Absolute lifetime cap (12h, PO-locked 2026-08-12) ---
const created = new Date("2026-08-12T00:00:00.000Z").getTime();
const oldState = ai.buildConversationState({
  userId: "u1",
  conversationId: "c1",
  createdAt: new Date(created).toISOString(),
});
const withinCap = ai.isWithinAbsoluteLifetime(oldState, created + 11 * 3600 * 1000, 43200);
const pastCap = ai.isWithinAbsoluteLifetime(oldState, created + 13 * 3600 * 1000, 43200);
if (!withinCap) fails.push("11h after createdAt must still be within 12h absolute cap");
if (pastCap) fails.push("13h after createdAt must be past 12h absolute cap");

// --- Sliding TTL never exceeds remaining absolute-lifetime budget ---
const ttlNearEdge = ai.effectiveTtlSec(oldState, created + (12 * 3600 - 60) * 1000, 3600, 43200);
if (ttlNearEdge > 60) {
  fails.push("effectiveTtlSec must shrink toward the absolute cap, not return the full sliding TTL");
}
const ttlPastCap = ai.effectiveTtlSec(oldState, created + 13 * 3600 * 1000, 3600, 43200);
if (ttlPastCap !== 0) fails.push("effectiveTtlSec must be 0 once past the absolute lifetime");
const ttlFresh = ai.effectiveTtlSec(oldState, created + 60 * 1000, 3600, 43200);
if (ttlFresh !== 3600) fails.push("effectiveTtlSec must return the full sliding TTL when far from the cap");

// --- History messages bounded by character budget (always keep >=1 turn) ---
let longState = ai.buildConversationState({ userId: "u1", conversationId: "c1" });
for (let i = 0; i < 8; i++) {
  longState = ai.appendTurn(longState, { role: "user", text: "x".repeat(200) });
}
const history = ai.buildHistoryMessages(longState, 500);
const totalChars = history.reduce((sum, h) => sum + h.content.length, 0);
if (totalChars > 500 && history.length > 1) {
  fails.push("buildHistoryMessages must respect the character budget (except single-turn overflow)");
}
if (history.length === 0) fails.push("buildHistoryMessages must return at least one turn when turns exist");

// --- phase0.env.ts: config-driven, PO-locked defaults (3600 / 43200) ---
const envSrc = read("services/api-nest/src/config/phase0.env.ts");
if (!envSrc.includes("aiConvStateTtlSec")) fails.push("phase0.env.ts missing aiConvStateTtlSec");
if (!envSrc.includes("aiConvStateAbsoluteLifetimeSec")) {
  fails.push("phase0.env.ts missing aiConvStateAbsoluteLifetimeSec");
}
if (!envSrc.includes("AI_CONV_STATE_TTL_SEC") || !envSrc.includes("3600")) {
  fails.push("phase0.env.ts default TTL must read AI_CONV_STATE_TTL_SEC with fallback 3600 (PO locked 2026-08-12)");
}
if (!envSrc.includes("AI_CONV_STATE_ABSOLUTE_LIFETIME_SEC") || !envSrc.includes("43200")) {
  fails.push("phase0.env.ts default absolute lifetime must read AI_CONV_STATE_ABSOLUTE_LIFETIME_SEC with fallback 43200 (12h)");
}

const envExample = read(".env.example");
if (!envExample.includes("AI_CONV_STATE_TTL_SEC") || !envExample.includes("AI_CONV_STATE_ABSOLUTE_LIFETIME_SEC")) {
  fails.push(".env.example missing AI_CONV_STATE_TTL_SEC/AI_CONV_STATE_ABSOLUTE_LIFETIME_SEC documentation");
}

// --- Nest wiring: ownership re-verified, TTL not hardcoded at call sites ---
const svc = read("services/api-nest/src/ai/conversation-state.service.ts");
if (!svc.includes("assertStateOwnership")) {
  fails.push("ConversationStateService must call assertStateOwnership (fail-closed)");
}
if (!svc.includes("effectiveTtlSec")) {
  fails.push("ConversationStateService must use effectiveTtlSec (no hardcoded TTL)");
}
if (/redis\.set\([^)]*,\s*(3600|43200)\s*\)/.test(svc)) {
  fails.push("ConversationStateService must not hardcode TTL literals at redis.set() call sites");
}

const orch = read("services/api-nest/src/ai/coach.orchestrator.ts");
for (const needle of ["ConversationStateService", "conversationId", "conversation_id", "historyMessages"]) {
  if (!orch.includes(needle)) fails.push(`CoachOrchestrator missing ${needle}`);
}

const ctrl = read("services/api-nest/src/ai/coach.controller.ts");
if (!ctrl.includes("conversationId")) fails.push("CoachController missing conversationId passthrough");

const mod = read("services/api-nest/src/ai/ai.module.ts");
if (!mod.includes("ConversationStateService")) {
  fails.push("ai.module.ts missing ConversationStateService provider");
}

// --- F14: sibling dual-path auth convention (Bearer + credentials:"include") ---
const sse = read("packages/sdk/src/peotteok/chat-sse.ts");
const includeCount = (sse.match(/credentials:\s*"include"/g) || []).length;
if (includeCount < 2) {
  fails.push('chat-sse.ts must send credentials:"include" on both chips and chat fetch calls (F14)');
}
if (!sse.includes("conversationId")) {
  fails.push("chat-sse.ts must forward conversationId in the chat request body");
}

const types = read("packages/sdk/src/peotteok/types.ts");
if (!types.includes("conversation_id")) {
  fails.push("peotteok types.ts missing conversation_id field");
}

const hook = read("packages/sdk/src/peotteok/usePeotteokChat.ts");
if (!hook.includes("conversationId")) {
  fails.push("usePeotteokChat.ts must track and forward conversationId");
}

// --- Scope guard: routing/scope/numeric remain later File-Serial slices ---
// resultRef + preference memory.append are owned by reference-resolution
// (wired in CoachOrchestrator). ConversationStateService itself must stay
// free of durable memory writes.
if (/this\.memory\.append/.test(svc) || /MemoryService/.test(svc)) {
  fails.push("ConversationStateService must not own durable memory.append");
}
// numeric-grounding may exist; conversation-state must not absorb its duties
const convMod = read("services/ai-platform/src/conversation-state.cjs");
if (/groundAnswerNumerics|GROUNDED_NUMERIC_JSON|serverDerivedAllowlist/.test(convMod)) {
  fails.push("conversation-state must not absorb numeric-grounding duties");
}

const pkg = read("package.json");
if (!pkg.includes("verify:conversation-state-bounded")) {
  fails.push("package.json missing verify:conversation-state-bounded");
}
const catalog = read("tooling/verify/CATALOG.md");
if (!catalog.includes("conversation-state-bounded")) {
  fails.push("CATALOG.md missing conversation-state-bounded");
}

if (fails.length) {
  console.error("[verify:conversation-state-bounded] FAIL");
  for (const f of fails) console.error(" -", f);
  process.exit(1);
}
console.log("[verify:conversation-state-bounded] PASS");
