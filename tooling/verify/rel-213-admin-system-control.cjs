/**
 * verify:rel-213-admin-system-control
 * Live-wire existing kill reads + preview/confirm writes.
 * REL-406 publishes the 9 server IDs and may add KillSwitchAdminController.
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

const page = read("apps/admin/app/admin/system-control/page.tsx");
const routes = read("apps/admin/routes.ts");
const pushCtl = read("services/api-nest/src/push/push-kill.admin.controller.ts");
const riskCtl = read("services/api-nest/src/risk/risk.admin.controller.ts");
const pkg = read("package.json");

if (page.includes("adminGet") === false) fails.push("system-control stub-only");
if (page.includes("골격")) fails.push("system-control leftover stub chrome");
if (!page.includes('data-testid="admin-system-control-page"')) {
  fails.push("system-control missing page testid");
}
if (!page.includes('data-testid="system-control-circuit-panel"')) {
  fails.push("system-control missing circuit panel");
}
if (!page.includes('data-testid="system-control-preview"')) {
  fails.push("system-control missing preview");
}
if (!page.includes("window.confirm")) {
  fails.push("system-control must confirm before apply");
}

for (const n of [
  "/api/v1/admin/system-control/push",
  "/api/v1/admin/risk/circuit",
  "/api/v1/admin/risk/circuit/close",
  "/api/v1/admin/growth/enabled",
  "/api/v1/admin/growth/referral/program",
  "/api/v1/admin/growth/referral/accrual-halt",
  "AdminFetchNote",
  "AdminTruth",
  "adminSend",
  'switchId="money_circuit"',
  'switchId="push_kill"',
  'switchId="growth_enabled"',
  'switchId="referral_accrual_halt"',
  'data-switch="GLOBAL_OPPORTUNITY_PAUSE"',
  'data-unpublished="true"',
  'data-testid="system-control-unpublished-rest"',
  'data-forbid="client_ledger_edit"',
  "tab=reserve",
  "system-control-reserve-panel",
  "ops.platform_reserve_usdt",
  "/api/v1/admin/system-control/reserve",
  "data-s2-input",
]) {
  if (page.includes(n) === false) fails.push("system-control missing " + n);
}

const switchIds = [
  ...page.matchAll(/(?:data-switch|switchId)="([^"]+)"/g),
].map((m) => m[1]);
const allowed = new Set([
  "money_circuit",
  "push_kill",
  "growth_enabled",
  "referral_accrual_halt",
  "GLOBAL_OPPORTUNITY_PAUSE",
  "GLOBAL_MATCHING_PAUSE",
  "GLOBAL_WITHDRAW_PAUSE",
  "GLOBAL_DEPOSIT_PAUSE",
  "GLOBAL_ALL_PAUSE",
  "MONEY_CIRCUIT",
  "PUSH_KILL",
  "GROWTH_PAUSE",
  "REFERRAL_ACCRUAL_HALT",
]);
for (const id of switchIds) {
  if (!allowed.has(id)) fails.push("invented switch id " + id);
}

if (/\/api\/v1\/admin\/system-control\/(open|kill)(?:\/|"|'|$)/.test(page)) {
  fails.push("system-control must not invent open/kill aliases");
}
if (/circuit\/open/.test(page)) {
  fails.push("system-control must not invent circuit open");
}
if (page.includes("principalUsdt") || page.includes("fakeLedger")) {
  fails.push("system-control must not edit/fake ledger");
}
if (/service_role|Bearer\s+[A-Za-z0-9._-]{20,}/.test(page)) {
  fails.push("system-control must not show secrets");
}

if (!routes.includes('ADMIN_TOP_LEVEL_COUNT = 12')) {
  fails.push("sidebar must stay 12");
}
if (routes.includes('href: "/admin/rbac"')) {
  fails.push("must not add /admin/rbac top-level");
}

if (!pushCtl.includes("@UseGuards(AdminGuard)")) {
  fails.push("PushKillAdminController must keep AdminGuard");
}
if (!riskCtl.includes("@UseGuards(AdminGuard)")) {
  fails.push("RiskAdminController must keep AdminGuard");
}

const nestAdmin = path.join(root, "services/api-nest/src");
function walk(dir, acc) {
  for (const name of fs.readdirSync(dir)) {
    const p = path.join(dir, name);
    if (fs.statSync(p).isDirectory()) walk(p, acc);
    else if (name.endsWith(".admin.controller.ts")) acc.push(p);
  }
}
const controllers = [];
walk(nestAdmin, controllers);
const extra = controllers.filter((p) =>
  /system-control\.admin\.controller\.ts$/.test(p.replace(/\\/g, "/")),
);
if (extra.length) {
  fails.push("must not add a second system-control admin controller");
}
const killCtl = controllers.some((p) =>
  /kill-switch\.admin\.controller\.ts$/.test(p.replace(/\\/g, "/")),
);
if (!killCtl) {
  fails.push("REL-406 KillSwitchAdminController must exist");
}

if (!pkg.includes("verify:rel-213-admin-system-control")) {
  fails.push("package.json missing verify:rel-213-admin-system-control");
}

if (fails.length) {
  console.error("[verify:rel-213-admin-system-control] FAIL");
  for (const f of fails) console.error(" -", f);
  process.exit(1);
}
console.log("[verify:rel-213-admin-system-control] PASS");
