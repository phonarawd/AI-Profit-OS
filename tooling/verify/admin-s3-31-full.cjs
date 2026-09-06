/**
 * verify:admin-s3-31-full — S3 / 3.1 B1-B6
 * Connection matrix + dead button / fixture-as-live / capability wiring.
 * B7 live E2E stays S6. Production DB apply 0.
 */
"use strict";

const fs = require("fs");
const path = require("path");

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

function walk(dir, pred, acc = []) {
  if (!fs.existsSync(dir)) return acc;
  for (const ent of fs.readdirSync(dir, { withFileTypes: true })) {
    const abs = path.join(dir, ent.name);
    if (ent.isDirectory()) walk(abs, pred, acc);
    else if (pred(ent.name, abs)) acc.push(abs);
  }
  return acc;
}

const matrixRel = "governance/admin/s3-31-connection-matrix.v1.json";
const matrixRaw = read(matrixRel);
let matrix;
try {
  matrix = JSON.parse(matrixRaw);
} catch (err) {
  fail("matrix JSON invalid: " + err.message);
  matrix = { pages: [], controllers: [], backendOnly: [] };
}

const pageFiles = walk(path.join(root, "apps/admin/app"), (name) => name === "page.tsx")
  .map((abs) => path.relative(root, abs).replace(/\\/g, "/"))
  .sort();

const controllerFiles = walk(
  path.join(root, "services/api-nest/src"),
  (name) => name.endsWith(".admin.controller.ts"),
)
  .map((abs) => path.relative(root, abs).replace(/\\/g, "/"))
  .sort();

const matrixPages = new Set((matrix.pages || []).map((p) => p.file));
for (const file of pageFiles) {
  if (!matrixPages.has(file)) fail("B1 matrix missing page " + file);
}
for (const page of matrix.pages || []) {
  if (!fs.existsSync(path.join(root, page.file))) fail("matrix page gone " + page.file);
}

const matrixControllers = new Set((matrix.controllers || []).map((c) => c.file));
const backendOnly = new Set((matrix.backendOnly || []).map((b) => b.file));
for (const file of controllerFiles) {
  if (!matrixControllers.has(file) && !backendOnly.has(file)) {
    fail("B1 matrix missing controller " + file);
  }
}

const adminTsx = walk(
  path.join(root, "apps/admin"),
  (name) => name.endsWith(".tsx"),
)
  .map((abs) => path.relative(root, abs).replace(/\\/g, "/"))
  .filter((rel) => !rel.includes("node_modules"));

for (const rel of adminTsx) {
  const src = read(rel);
  if (/onClick=\{\(\)\s*=>\s*\{\s*\}\}/.test(src)) {
    fail("dead button " + rel);
  }
  if (/fakeUsers|mockUsers|fixtureAsLive/.test(src)) {
    fail("fixture-as-live " + rel);
  }
}

const dash = read("apps/admin/app/admin/page.tsx");
if (!dash.includes("UserCountTile")) fail("dashboard user-count still stub");
if (dash.includes('data-metric="user-count"') && dash.includes('data-truth="unavailable"')) {
  fail("dashboard hardcodes user-count unavailable");
}
if (!dash.includes("/api/v1/admin/wallet/withdraw-intents")) {
  fail("dashboard missing withdraw queue tile");
}

const usersPage = read("apps/admin/app/admin/users/page.tsx");
if (usersPage.includes('data-truth="unavailable"')) {
  fail("users page hardcoded unavailable");
}

const audit = read("apps/admin/app/admin/audit/page.tsx") + read("apps/admin/components/AdminLivePanels.tsx");
if (!audit.includes("/api/v1/admin/audit/events")) fail("audit list API not wired");
if (read("apps/admin/app/admin/audit/page.tsx").includes("adminSend")) {
  fail("audit must stay read-only");
}

const finance = read("apps/admin/app/admin/users/[id]/finance/page.tsx");
if (finance.includes("/balance-adjust")) fail("finance EXIT_GATE balance-adjust");
if (!finance.includes("finance-deposits-from-journal")) {
  fail("finance deposits tab not wired to journals");
}

const ledger = read("apps/admin/app/admin/ledger/page.tsx");
if (ledger.includes("balance-adjust")) fail("ledger must stay read-only");

const adjust = read("apps/admin/app/admin/users/[id]/adjust/page.tsx");
for (const needle of [
  "/api/v1/admin/users/${userId}/balance-adjust",
  "adjust-preview",
  "idempotencyKey",
  'data-forbid="balance-update"',
  "window.confirm",
]) {
  if (!adjust.includes(needle)) fail("B4 adjust missing " + needle);
}

const user360 = read("apps/admin/app/admin/users/[id]/page.tsx");
for (const needle of [
  "User360OpsPanel",
  "pii-reveal",
  'data-tab="policy"',
  "/api/v1/admin/users/${userId}/matching-policy",
]) {
  if (!user360.includes(needle)) fail("B3 user360 missing " + needle);
}

const ops = read("apps/admin/components/User360OpsPanel.tsx");
for (const needle of [
  "/api/v1/admin/users/${userId}/buckets",
  "/api/v1/admin/ledger/journals",
  "/api/v1/admin/risk/users/${userId}/freeze",
]) {
  if (!ops.includes(needle)) fail("B3 ops panel missing " + needle);
}

const shell = read("apps/admin/components/AdminShell.tsx");
if (!shell.includes("AdminCommandSearch")) fail("B2 command search not in shell");

const searchLib = read("apps/admin/lib/admin-command-search.ts");
if (!searchLib.includes("isUuid") || !searchLib.includes("/admin/users")) {
  fail("command search resolver missing");
}

const adapters = read("apps/admin/app/admin/adapters/page.tsx");
if (!adapters.includes("yahoo_jp")) fail("yahoo collector row missing");
if (!adapters.includes("/api/v1/admin/source-policy/health")) {
  fail("source-policy API not wired");
}

const opps = read("apps/admin/app/admin/opportunities/page.tsx");
if (!opps.includes("/api/v1/admin/match-controls/verbs")) {
  fail("match-control API not wired");
}

const system = read("apps/admin/app/admin/system-control/page.tsx");
if (!system.includes("/api/v1/admin/ops/modes")) fail("admin-ops modes not wired");
if (!system.includes("ReserveLivePanel")) fail("reserve live panel missing");

const caps = read("services/api-nest/src/common/admin-capabilities.ts");
if (!caps.includes("revealPii")) fail("revealPii capability missing");
if (!caps.includes("MatchingPolicyAdminController")) fail("B7 capability missing");

const usersCtl = read("services/api-nest/src/users/users.admin.controller.ts");
if (!usersCtl.includes("revealPii") || !usersCtl.includes("admin.users.pii_reveal")) {
  fail("PII reveal API/audit missing");
}

const routes = read("apps/admin/routes.ts");
if (!routes.includes("ADMIN_TOP_LEVEL_COUNT = 12")) fail("sidebar must stay 12");
if (!routes.includes('"/admin/users/:id/adjust"')) fail("adjust child route missing");
if (!routes.includes('"/admin/users/:id?tab=policy"')) fail("B7 policy child route missing");

if (matrix.liveE2e !== "NOT_RUN") fail("matrix.liveE2e must stay NOT_RUN until S6");
if (matrix.productionDbApply !== false) fail("matrix must not claim production DB apply");

if (fails.length) {
  console.error("[verify:admin-s3-31-full] FAIL");
  for (const f of fails) console.error(" -", f);
  process.exit(1);
}
console.log(
  "[verify:admin-s3-31-full] PASS (B1 matrix · B2-B6 wired · B7 present · LIVE_E2E=NOT_RUN)",
);
