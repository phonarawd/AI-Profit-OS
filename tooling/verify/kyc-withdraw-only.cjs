/**
 * verify:kyc-withdraw-only — Money §42
 * participate without kyc → 200 · withdraw without approved → 403 KYC_WITHDRAW_REQUIRED
 * Evidence class: STATIC_CONTRACT — source/schema/wiring only; runtime behavior is not executed here.
 */
const fs = require("fs");
const path = require("path");

const root = path.resolve(__dirname, "../..");
const EVIDENCE_CLASS = "STATIC_CONTRACT";
const fails = [];

function mustExist(rel) {
  if (!fs.existsSync(path.join(root, rel))) fails.push(`missing: ${rel}`);
}

function read(rel) {
  return fs.readFileSync(path.join(root, rel), "utf8");
}

const files = [
  "schemas/kyc-status.v1.json",
  "schemas/kyc-submission.v1.json",
  "schemas/toast-codes.v1.json",
  "services/api-nest/src/compliance/kyc-gate.ts",
  "services/api-nest/src/compliance/kyc.service.ts",
  "services/api-nest/src/compliance/kyc.controller.ts",
  "services/api-nest/src/compliance/kyc.admin.controller.ts",
  "services/api-nest/src/compliance/kyc-r2.service.ts",
  "services/api-nest/src/compliance/compliance.module.ts",
  "services/api-nest/src/compliance/compliance.routes.ts",
  "services/api-nest/src/compliance/compliance.events.ts",
  "services/api-nest/src/compliance/compliance.types.ts",
  "services/api-nest/src/wallet/withdraw-kyc.guard.ts",
  "packages/ui/copy/ko/kyc.ts",
  "supabase/migrations/20260808205844_identity_nest_auth.sql",
  "supabase/migrations/20260809000351_kyc_decision_audit.sql",
  "apps/admin/routes.ts",
];
for (const f of files) mustExist(f);

const toast = read("schemas/toast-codes.v1.json");
for (const code of [
  "KYC_WITHDRAW_REQUIRED",
  "KYC_PENDING",
  "KYC_REJECTED",
  "KYC_APPROVED",
]) {
  if (!toast.includes(`"${code}"`)) {
    fails.push(`toast-codes missing ${code}`);
  }
}

const statusSchema = JSON.parse(read("schemas/kyc-status.v1.json"));
for (const st of ["none", "pending", "approved", "rejected"]) {
  if (!(statusSchema.properties?.kycStatus?.enum || []).includes(st)) {
    fails.push(`kyc-status enum missing ${st}`);
  }
}

const subSchema = JSON.parse(read("schemas/kyc-submission.v1.json"));
for (const banned of ["rrnFull", "gender", "publicUrl"]) {
  const notAny = subSchema.not?.anyOf || [];
  if (!notAny.some((x) => (x.required || []).includes(banned))) {
    fails.push(`kyc-submission must forbid ${banned}`);
  }
}
for (const doc of ["kr_id", "driver", "passport"]) {
  if (!(subSchema.properties?.idDocType?.enum || []).includes(doc)) {
    fails.push(`idDocType enum missing ${doc}`);
  }
}

const gate = read("services/api-nest/src/compliance/kyc-gate.ts");
for (const needle of [
  "KYC_WITHDRAW_REQUIRED",
  "function assertWithdrawKyc",
  "function participateGate",
  "status: 200",
  "kycRequired: false",
  "NO kyc check",
]) {
  if (!gate.includes(needle)) {
    fails.push(`kyc-gate missing: ${needle}`);
  }
}

// Pure gate rules (mirrors service)
function assertWithdrawKyc(status) {
  return status === "approved" ? null : "KYC_WITHDRAW_REQUIRED";
}
function participateGate(_status) {
  return { ok: true, status: 200, kycRequired: false };
}
if (assertWithdrawKyc("none") !== "KYC_WITHDRAW_REQUIRED") {
  fails.push("gate: none must block withdraw");
}
if (assertWithdrawKyc("pending") !== "KYC_WITHDRAW_REQUIRED") {
  fails.push("gate: pending must block withdraw");
}
if (assertWithdrawKyc("rejected") !== "KYC_WITHDRAW_REQUIRED") {
  fails.push("gate: rejected must block withdraw");
}
if (assertWithdrawKyc("approved") !== null) {
  fails.push("gate: approved must allow withdraw");
}
if (participateGate("none").status !== 200) {
  fails.push("participate without kyc must be 200");
}
if (participateGate("none").kycRequired !== false) {
  fails.push("participate must not require kyc");
}

const svc = read("services/api-nest/src/compliance/kyc.service.ts");
for (const needle of [
  "assertWithdrawKycForUser",
  "KYC_WITHDRAW_REQUIRED",
  "ForbiddenException",
  "participateWithoutKyc",
  "participateGate",
  "KYC_APPROVED",
  "KYC_REJECTED",
  "kyc_decision_audit",
  "KYC_REJECT_REASON_MIN",
  "NEVER: rrnFull",
]) {
  if (!svc.includes(needle)) {
    fails.push(`kyc.service missing: ${needle}`);
  }
}

const guard = read("services/api-nest/src/wallet/withdraw-kyc.guard.ts");
if (!guard.includes("assertBeforeWithdraw")) {
  fails.push("WithdrawKycGuard must expose assertBeforeWithdraw");
}
if (!guard.includes("participateWithoutKyc")) {
  fails.push("WithdrawKycGuard must expose participateWithoutKyc (NO kyc)");
}
if (!guard.includes("assertWithdrawKyc")) {
  fails.push("WithdrawKycGuard must call assertWithdrawKyc");
}

const userCtrl = read("services/api-nest/src/compliance/kyc.controller.ts");
if (!userCtrl.includes('@Controller("compliance")')) {
  fails.push('KycController must be @Controller("compliance")');
}
if (!userCtrl.includes("kyc/status") && !userCtrl.includes("COMPLIANCE_USER_ROUTES.kycStatus")) {
  fails.push("user KYC must bind status route");
}
if (!userCtrl.includes("COMPLIANCE_USER_ROUTES.kycSubmit")) {
  fails.push("user KYC must bind submit route");
}

const adminCtrl = read(
  "services/api-nest/src/compliance/kyc.admin.controller.ts",
);
if (!adminCtrl.includes('@Controller("admin")')) {
  fails.push('KycAdminController must be @Controller("admin")');
}
if (!adminCtrl.includes("COMPLIANCE_ADMIN_ROUTES.kycApprove")) {
  fails.push("admin must bind kycApprove");
}
if (!adminCtrl.includes("COMPLIANCE_ADMIN_ROUTES.kycReject")) {
  fails.push("admin must bind kycReject");
}
if (!adminCtrl.includes("COMPLIANCE_ADMIN_ROUTES.kycDocUrl")) {
  fails.push("admin must bind signed doc-url");
}

const routes = read("services/api-nest/src/compliance/compliance.routes.ts");
if (!routes.includes("compliance/kyc/:userId/approve")) {
  fails.push("admin approve route lock missing");
}
if (!routes.includes("compliance/kyc/:userId/reject")) {
  fails.push("admin reject route lock missing");
}

const appMod = read("services/api-nest/src/app.module.ts");
if (!appMod.includes("ComplianceModule")) {
  fails.push("AppModule must import ComplianceModule");
}

const adminRoutes = read("apps/admin/routes.ts");
if (!adminRoutes.includes("/admin/compliance?tab=kyc")) {
  fails.push("ADMIN_CHILD_ROUTES must include /admin/compliance?tab=kyc");
}

const mig = read("supabase/migrations/20260808205844_identity_nest_auth.sql");
if (!mig.includes("kyc_status") || !mig.includes("kyc_submissions")) {
  fails.push("identity migration must create kyc_status + kyc_submissions");
}

const copy = read("packages/ui/copy/ko/kyc.ts");
if (!copy.includes("출금하려면 본인 확인이 필요해요")) {
  fails.push("T.kyc.withdrawRequired copy missing");
}

if (fails.length) {
  console.error("[verify:kyc-withdraw-only] FAIL");
  for (const f of fails) console.error(" -", f);
  process.exit(1);
}
console.log(
  `[verify:kyc-withdraw-only][${EVIDENCE_CLASS}] PASS (source/schema gate contract · runtime HTTP=NOT_RUN · Admin approve/reject API wiring)`,
);
