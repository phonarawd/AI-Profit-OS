/**
 * verify:reference-resolution — Engine §47.16.2
 * resultRef structural resolver · ownership re-verify on getExecution(id) ·
 * normalized preference memory.append · no hallucination / no raw utterance
 */
const fs = require("fs");
const path = require("path");

const root = path.resolve(__dirname, "../..");
const fails = [];

function mustExist(rel) {
  if (!fs.existsSync(path.join(root, rel))) fails.push(`missing: ${rel}`);
}
function read(rel) {
  const p = path.join(root, rel);
  if (!fs.existsSync(p)) {
    fails.push(`missing: ${rel}`);
    return "";
  }
  return fs.readFileSync(p, "utf8");
}

const required = [
  "services/ai-platform/src/reference-resolver.cjs",
  "services/ai-platform/src/conversation-state.cjs",
  "services/ai-platform/src/coach-prompt.cjs",
  "services/memory-service/src/preference-memory.cjs",
  "services/memory-service/src/memory.cjs",
  "services/api-nest/src/ai/coach.orchestrator.ts",
  "services/api-nest/src/ai/fact-tool.service.ts",
  "services/api-nest/src/ai/conversation-state.service.ts",
  "services/api-nest/src/ai/memory.service.ts",
];
for (const f of required) mustExist(f);
if (fails.length) {
  console.error("[verify:reference-resolution] FAIL\n- " + fails.join("\n- "));
  process.exit(1);
}

const ai = require(path.join(root, "services/ai-platform/src/index.cjs"));
const mem = require(path.join(root, "services/memory-service/src/index.cjs"));

const ID_A = "11111111-1111-4111-8111-111111111111";
const ID_B = "22222222-2222-4222-8222-222222222222";
const ID_C = "33333333-3333-4333-8333-333333333333";
const ID_OUTSIDE = "99999999-9999-4999-8999-999999999999";

const refs = [
  {
    type: "executions",
    ids: [ID_A, ID_B, ID_C],
    aliases: { rolex: ID_A, omega: ID_B },
    savedAt: "2026-08-12T00:00:00.000Z",
  },
];

// 1) explicit reference → correct canonical result
const explicit = ai.resolveResultReference({
  text: `그중 ${ID_B} 상태 알려줘`,
  resultRefs: refs,
});
if (explicit.status !== "resolved" || explicit.id !== ID_B) {
  fails.push(`explicit id must resolve to B (got ${explicit.status}/${explicit.id})`);
}

// 2) ordinal reference → correct result
const ordinal = ai.resolveResultReference({
  text: "그중 첫번째는 언제 끝나",
  resultRefs: refs,
});
if (ordinal.status !== "resolved" || ordinal.id !== ID_A || ordinal.reason !== "ordinal") {
  fails.push(`ordinal first must resolve to A (got ${ordinal.status}/${ordinal.id}/${ordinal.reason})`);
}
const ordinal2 = ai.resolveResultReference({
  text: "두 번째 거",
  resultRefs: refs,
});
if (ordinal2.status !== "resolved" || ordinal2.id !== ID_B) {
  fails.push("ordinal second must resolve to B");
}
const lastCue = ai.resolveResultReference({
  text: "저번에 참여한 거 지금 어떻게 되고 있어?",
  resultRefs: refs,
});
if (lastCue.status !== "resolved" || lastCue.id !== ID_C) {
  fails.push(
    `저번 participation cue must resolve to last execution (got ${lastCue.status}/${lastCue.id})`,
  );
}

// 3) exact bounded alias → correct result
const alias = ai.resolveResultReference({
  text: "아까 그 Rolex",
  resultRefs: refs,
});
if (alias.status !== "resolved" || alias.id !== ID_A || alias.reason !== "bounded_alias") {
  fails.push(`bounded alias Rolex must resolve to A (got ${alias.status}/${alias.id})`);
}

// 4) duplicate candidates → ambiguous
const ambigRefs = [
  {
    type: "executions",
    ids: [ID_A, ID_B],
    aliases: { watch: ID_A, 시계: ID_B },
    savedAt: "2026-08-12T00:00:00.000Z",
  },
];
const ambig = ai.resolveResultReference({
  text: "아까 그 watch 시계",
  resultRefs: ambigRefs,
});
if (ambig.status !== "ambiguous") {
  fails.push(`duplicate alias hits must be ambiguous (got ${ambig.status})`);
}

// 5) missing candidate → not_found (ordinal out of range)
const missing = ai.resolveResultReference({
  text: "다섯 번째 거",
  resultRefs: refs,
});
if (missing.status !== "not_found") {
  fails.push(`ordinal out of range must be not_found (got ${missing.status})`);
}

// 6) evicted / out-of-window → unavailable or not_found
const empty = ai.resolveResultReference({
  text: "그중 첫번째",
  resultRefs: [],
});
if (empty.status !== "unavailable") {
  fails.push(`empty resultRefs with cue must be unavailable (got ${empty.status})`);
}
const outside = ai.resolveResultReference({
  text: ID_OUTSIDE,
  resultRefs: refs,
});
if (outside.status !== "not_found") {
  fails.push(`explicit id outside window must be not_found (got ${outside.status})`);
}

// 7) resolver must not hallucinate candidates
const none = ai.resolveResultReference({
  text: "안녕하세요",
  resultRefs: refs,
});
if (none.status !== "none" || none.id != null) {
  fails.push("non-reference text must not invent a resolved id");
}
const forged = ai.resolveResultReference({
  text: "그중 첫번째",
  resultRefs: [{ type: "executions", ids: [ID_A], savedAt: "2026-08-12T00:00:00.000Z" }],
});
if (forged.id && forged.id !== ID_A) {
  fails.push("resolver must only return ids from the provided snapshot");
}

// 8) unresolved must not be injected as resolved Fact
const unresolvedBlock = ai.referencePromptBlock(empty);
if (!unresolvedBlock || unresolvedBlock.kind !== "unresolved") {
  fails.push("unavailable resolution must produce unresolved prompt block");
}
if (/REFERENCE_JSON=/.test(unresolvedBlock.line)) {
  fails.push("unresolved must not emit REFERENCE_JSON");
}
const resolvedBlock = ai.referencePromptBlock(ordinal);
if (!resolvedBlock || resolvedBlock.kind !== "resolved") {
  fails.push("resolved resolution must produce REFERENCE_JSON block");
}
const messagesUnresolved = ai.buildCoachMessages({
  lane: "P",
  userText: "그중 첫번째",
  facts: [{ source: "other", payload: { x: 1 } }],
  referenceResolution: empty,
});
const sysUnresolved = messagesUnresolved[0].content;
if (/REFERENCE_JSON=/.test(sysUnresolved)) {
  fails.push("buildCoachMessages must not inject unresolved as REFERENCE_JSON");
}
if (!/REFERENCE_STATUS=/.test(sysUnresolved)) {
  fails.push("buildCoachMessages must inject REFERENCE_STATUS for unresolved");
}
const messagesResolved = ai.buildCoachMessages({
  lane: "P",
  userText: "그중 첫번째",
  facts: [{ source: "other", payload: { x: 1 } }],
  referenceResolution: ordinal,
});
if (!/REFERENCE_JSON=/.test(messagesResolved[0].content)) {
  fails.push("buildCoachMessages must inject REFERENCE_JSON only when resolved");
}

// 9) bounded conversation state limit maintained with resultRefs
let state = ai.buildConversationState({ userId: "u1", conversationId: "c1" });
for (let i = 0; i < 12; i++) {
  state = ai.appendTurn(state, {
    role: i % 2 === 0 ? "user" : "assistant",
    text: `t-${i}`,
  });
}
state = ai.rememberResultRef(state, {
  type: "executions",
  ids: [ID_A, ID_B, ID_C, ID_OUTSIDE, ID_A, ID_B, ID_C, ID_OUTSIDE, ID_A],
});
state = ai.rememberResultRef(state, {
  type: "opportunities",
  ids: [ID_A],
});
state = ai.rememberResultRef(state, {
  type: "executions",
  ids: [ID_B],
});
state = ai.rememberResultRef(state, {
  type: "opportunities",
  ids: [ID_C],
});
if (state.turns.length > ai.MAX_TURNS) {
  fails.push("resultRefs must not break MAX_TURNS bound");
}
if (state.resultRefs.length > ai.MAX_RESULT_REF_SETS) {
  fails.push("resultRefs snapshots must stay bounded");
}
const execSnap = state.resultRefs.find((r) => r.type === "executions");
if (!execSnap || execSnap.ids.length > ai.MAX_IDS_PER_REF) {
  fails.push("per-ref ids must stay bounded");
}

// 10) reference resolution must not arbitrarily append durable preference
const noPref = mem.matchNormalizedPreference("그중 첫번째는 언제 끝나");
if (noPref != null) {
  fails.push("deictic reference text must not match preference promotion");
}
const pref = mem.matchNormalizedPreference("짧게 말해줘");
if (!pref || pref.preferenceKey !== "explanation_length" || pref.value !== "short") {
  fails.push("allowlisted preference phrase must normalize to explanation_length=short");
}
const appendInput = mem.buildPreferenceAppendInput(pref);
if (appendInput.kind !== "preference") {
  fails.push("preference append kind must be preference");
}
if (appendInput.content.includes("짧게 말해줘")) {
  fails.push("preference content must be server template, not raw utterance");
}
if (appendInput.metadata.provenance !== "normalized_preference") {
  fails.push("preference metadata provenance required");
}
try {
  mem.assertPreferenceMetadata({
    preferenceKey: "balanceUsdt",
    value: "1",
    provenance: "normalized_preference",
  });
  fails.push("non-whitelist preferenceKey must be rejected");
} catch {
  /* expected */
}
try {
  mem.buildPreferenceAppendInput({
    preferenceKey: "explanation_length",
    value: "short",
    content: "ok",
  });
  mem.assertNoMemoryMoneyKeys({ balanceUsdt: "1" });
  fails.push("assertNoMemoryMoneyKeys must still reject money keys");
} catch {
  /* expected money key rejection */
}
if (!mem.MEMORY_KINDS.includes("preference")) {
  fails.push("MEMORY_KINDS must include preference");
}

// 11) wiring — FactTool ownership re-verify + orchestrator contracts
const factSrc = read("services/api-nest/src/ai/fact-tool.service.ts");
if (!/user_id\s*=\s*\$1::uuid/.test(factSrc) || !/id\s*=\s*\$2::uuid/.test(factSrc)) {
  fails.push("loadExecution must re-verify ownership with WHERE user_id=$1 AND id=$2");
}
if (!/executionId/.test(factSrc)) {
  fails.push("FactToolService must accept executionId for resultRef re-query");
}
if (!/opportunityId/.test(factSrc)) {
  fails.push("FactToolService must accept opportunityId for resultRef re-query");
}
if (!/executionIds/.test(factSrc)) {
  fails.push("getExecution list path must expose executionIds for resultRef snapshots");
}

const orch = read("services/api-nest/src/ai/coach.orchestrator.ts");
for (const needle of [
  "resolveResultReference",
  "referencePromptBlock",
  "rememberResultRef",
  "extractResultRefFromFacts",
  "matchNormalizedPreference",
  "buildPreferenceAppendInput",
  "this.memory.append",
  "executionId",
  "opportunityId",
]) {
  if (!orch.includes(needle)) {
    fails.push(`CoachOrchestrator missing ${needle}`);
  }
}
if (/사용자는 아마|아마 .+ 의미/.test(orch)) {
  fails.push("orchestrator must not instruct speculative reference language");
}

const memSvc = read("services/api-nest/src/ai/memory.service.ts");
if (!memSvc.includes("assertPreferenceMetadata")) {
  fails.push("MemoryService.append must assertPreferenceMetadata for kind=preference");
}

const convSrc = read("services/ai-platform/src/conversation-state.cjs");
if (!convSrc.includes("resultRefs") || !convSrc.includes("rememberResultRef")) {
  fails.push("conversation-state must carry additive resultRefs");
}

// Registry
const pkg = read("package.json");
if (!pkg.includes("verify:reference-resolution")) {
  fails.push("package.json missing verify:reference-resolution");
}
const catalog = read("tooling/verify/CATALOG.md");
if (!catalog.includes("reference-resolution")) {
  fails.push("CATALOG.md missing reference-resolution");
}

// fact-only / no-autonomy still hold for this surface
const noAuto = ai.routeAssistant({ text: "지급해줘" });
if (noAuto.lane !== "S" || noAuto.tools_called.length !== 0) {
  fails.push("reference-resolution must not weaken S no-autonomy routing");
}

if (fails.length) {
  console.error("[verify:reference-resolution] FAIL");
  for (const f of fails) console.error(" -", f);
  process.exit(1);
}
console.log(
  "[verify:reference-resolution] PASS (resultRef resolve · ownership · preference whitelist · prompt contract)",
);
