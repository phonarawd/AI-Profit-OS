/**
 * verify:rel-209-admin-execution-policy -- /admin/execution-policy live GET/PUT
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

const page = read("apps/admin/app/admin/execution-policy/page.tsx");
const api = read("apps/admin/lib/admin-api.ts");
const session = read("apps/admin/lib/admin-session.ts");
const ctl = read(
  "services/api-nest/src/execution-policy/execution-policy.admin.controller.ts",
);

if (page.includes("골격") && !page.includes("adminGet")) {
  fails.push("execution-policy must not stay stub-only");
}

const needles = [
  'data-testid="admin-execution-policy-page"',
  'data-field="matchStrictness"',
  'data-soft-sec="60"',
  'data-hard-sec="90"',
  'data-forbid="successRatePercent"',
  'data-kpi="observedSuccessRate"',
  'data-field="feed.nearMissCapUsdt"',
  "/api/v1/admin/execution-policy",
  "/api/v1/admin/execution-policy/stats/today",
  "adminGet",
  "adminSend",
  "매칭 성공 조절",
  "변경 사유",
  "4자",
  "오늘 관측된 종료 건이 없습니다",
  "AdminFetchNote",
  "PUT",
];
for (const needle of needles) {
  if (!page.includes(needle)) fails.push("execution-policy missing " + needle);
}

if (/name=["']successRatePercent["']/.test(page)) {
  fails.push("execution-policy must not name successRatePercent input");
}
if (/type=["']range["']/.test(page) && /success/i.test(page)) {
  fails.push("execution-policy must not expose success rate slider");
}
if (/successCount\s*\/\s*|denominator\s*\/\s*|observedSuccessRate\s*\*/.test(page)) {
  fails.push("execution-policy must not compute observed rate on the client");
}

for (const banned of [
  "tronGridApiKey",
  "hotWalletXpubRef",
  'principalUsdt="0"',
  "fakeLedger",
  "updatedByAdminId",
  "successRatePercent:",
]) {
  if (page.includes(banned)) {
    fails.push("execution-policy must not expose " + banned);
  }
}

if (!api.includes("getAdminToken")) {
  fails.push("admin-api must send Admin bearer, not user session");
}
if (api.includes("aipo_session")) {
  fails.push("admin-api must not read user session cookie");
}
if (session.includes("console.log") || session.includes("console.info")) {
  fails.push("admin-session must not log token");
}

if (!ctl.includes("@UseGuards(AdminGuard)")) {
  fails.push("ExecutionPolicyAdminController must keep AdminGuard");
}
if (!ctl.includes("@AdminOperator()")) {
  fails.push("PUT operator must come from Admin JWT");
}
if (/body\.(adminId|updatedByAdminId)\b/.test(ctl)) {
  fails.push("controller must not take adminId from body");
}
if (!ctl.includes("successRatePercent FORBIDDEN")) {
  fails.push("controller must reject successRatePercent");
}

if (fails.length) {
  console.error("[verify:rel-209-admin-execution-policy] FAIL");
  for (const f of fails) console.error(" -", f);
  process.exit(1);
}
console.log("[verify:rel-209-admin-execution-policy] PASS");
