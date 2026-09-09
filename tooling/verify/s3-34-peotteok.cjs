/**
 * verify:s3-34-peotteok — S3 / 3.4 Phase E (code slice)
 * history persist · citation · IME · IDOR · money tool autonomy 0
 * Live SSE / staging browser / visual 390/768/1440 stay S6.
 * Production DB apply 0. launchYes must stay false.
 */
"use strict";

const fs = require("fs");
const path = require("path");
const { spawnSync } = require("child_process");

const root = path.resolve(__dirname, "../..");
const fails = [];
const fail = (msg) => fails.push(msg);

function read(rel) {
  const fp = path.join(root, rel);
  if (!fs.existsSync(fp)) {
    fail("missing: " + rel);
    return "";
  }
  return fs.readFileSync(fp, "utf8");
}

const matrixRel = "governance/peotteok/s3-34-connection-matrix.v1.json";
const matrixRaw = read(matrixRel);
let matrix;
try {
  matrix = JSON.parse(matrixRaw);
} catch (err) {
  fail("matrix JSON invalid: " + err.message);
  matrix = { checks: {} };
}

if (matrix.liveE2e !== "NOT_RUN") fail("matrix.liveE2e must stay NOT_RUN until S6");
if (matrix.productionDbApply !== false) fail("matrix must not claim production DB apply");
if (matrix.launchYes !== false) fail("matrix.launchYes must stay false");
if (matrix.stagingBrowser !== "NOT_RUN") fail("matrix.stagingBrowser must stay NOT_RUN");

const liveClaims = ["E_live_sse_e2e", "E_staging_browser", "E_visual_diff_390_768_1440"];
for (const key of liveClaims) {
  if (matrix.checks && matrix.checks[key] !== "NOT_RUN") {
    fail("matrix." + key + " must stay NOT_RUN");
  }
}

const history = read("services/api-nest/src/ai/peotteok-history.service.ts");
if (!history.includes("WHERE user_id = $1") && !history.includes("user_id = $1::uuid")) {
  fail("history list must bind jwt user_id");
}
if (!history.includes("user_id = $2::uuid")) {
  fail("history get/mutate must bind conversation id AND user_id");
}
if (!history.includes("42P01")) {
  fail("history must ignore missing table until staging apply");
}

const citation = read("services/api-nest/src/ai/peotteok-citation.ts");
if (!citation.includes('kind: "opportunity"') || !citation.includes('kind: "ledger"')) {
  fail("citation helpers must emit opportunity/ledger kinds");
}

const routes = read("services/api-nest/src/ai/coach.routes.ts");
if (!routes.includes('conversations: "me/peotteok/conversations"')) {
  fail("COACH_USER_ROUTES missing conversations");
}
if (!routes.includes('conversation: "me/peotteok/conversations/:id"')) {
  fail("COACH_USER_ROUTES missing conversation :id");
}

const controller = read("services/api-nest/src/ai/coach.controller.ts");
if (!controller.includes("PeotteokHistoryService")) {
  fail("CoachController must use PeotteokHistoryService");
}
if (!controller.includes("sessionUserId")) {
  fail("CoachController must keep JWT sessionUserId");
}
if (/body\?\.userId|query\?\.userId|body\.userId|query\.userId/.test(controller)) {
  fail("CoachController must not trust body/query userId");
}

const orch = read("services/api-nest/src/ai/coach.orchestrator.ts");
if (!orch.includes("appendTurn")) {
  fail("orchestrator must persist history turns");
}
if (!orch.includes("citations")) {
  fail("orchestrator done event must include citations");
}
for (const bad of [
  "execute_withdraw",
  "approve_withdraw",
  "ledger_post",
  "credit_balance",
]) {
  if (orch.includes(bad)) fail("orchestrator must not call " + bad);
}

const ui = read("packages/ui/components/peotteok/PeotteokChat.tsx");
if (!ui.includes("isComposing")) fail("PeotteokChat missing isComposing");
if (!ui.includes("keyCode === 229")) fail("PeotteokChat missing IME keyCode === 229");
if (!ui.includes("citations") && !ui.includes("citation")) {
  fail("PeotteokChat must render citation cards");
}
if (/execute_withdraw|approve_withdraw|ledger_post/.test(ui)) {
  fail("PeotteokChat must not call money mutate actions");
}

const hook = read("packages/sdk/src/peotteok/usePeotteokChat.ts");
if (!hook.includes("openConversation") || !hook.includes("newConversation")) {
  fail("usePeotteokChat must expose history open/new");
}
if (!hook.includes("listPeotteokConversations")) {
  fail("usePeotteokChat must load durable history");
}

const sdkHist = read("packages/sdk/src/peotteok/history.ts");
if (!sdkHist.includes("/api/v1/me/peotteok/conversations")) {
  fail("sdk history client missing conversations path");
}

const copy = read("packages/ui/copy/ko/peotteok.ts");
for (const k of ["newChat", "history", "emptyHistory", "citationSource"]) {
  if (!copy.includes(k + ":")) fail("peotteok.ts missing " + k);
}

const privacy = read("services/api-nest/src/auth/privacy-account.service.ts");
if (!privacy.includes('["peotteok_messages", "user_id"]')) {
  fail("privacy purge must delete peotteok_messages");
}
if (!privacy.includes('["peotteok_conversations", "user_id"]')) {
  fail("privacy purge must delete peotteok_conversations");
}

const mig = read("supabase/migrations/20260906160000_s3_34_peotteok_history.sql");
if (!mig.includes("peotteok_conversations") || !mig.includes("peotteok_messages")) {
  fail("3.4 migration missing history tables");
}
if (/OPPORTUNITY_POOL/i.test(mig)) {
  fail("3.4 must not recreate SYS:OPPORTUNITY_POOL");
}

const fixture = read("tooling/verify/fixtures/migrations-applied.v1.json");
if (!fixture.includes("20260906160000")) {
  fail("committedUnapplied must list 3.4 migration");
}

const pkg = read("package.json");
if (!pkg.includes('"verify:s3-34-peotteok"')) {
  fail("package.json missing verify:s3-34-peotteok");
}
const domain = read("tooling/verify/domain-by-path.cjs");
if (!domain.includes("s3-34-peotteok.cjs")) {
  fail("domain-by-path must trigger s3-34-peotteok.cjs");
}

const idor = spawnSync(
  process.execPath,
  [
    "--experimental-strip-types",
    "--test",
    "services/api-nest/src/ai/peotteok-history.idor.runtime.test.ts",
  ],
  { cwd: root, encoding: "utf8", timeout: 30_000 },
);
if (idor.status !== 0) {
  fail("peotteok-history.idor.runtime.test.ts failed");
  if (idor.stdout) fail(idor.stdout.slice(0, 800));
  if (idor.stderr) fail(idor.stderr.slice(0, 400));
}

const autonomy = spawnSync(
  process.execPath,
  ["tooling/verify/ai-coach-no-autonomy.cjs"],
  { cwd: root, encoding: "utf8", timeout: 30_000 },
);
process.stdout.write(autonomy.stdout || "");
process.stderr.write(autonomy.stderr || "");
if (autonomy.status !== 0) {
  fail("ai-coach-no-autonomy failed");
}

const uiGate = spawnSync(
  process.execPath,
  ["tooling/verify/ai-coach-ui.cjs"],
  { cwd: root, encoding: "utf8", timeout: 30_000 },
);
process.stdout.write(uiGate.stdout || "");
process.stderr.write(uiGate.stderr || "");
if (uiGate.status !== 0) {
  fail("ai-coach-ui failed");
}

if (fails.length) {
  console.error("[verify:s3-34-peotteok] FAIL");
  for (const f of fails) console.error(" -", f);
  process.exit(1);
}
console.log(
  "[verify:s3-34-peotteok] PASS (history/citation/IME/IDOR code · LIVE_E2E=NOT_RUN · productionDbApply=0)",
);
