/**
 * verify:rel-208-admin-risk -- /admin/risk live queue
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

const page = read("apps/admin/app/admin/risk/page.tsx");
const api = read("apps/admin/lib/admin-api.ts");
const session = read("apps/admin/lib/admin-session.ts");
const bff = read("apps/admin/app/api/admin-bff/proxy/route.ts");
const bffServer = read("apps/admin/lib/admin-bff-server.ts");
const ctl = read("services/api-nest/src/risk/risk.admin.controller.ts");

if (page.includes("골격") && !page.includes("adminGet")) {
  fails.push("risk must not stay stub-only");
}

const needles = [
  "tab=queue",
  'data-testid="admin-risk-page"',
  'data-testid="risk-queue-panel"',
  "/api/v1/admin/risk/queue",
  "/api/v1/admin/risk/users/:userId/freeze",
  "adminGet",
  "adminSend",
  "newIdempotencyKey",
  "동결",
  "10자",
  "대기 중인 이상 신호가 없습니다",
  "AdminFetchNote",
  "P1-P24",
  "E1-E12",
];
for (const needle of needles) {
  if (!page.includes(needle)) fails.push("risk missing " + needle);
}

for (const banned of [
  "tronGridApiKey",
  "hotWalletXpubRef",
  'principalUsdt="0"',
  "fakeLedger",
]) {
  if (page.includes(banned)) {
    fails.push("risk must not expose " + banned);
  }
}

if (!api.includes("/api/admin-bff/proxy")) {
  fails.push("admin-api must route Admin requests through the same-origin BFF");
}
if (api.includes("getAdminToken") || api.includes("Bearer ${token}")) {
  fails.push("browser admin-api must not read or construct the Admin bearer");
}
if (api.includes("aipo_session")) {
  fails.push("admin-api must not read user session cookie");
}
if (session.includes("sessionStorage") || session.includes("localStorage")) {
  fails.push("admin-session must not persist the Admin bearer in browser storage");
}
if (session.includes("console.log") || session.includes("console.info")) {
  fails.push("admin-session must not log token");
}
if (!bff.includes("Authorization: `Bearer ${token}`")) {
  fails.push("Admin BFF must be the only layer that constructs the upstream bearer");
}
if (!bffServer.includes('ADMIN_API_PREFIX = "/api/v1/admin"') || !bffServer.includes("safeAdminTarget")) {
  fails.push("Admin BFF must fail closed to the /api/v1/admin target allowlist");
}

if (!ctl.includes("@UseGuards(AdminGuard)")) {
  fails.push("RiskAdminController must keep AdminGuard (user JWT != 200)");
}
if (!ctl.includes("@AdminOperator()")) {
  fails.push("freeze operator must come from Admin JWT");
}
if (/body\.(adminId|updatedByAdminId)\b/.test(ctl)) {
  fails.push("controller must not take adminId from body");
}

if (fails.length) {
  console.error("[verify:rel-208-admin-risk] FAIL");
  for (const f of fails) console.error(" -", f);
  process.exit(1);
}
console.log("[verify:rel-208-admin-risk] PASS");
