/**
 * verify:ai-coach-ui — UI §6.4e / §27.10 peotteok surface wiring
 * Canon peotteok-chat · SSE client · P칩 · S거절 · degrade · voice pace
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

const files = [
  "packages/ui/components/peotteok/PeotteokChat.tsx",
  "packages/ui/components/peotteok/index.ts",
  "packages/ui/copy/ko/peotteok.ts",
  "packages/ui/canon/surfaces/peotteok-chat.wire.json",
  "packages/sdk/src/peotteok/usePeotteokChat.ts",
  "packages/sdk/src/peotteok/chat-sse.ts",
  "apps/web/app/me/peotteok/page.tsx",
];
for (const f of files) mustExist(f);

const ui = read("packages/ui/components/peotteok/PeotteokChat.tsx");
for (const needle of [
  'data-canon="peotteok-chat"',
  "T.peotteok.chatTitle",
  "T.peotteok.laneDisclaimer",
  "T.peotteok.factChips",
  "T.peotteok.placeholder",
  "T.peotteok.llmBusy",
  "T.peotteok.voice.greeting",
  "T.peotteok.voice.refuseS",
  "T.peotteok.voice.youngPace",
  "T.peotteok.voice.midPace",
  "T.peotteok.voice.seniorPace",
  "PEOTTEOK_LLM_BUSY",
  'data-lane="P"',
  'data-action="withdraw-ui"',
  "withdraw_execute_cta",
]) {
  if (!ui.includes(needle)) fails.push(`PeotteokChat missing ${needle}`);
}

// No autonomous withdraw mutate CTA
if (/execute_withdraw|approve_withdraw|ledger_post/.test(ui)) {
  fails.push("PeotteokChat must not call money mutate actions");
}

const sse = read("packages/sdk/src/peotteok/chat-sse.ts");
for (const needle of [
  "/api/v1/me/peotteok/chat",
  "/api/v1/me/peotteok/chips",
  "text/event-stream",
  'startsWith("event:")',
]) {
  if (!sse.includes(needle)) fails.push(`chat-sse missing ${needle}`);
}

const hook = read("packages/sdk/src/peotteok/usePeotteokChat.ts");
if (!hook.includes("export function usePeotteokChat")) {
  fails.push("must export usePeotteokChat");
}
if (!hook.includes("streamPeotteokChat")) {
  fails.push("usePeotteokChat must use streamPeotteokChat");
}

const page = read("apps/web/app/me/peotteok/page.tsx");
for (const needle of [
  "usePeotteokChat",
  "PeotteokChat",
  "@aipo/sdk/peotteok",
  "@aipo/ui/components/peotteok",
]) {
  if (!page.includes(needle)) fails.push(`peotteok page missing ${needle}`);
}

const copy = read("packages/ui/copy/ko/peotteok.ts");
for (const k of [
  "chatTitle",
  "laneDisclaimer",
  "factChips",
  "placeholder",
  "llmBusy",
  "sRefuse",
  "pRefresh",
  "youngPace",
  "midPace",
  "seniorPace",
  "greeting",
  "refuseS",
]) {
  if (!copy.includes(`${k}:`)) fails.push(`peotteok.ts missing ${k}`);
}

const wire = JSON.parse(
  read("packages/ui/canon/surfaces/peotteok-chat.wire.json") || "{}",
);
const byId = Object.fromEntries((wire.blocks || []).map((b) => [b.id, b]));
for (const id of ["brand", "title", "disclaimer", "log", "chips", "input"]) {
  if (!byId[id]) fails.push(`peotteok-chat.wire missing block ${id}`);
}
if (!(wire.forbidden || []).includes("withdraw_execute_cta")) {
  fails.push("peotteok-chat.forbidden must include withdraw_execute_cta");
}
if (!(wire.toasts || []).includes("PEOTTEOK_LLM_BUSY")) {
  fails.push("peotteok-chat.toasts must include PEOTTEOK_LLM_BUSY");
}

const sdkPkg = read("packages/sdk/package.json");
if (!sdkPkg.includes('"./peotteok"')) {
  fails.push("@aipo/sdk missing ./peotteok export");
}
const uiPkg = read("packages/ui/package.json");
if (!uiPkg.includes('"./components/peotteok"')) {
  fails.push("@aipo/ui missing ./components/peotteok export");
}

const rootPkg = read("package.json");
if (!rootPkg.includes('"verify:ai-coach-ui"')) {
  fails.push("package.json missing verify:ai-coach-ui");
}
const catalog = read("tooling/verify/CATALOG.md");
if (!catalog.includes("ai-coach-ui")) {
  fails.push("CATALOG.md must list ai-coach-ui");
}

if (fails.length) {
  console.error("[verify:ai-coach-ui] FAIL\n- " + fails.join("\n- "));
  process.exit(1);
}
console.log(
  "[verify:ai-coach-ui] PASS (Canon · SSE · P칩 · S거절 · degrade · voice)",
);
