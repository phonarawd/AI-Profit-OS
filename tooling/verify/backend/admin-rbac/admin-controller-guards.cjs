/**
 * BACKEND-ONLY PORT (consolidated) of tooling/verify/rel-207..216-admin-*.cjs
 * (recovery base SHA 86f15964): rel-207-admin-compliance · rel-208-admin-risk ·
 * rel-209-admin-execution-policy · rel-210-admin-opportunities · rel-211-admin-adapters ·
 * rel-212-admin-support · rel-213-admin-system-control · rel-214-admin-audit ·
 * rel-215-admin-ai-logs · rel-216-admin-financial.
 * Admin UI page assertions were recorded in quality/putduk-web-ui-assertions-handoff.md and
 * removed; what remains is the Nest admin controller contract (AdminGuard · AdminOperator ·
 * no adminId from body · forbidden fields · controller inventory).
 */
"use strict";
const fs = require("fs");
const path = require("path");

const root = path.resolve(__dirname, "../../../..");
const fails = [];

function read(rel) {
  const p = path.join(root, rel);
  if (!fs.existsSync(p)) {
    fails.push("missing: " + rel);
    return "";
  }
  return fs.readFileSync(p, "utf8");
}

function mustGuard(label, src, origin) {
  if (src && !src.includes("@UseGuards(AdminGuard)")) {
    fails.push(origin + ": " + label + " must keep AdminGuard (user JWT != 200)");
  }
}
function mustOperator(label, src, origin) {
  if (src && !src.includes("@AdminOperator()")) {
    fails.push(origin + ": " + label + " operator must come from Admin JWT (@AdminOperator)");
  }
}
function mustNotBodyAdminId(label, src, re, origin) {
  if (src && re.test(src)) {
    fails.push(origin + ": " + label + " must not take adminId from body");
  }
}

// rel-207-admin-compliance — KYC approve/reject/doc-url
const kycCtl = read("services/api-nest/src/compliance/kyc.admin.controller.ts");
mustGuard("KycAdminController", kycCtl, "rel-207");
mustOperator("KycAdminController", kycCtl, "rel-207");
mustNotBodyAdminId("KycAdminController", kycCtl, /body\.(adminId|decidedByAdminId)\b/, "rel-207");

// rel-208-admin-risk — risk queue / freeze
const riskCtl = read("services/api-nest/src/risk/risk.admin.controller.ts");
mustGuard("RiskAdminController", riskCtl, "rel-208");
mustOperator("RiskAdminController", riskCtl, "rel-208");
mustNotBodyAdminId("RiskAdminController", riskCtl, /body\.(adminId|updatedByAdminId)\b/, "rel-208");

// rel-209-admin-execution-policy — GET/PUT execution policy
const epCtl = read("services/api-nest/src/execution-policy/execution-policy.admin.controller.ts");
mustGuard("ExecutionPolicyAdminController", epCtl, "rel-209");
mustOperator("ExecutionPolicyAdminController", epCtl, "rel-209");
mustNotBodyAdminId("ExecutionPolicyAdminController", epCtl, /body\.(adminId|updatedByAdminId)\b/, "rel-209");
if (epCtl && !epCtl.includes("successRatePercent FORBIDDEN")) {
  fails.push("rel-209: ExecutionPolicyAdminController must reject successRatePercent");
}

// rel-210-admin-opportunities
mustGuard(
  "OpportunitiesAdminController",
  read("services/api-nest/src/opportunities/opportunities.admin.controller.ts"),
  "rel-210",
);

// rel-211-admin-adapters
mustGuard(
  "AdaptersAdminController",
  read("services/api-nest/src/adapters/adapters.admin.controller.ts"),
  "rel-211",
);

// rel-212-admin-support — deposit dispute decide
mustGuard(
  "DepositDisputeAdminController",
  read("services/api-nest/src/wallet/deposit-dispute.admin.controller.ts"),
  "rel-212",
);

// rel-213-admin-system-control — kill reads + REL-406 KillSwitchAdminController · no second system-control controller
mustGuard(
  "PushKillAdminController",
  read("services/api-nest/src/push/push-kill.admin.controller.ts"),
  "rel-213",
);
const nestSrc = path.join(root, "services/api-nest/src");
function walk(dir, acc) {
  for (const name of fs.readdirSync(dir)) {
    const p = path.join(dir, name);
    if (fs.statSync(p).isDirectory()) walk(p, acc);
    else if (name.endsWith(".admin.controller.ts")) acc.push(p.replace(/\\/g, "/"));
  }
  return acc;
}
const adminControllers = fs.existsSync(nestSrc) ? walk(nestSrc, []) : [];
if (adminControllers.length === 0) {
  fails.push("rel-213: no *.admin.controller.ts found under services/api-nest/src");
}
if (adminControllers.some((p) => /system-control\.admin\.controller\.ts$/.test(p))) {
  fails.push("rel-213: must not add a second system-control admin controller");
}
if (!adminControllers.some((p) => /kill-switch\.admin\.controller\.ts$/.test(p))) {
  fails.push("rel-213: REL-406 KillSwitchAdminController must exist");
}

// rel-214-admin-audit — delete UI forbidden (governance spec) · no AuditAdminController list API
const controlPlane = read("governance/admin/control-plane-superset.md");
if (controlPlane && !controlPlane.includes("AUDIT_DELETE_UI: FORBIDDEN")) {
  fails.push("rel-214: control-plane spec must keep AUDIT_DELETE_UI: FORBIDDEN");
}
if (adminControllers.some((p) => /audit\.admin\.controller\.ts$/.test(p))) {
  fails.push("rel-214: must not add AuditAdminController (no invented audit list API)");
}

// rel-215-admin-ai-logs — read-only AI logs · PII redaction in service
const aiLogsCtl = read("services/api-nest/src/ai/ai-logs.admin.controller.ts");
const aiPickCtl = read("services/api-nest/src/ai/ai-pick.admin.controller.ts");
const aiLogsSvc = read("services/api-nest/src/ai/ai-logs.admin.service.ts");
mustGuard("AiLogsAdminController", aiLogsCtl, "rel-215");
mustGuard("AiPickAdminController", aiPickCtl, "rel-215");
if (aiLogsSvc && !aiLogsSvc.includes("redactConversationPii")) {
  fails.push("rel-215: ai-logs service must redact preview (redactConversationPii)");
}
if (aiLogsSvc && !aiLogsSvc.includes("publicLogRow")) {
  fails.push("rel-215: ai-logs service must map public rows (publicLogRow)");
}

// rel-216-admin-financial — ledger financial report
const ledgerCtl = read("services/api-nest/src/ledger/ledger.admin.controller.ts");
mustGuard("LedgerAdminController", ledgerCtl, "rel-216");
if (ledgerCtl && !ledgerCtl.includes("financialReport")) {
  fails.push("rel-216: financialReport route required on LedgerAdminController");
}

if (fails.length) {
  console.error("[verify:admin-controller-guards] FAIL");
  for (const f of fails) console.error(" -", f);
  process.exit(1);
}
console.log(
  "[verify:admin-controller-guards] PASS (" +
    adminControllers.length +
    " admin controllers · AdminGuard/AdminOperator/no body adminId · rel-207..216 backend contract)",
);
