/**
 * verify:rel-215-admin-ai-logs
 * STATIC_VERIFIER vs LOCAL_RUNTIME are labeled separately.
 * This script never claims BROWSER_PASS or REMOTE_CI_PASS.
 */
const { spawnSync } = require("child_process");
const fs = require("fs");
const path = require("path");
const root = path.resolve(__dirname, "../..");
const fails = [];
function read(rel) {
  const p = path.join(root, rel);
  if (!fs.existsSync(p)) {
    fails.push("missing: " + rel);
    return "";
  }
  return fs.readFileSync(p, "utf8");
}

const page = read("apps/admin/app/admin/ai-logs/page.tsx");
const truth = read("apps/admin/lib/admin-truth.ts");
const mask = read("apps/admin/lib/admin-log-mask.ts");
const ctl = read("services/api-nest/src/ai/ai-logs.admin.controller.ts");
const svc = read("services/api-nest/src/ai/ai-logs.admin.service.ts");
const pickCtl = read("services/api-nest/src/ai/ai-pick.admin.controller.ts");

if (page.includes("adminGet") === false) fails.push("ai-logs stub-only");
if (page.includes("maskLogPreview") === false) fails.push("ai-logs must mask preview");
if (/adminSend/.test(page)) fails.push("ai-logs must stay read-only");
if (/name=["']sellSuccessRate["']/.test(page) || /<input[^>]+sellSuccessRate/.test(page)) {
  fails.push("ai-logs banned sellSuccessRate input");
}
if (/adminOverride/.test(page)) fails.push("ai-logs banned adminOverride");
if (page.includes('data-testid="admin-ai-logs-page"') === false) {
  fails.push("ai-logs missing page testid");
}
for (const n of [
  "/api/v1/admin/ai-logs",
  "/api/v1/admin/ai-pick/recent",
  "/api/v1/admin/ai-logs/eval/status",
  "/api/v1/admin/ai-logs/coach",
  "AdminFetchNote",
  'data-forbid="ai_score_admin_override"',
  'data-auto-learning="false"',
  'data-forbid="l3_money_execute"',
  'data-testid="ai-logs-empty-traces"',
  'data-testid="ai-logs-empty-pick"',
  'data-testid="ai-logs-empty-spotcheck"',
]) {
  if (page.includes(n) === false) fails.push("ai-logs missing " + n);
}
if (truth.includes("maskLogPreview") === false) {
  fails.push("admin-truth missing maskLogPreview");
}
if (mask.includes("export function maskLogPreview") === false) {
  fails.push("admin-log-mask missing maskLogPreview");
}
if (mask.includes("EMAIL_LIKE") === false || mask.includes("String.fromCharCode(64)") === false) {
  fails.push("admin-log-mask must hide mailbox-like preview with a bounded helper");
}
if (!ctl.includes("@UseGuards(AdminGuard)")) {
  fails.push("ai-logs controller must keep AdminGuard");
}
if (!pickCtl.includes("@UseGuards(AdminGuard)")) {
  fails.push("ai-pick controller must keep AdminGuard");
}
if (!svc.includes("redactConversationPii")) {
  fails.push("ai-logs service must redact preview");
}
if (!svc.includes("publicLogRow")) {
  fails.push("ai-logs service must map public rows");
}

const pkg = read("package.json");
if (!pkg.includes("verify:rel-215-admin-ai-logs")) {
  fails.push("package.json missing verify:rel-215-admin-ai-logs");
}

if (fails.length) {
  console.error("[verify:rel-215-admin-ai-logs] STATIC FAIL");
  for (const f of fails) console.error(" -", f);
  process.exit(1);
}
console.log("[verify:rel-215-admin-ai-logs] STATIC_VERIFIER_PASS");

const runtimeRel = "apps/admin/lib/admin-truth.runtime.test.ts";
const runtime = spawnSync(
  process.execPath,
  ["--test", "--experimental-strip-types", runtimeRel],
  { cwd: root, encoding: "utf8", timeout: 30_000 },
);
process.stdout.write(runtime.stdout || "");
process.stderr.write(runtime.stderr || "");
if (runtime.status !== 0) {
  console.error("[verify:rel-215-admin-ai-logs] LOCAL_RUNTIME FAIL");
  process.exit(1);
}
console.log("[verify:rel-215-admin-ai-logs] LOCAL_RUNTIME_PASS");
