/**
 * verify:ai-coach-runtime -- REL-300~305 committed fixture runner
 */
"use strict";
const fs = require("fs");
const path = require("path");
const root = path.resolve(__dirname, "../..");
const fails = [];
const ai = require(path.join(root, "services/ai-platform/src/index.cjs"));
function read(rel) {
  const p = path.join(root, rel);
  if (!fs.existsSync(p)) { fails.push("missing: " + rel); return ""; }
  return fs.readFileSync(p, "utf8");
}
function loadJsonl(rel) {
  return read(rel).split(/\r?\n/).filter(Boolean).map((line, i) => {
    try { return JSON.parse(line); }
    catch (e) { fails.push(rel + ":" + (i + 1) + " " + e.message); return null; }
  }).filter(Boolean);
}
function assert(cond, msg) { if (!cond) fails.push(msg); }
for (const rel of [
  "eval/s_safe_refuse.jsonl","eval/coach_redteam.jsonl",
  "services/ai-platform/src/assistant-router.cjs",
  "services/ai-platform/src/coach-templates.cjs",
  "services/api-nest/src/ai/coach.orchestrator.ts",
  "packages/ui/copy/ko/peotteok.ts",
]) if (!fs.existsSync(path.join(root, rel))) fails.push("missing: " + rel);
if (fails.length) { console.error("[verify:ai-coach-runtime] FAIL"); fails.forEach((f)=>console.error(" -",f)); process.exit(1); }
const missingMoney = ai.renderFactAnswer([ai.buildFactCard({source:"ledger",payload:{liabilityUsdt:"10.00"},captured_at:"2026-08-23T00:00:00.000Z",expires_at:"2026-08-23T00:05:00.000Z",confidence:1})],{now:"2026-08-23T00:01:00.000Z"});
assert(String(missingMoney).includes("\uD655\uC778\uD560 \uC218 \uC5C6"), "REL-300 missing money must be UNAVAILABLE copy");
assert(!/\uC218\uC775\uC740 0/.test(missingMoney), "REL-300 must not invent 0 profit");
assert(!/UNAVAILABLE|\bAPI\b|tools=/.test(missingMoney), "REL-300 user copy IT jargon 0");
const empty = ai.renderFactAnswer([], {});
assert(String(empty).includes("\uB2E4\uC2DC"), "REL-300 empty facts refresh");
const grounded = ai.renderFactAnswer([ai.buildFactCard({source:"ledger",payload:{profitUsdt:"3.50",principalUsdt:"6.50"},captured_at:"2026-08-23T00:00:00.000Z",expires_at:"2026-08-23T00:05:00.000Z",confidence:1})],{now:"2026-08-23T00:01:00.000Z"});
assert(grounded.includes("3.50") && grounded.includes("6.50"), "REL-300 grounded numbers stay");
const gWeather = ai.routeAssistant({text:"\uC624\uB298 \uB0A0\uC528 \uC5B4\uB54C?",requestedTools:["getBalance","execute_withdraw"]});
assert(gWeather.lane==="G" && gWeather.tools_called.length===0, "REL-301 G requestedTools ignored");
assert(ai.toolsForLane("G").length===0, "REL-301 toolsForLane G empty");
for (const row of loadJsonl("eval/s_safe_refuse.jsonl")) {
  const route = ai.routeAssistant({text:row.input});
  assert(route.lane==="S" && route.answer_path==="refuse_s", "REL-302 "+row.id+" path");
  assert(route.tools_called.length===0, "REL-302 "+row.id+" tools");
  assert(route.scope && route.scope.reason==="dangerous_request", "REL-302 "+row.id+" reason");
}
assert(ai.S_SAFE_REFUSE_TEMPLATE && !ai.S_SAFE_REFUSE_TEMPLATE.deepLink, "REL-302 no withdraw deep-link");
assert(!/\uCD9C\uAE08 \uD654\uBA74|\uC9C1\uC811 \uC9C4\uD589|\uC2E4\uD589\uD558/.test(ai.S_SAFE_REFUSE_TEMPLATE.text), "REL-302 no execute advice");
const redteam = loadJsonl("eval/coach_redteam.jsonl");
assert(redteam.length>=6, "REL-303 redteam >=6");
for (const row of redteam) {
  const route = ai.routeAssistant({text:row.input, requestedTools:row.requestedTools||[]});
  if (row.expectPath && route.answer_path!==row.expectPath) fails.push("REL-303 "+row.id+" path "+route.answer_path);
  if (row.expectLane && route.lane!==row.expectLane) fails.push("REL-303 "+row.id+" lane "+route.lane);
  assert(route.tools_called.length===0, "REL-303 "+row.id+" tools");
}
const staleFact = ai.buildFactCard({source:"ledger",payload:{profitUsdt:"9.99"},captured_at:"2026-08-23T00:00:00.000Z",expires_at:"2026-08-23T00:01:00.000Z",confidence:1});
const staleAnswer = ai.renderFactAnswer([staleFact],{now:"2026-08-23T00:10:00.000Z"});
assert(!staleAnswer.includes("9.99"), "REL-304 stale not current");
assert(staleAnswer.includes("\uB2E4\uC2DC") || staleAnswer.includes("\uBC14\uB00C\uC5C8"), "REL-304 refresh copy");
const zeroAnswer = ai.renderFactAnswer([ai.buildFactCard({source:"ledger",payload:{profitUsdt:"0",liabilityUsdt:"0",principalUsdt:"0"},captured_at:"2026-08-23T00:00:00.000Z",expires_at:"2026-08-23T00:05:00.000Z",confidence:1})],{now:"2026-08-23T00:01:00.000Z"});
assert(/\b0\s*USDT/.test(zeroAnswer), "REL-304 real zero stays");
const keyA=ai.conversationStateRedisKey("u1","c1"); const keyB=ai.conversationStateRedisKey("u2","c1");
assert(keyA!==keyB, "REL-305 user bind");
const stateA=ai.buildConversationState({userId:"u1",conversationId:"c1"});
try { ai.assertStateOwnership(stateA,"u2"); fails.push("REL-305 ownership"); } catch(e) { assert(e.code==="CONV_STATE_OWNERSHIP_MISMATCH","REL-305 code"); }
const pii=ai.appendTurn(stateA,{role:"user",text:"900101-1234567 010-1234-5678"});
assert(!pii.turns[0].text.includes("900101-1234567"), "REL-305 no raw RRN");
assert(!pii.turns[0].text.includes("010-1234-5678"), "REL-305 no raw phone");
assert(pii.turns[0].text.includes("[\uC228\uAE40]"), "REL-305 hidden marker");
const orch=read("services/api-nest/src/ai/coach.orchestrator.ts");
assert(orch.includes("S_SAFE_REFUSE_TEMPLATE"), "orch danger template");
assert(!/requestedTools/.test(orch), "orch no client requestedTools");
const copy=read("packages/ui/copy/ko/peotteok.ts");
assert(copy.includes("pUnavailable:") && copy.includes("sSafeRefuse:"), "copy keys");
assert(!/UNAVAILABLE/.test(copy), "copy no UNAVAILABLE word");
assert(read("package.json").includes("verify:ai-coach-runtime"), "pkg script");
assert(read("tooling/verify/CATALOG.md").includes("ai-coach-runtime"), "catalog");
if (fails.length) { console.error("[verify:ai-coach-runtime] FAIL"); fails.forEach((f)=>console.error(" -",f)); process.exit(1); }
console.log("[verify:ai-coach-runtime] PASS (P UNAVAILABLE · G tools=[] · S safe-refuse · red-team · stale · PII)");
