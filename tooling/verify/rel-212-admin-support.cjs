/**
 * verify:rel-212-admin-support — CS queue live wire, no fake tickets
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

const page = read("apps/admin/app/admin/support/page.tsx");
const ctrl = read(
  "services/api-nest/src/wallet/deposit-dispute.admin.controller.ts",
);
const inbox = read("services/api-nest/src/inbox/ops-inbox.admin.controller.ts");
const guard = read("services/api-nest/src/common/admin-guard.selftest.ts");

if (page.includes("Admin §9.1.1 골격") && !page.includes("adminGet")) {
  fails.push("support must not stay stub-only");
}
for (const needle of [
  'tab=queue',
  'data-testid="support-queue-panel"',
  "/api/v1/admin/wallet/deposit-disputes",
  "/credit",
  "/reject",
  "/api/v1/admin/users/",
  "ops-messages",
  "adminGet",
  "adminSend",
  "idempotencyKey",
  'data-forbid="fake-support-truth"',
  "AdminTruth",
]) {
  if (!page.includes(needle)) fails.push(`support missing ${needle}`);
}
if (!page.includes("asRecordList") && !page.includes("items.length === 0")) {
  fails.push("support must render honest empty, not invented rows");
}
if (
  /SLA_FIXTURE|fakeTicket|TICKET_PRIORITY|mockSupport/.test(page) ||
  /priority\s*=\s*["']high["']/.test(page) ||
  /slaHours\s*=\s*\d+/.test(page)
) {
  fails.push("support must not invent ticket/priority/SLA truth");
}
if (page.includes("라이브 채팅") || page.includes("바로 상담")) {
  fails.push("support must not invent live chat");
}
if (page.includes("UPDATE") && page.includes("balance")) {
  fails.push("support must not own balance UPDATE");
}
if (page.includes("service_role") || page.includes("withdrawPin")) {
  fails.push("support must not render secrets");
}

if (!/@UseGuards\(AdminGuard\)/.test(ctrl)) {
  fails.push("deposit-dispute.admin.controller must use AdminGuard");
}
if (!/@UseGuards\(AdminGuard\)/.test(inbox)) {
  fails.push("ops-inbox.admin.controller must use AdminGuard");
}
if (!guard.includes("user JWT -> 401 on admin route")) {
  fails.push("admin-guard.selftest must keep user JWT 401 EXIT_GATE");
}

if (fails.length) {
  console.error("[verify:rel-212-admin-support] FAIL");
  for (const f of fails) console.error(" -", f);
  process.exit(1);
}
console.log("[verify:rel-212-admin-support] PASS");
