/**
 * verify:rel-215-admin-ai-logs
 */
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
  console.error("[verify:rel-215-admin-ai-logs] FAIL");
  for (const f of fails) console.error(" -", f);
  process.exit(1);
}
console.log("[verify:rel-215-admin-ai-logs] PASS");
