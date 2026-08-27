/**
 * verify:rel-207-admin-compliance — /admin/compliance KYC live queue
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

const page = read("apps/admin/app/admin/compliance/page.tsx");
const api = read("apps/admin/lib/admin-api.ts");
const session = read("apps/admin/lib/admin-session.ts");
const bff = read("apps/admin/app/api/admin-bff/proxy/route.ts");
const bffServer = read("apps/admin/lib/admin-bff-server.ts");
const ctl = read("services/api-nest/src/compliance/kyc.admin.controller.ts");

if (page.includes("Admin §9.1.1 골격") && !page.includes("adminGet")) {
  fails.push("compliance must not stay stub-only");
}

for (const needle of [
  "tab=kyc",
  'data-testid="admin-compliance-page"',
  'data-testid="compliance-kyc-panel"',
  "/api/v1/admin/compliance/kyc",
  "/approve",
  "/reject",
  "/doc-url",
  "adminGet",
  "adminSend",
  "newIdempotencyKey",
  "승인",
  "거절",
  "10자",
  "대기 중인 본인 확인이 없습니다",
  "AdminFetchNote",
]) {
  if (!page.includes(needle)) fails.push(`compliance missing ${needle}`);
}

for (const banned of [
  "rrnFull",
  "gender",
  "publicUrl",
  "tronGridApiKey",
  "hotWalletXpubRef",
  'principalUsdt="0"',
  "fakeLedger",
]) {
  if (page.includes(banned)) {
    fails.push(`compliance must not expose ${banned}`);
  }
}

if (/\{[^}]*signedUrl[^}]*\}/.test(page) && /<p[^>]*>\{[^}]*signedUrl/.test(page)) {
  fails.push("compliance must not render signedUrl as page text");
}
if (page.includes("{") && />(\{[^}]*r2Key[^}]*\})</.test(page)) {
  fails.push("compliance must not render r2Key as page text");
}
if (page.includes("idDocR2Key}") || page.includes("selfieR2Key}")) {
  fails.push("compliance must not print R2 keys");
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
  fails.push("KycAdminController must keep AdminGuard (user JWT ≠ 200)");
}
if (!ctl.includes("@AdminOperator()")) {
  fails.push("approve/reject operator must come from Admin JWT");
}
if (/body\.(adminId|decidedByAdminId)\b/.test(ctl)) {
  fails.push("controller must not take adminId from body");
}

if (fails.length) {
  console.error("[verify:rel-207-admin-compliance] FAIL");
  for (const f of fails) console.error(" -", f);
  process.exit(1);
}
console.log("[verify:rel-207-admin-compliance] PASS");
