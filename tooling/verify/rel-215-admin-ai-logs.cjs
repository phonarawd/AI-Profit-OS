/**
 * verify:rel-215-admin-ai-logs — existing ai_logs owner, no stub, no fake metrics
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

const page = read("apps/admin/app/admin/ai-logs/page.tsx");
const ctrl = read("services/api-nest/src/ai/ai-logs.admin.controller.ts");
const svc = read("services/api-nest/src/ai/ai-logs.admin.service.ts");
const guard = read("services/api-nest/src/common/admin-guard.selftest.ts");
const logOwner = read("services/ai-platform/src/ai-log.cjs");
const engine = read("services/api-nest/src/ai/ai.engine.ts");
const pkg = read("package.json");
const catalog = read("tooling/verify/CATALOG.md");
const ai = require(path.join(root, "services/ai-platform/src/index.cjs"));

if (page.includes("Admin §9.1.1 골격") && !page.includes("adminGet")) {
  fails.push("ai-logs must not stay stub-only");
}
for (const needle of [
  "/admin/ai-logs?tab=",
  '"traces"',
  'data-testid="ai-logs-traces-panel"',
  "/api/v1/admin/ai-logs",
  "/api/v1/admin/ai-pick/recent",
  "/api/v1/admin/ai-logs/eval/status",
  "/api/v1/admin/ai-logs/coach",
  "adminGet",
  "기록 없음",
  "불러오는 중",
  'data-forbid="fake-ai-log-truth"',
  "AdminTruth",
  "AdminFetchNote",
]) {
  if (!page.includes(needle)) fails.push(`ai-logs page missing ${needle}`);
}
if (!page.includes("asRecordList") && !page.includes("traceItems.length === 0")) {
  fails.push("ai-logs must render honest empty, not invented rows");
}
if (
  /성공률|정확도|환각률|0% 오류|100% 성공|AI 정상/.test(page) ||
  /hallucinationPct|successRate|accuracyPercent|safetyScore/.test(page)
) {
  fails.push("ai-logs must not invent AI metrics");
}
if (
  /DEMO_TRACE|FAKE_LOG|mockTrace|sampleRows\s*=/.test(page) ||
  /intent:\s*["']balance["']/.test(page)
) {
  fails.push("ai-logs must not invent demo/fake log rows");
}
if (page.includes("eval/run") || page.includes("ai-pick/score")) {
  fails.push("ai-logs page must stay read-only (no eval run / score POST)");
}
if (page.includes("UPDATE") && page.includes("balance")) {
  fails.push("ai-logs must not own balance UPDATE");
}
if (
  /service_role|sk-[A-Za-z0-9]{8}|Authorization:|Set-Cookie|refresh_token/.test(
    page,
  )
) {
  fails.push("ai-logs must not render secrets/tokens");
}

if (!/@UseGuards\(AdminGuard\)/.test(ctrl)) {
  fails.push("ai-logs.admin.controller must use AdminGuard");
}
if (!svc.includes("toAdminAiLogsView")) {
  fails.push("ai-logs.admin.service must project via existing toAdminAiLogsView");
}
if (!svc.includes("FROM public.ai_logs")) {
  fails.push("ai-logs.admin.service must read existing public.ai_logs");
}
if (/CREATE TABLE|ai_logs_v2|ai_observability/.test(svc)) {
  fails.push("must not create a second AI log owner");
}
if (!engine.includes("toAdminAiLogsView")) {
  fails.push("ai.engine must re-export toAdminAiLogsView");
}
if (!logOwner.includes("sanitizeTurnText")) {
  fails.push("ai-log owner must reuse sanitizeTurnText");
}
if (!guard.includes("user JWT -> 401 on admin route")) {
  fails.push("admin-guard.selftest must keep user JWT 401 EXIT_GATE");
}
if (!pkg.includes("verify:rel-215-admin-ai-logs")) {
  fails.push("package.json missing verify:rel-215-admin-ai-logs");
}
if (!catalog.includes("rel-215-admin-ai-logs")) {
  fails.push("CATALOG.md missing rel-215-admin-ai-logs");
}

if (typeof ai.toAdminAiLogsView !== "function") {
  fails.push("toAdminAiLogsView missing on existing AI log owner");
} else {
  const leaked = ai.toAdminAiLogsView({
    id: "11111111-1111-4111-8111-111111111111",
    user_id: "22222222-2222-4222-8222-222222222222",
    intent: "balance",
    lane: "P",
    provider_id: "openai",
    answer_path: "fact",
    tools_called: ["getBalance"],
    memory_ids: [],
    facts_used: [
      {
        source: "wallet",
        captured_at: "2026-08-22T00:00:00.000Z",
        confidence: 1,
        payload: {
          authorization: "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.aaaaaaaaaa.bbbbbbbbbb",
          cookie: "sid=abc",
          api_key: "sk-abcdefghijklmnopqrstuvwxyz123456",
          liabilityUsdt: "40",
        },
      },
    ],
    guard_result: { status: "pass", reason: "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.aaaaaaaaaa.bbbbbbbbbb" },
    answer_preview:
      "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.aaaaaaaaaa.bbbbbbbbbb and sk-abcdefghijklmnopqrstuvwxyz123456",
    created_at: "2026-08-22T00:00:00.000Z",
  });
  const dumped = JSON.stringify(leaked);
  if (/Bearer\s+eyJ|sk-[A-Za-z0-9]{20,}|sid=abc|liabilityUsdt/.test(dumped)) {
    fails.push("toAdminAiLogsView must redact secrets and omit fact payloads");
  }
  if (!String(leaked.answerPreview || "").includes("[REDACTED]")) {
    fails.push("toAdminAiLogsView must reuse [REDACTED] masking");
  }
  if (leaked.factsUsed?.[0]?.payload) {
    fails.push("toAdminAiLogsView must not expose facts_used.payload");
  }
  if (
    leaked.successRate != null ||
    leaked.accuracy != null ||
    leaked.hallucinationPct != null
  ) {
    fails.push("toAdminAiLogsView must not invent AI metrics");
  }
}

if (fails.length) {
  console.error("[verify:rel-215-admin-ai-logs] FAIL");
  for (const f of fails) console.error(" -", f);
  process.exit(1);
}
console.log("[verify:rel-215-admin-ai-logs] PASS");
