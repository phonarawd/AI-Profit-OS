import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const read = (p) => fs.readFileSync(path.join(root, p), "utf8");
const must = (condition, message) => {
  if (!condition) throw new Error(`PHASE20_ASSERTION_FAILED: ${message}`);
};

const contract = JSON.parse(read("contracts/mining/mining-contract.v1.json"));
const adminController = read("services/api-nest/src/mining/mining.admin.controller.ts");
const trialController = read("services/api-nest/src/mining/mining-trial.controller.ts");
const trialService = read("services/api-nest/src/mining/mining-trial.service.ts");
const coordinator = read("services/api-nest/src/mining/mining-operation-coordinator.service.ts");
const highValue = read("services/api-nest/src/mining/mining-high-value.service.ts");
const moduleSource = read("services/api-nest/src/mining/mining.module.ts");
const capabilities = read("services/api-nest/src/common/admin-capabilities.ts");
const trialLedger = read("supabase/migrations/20260909040657_trial_welcome_grant.sql");
const foundation = read("supabase/migrations/20260920134053_mining_foundation_v1.sql");
const trialRepeatability = read("supabase/migrations/20260922010000_mining_trial_repeatability_v1.sql");
const governance = read("governance/mining/MINE-020-RELEASE-INTEGRATION.md");

must(contract.contractVersion === "2026-09-20.mine-v1", "contract version drift");

const highValueRoutes = {
  listHighValueReviews: ["GET", "/api/v1/admin/mining/high-value-reviews", '@Get("mining/high-value-reviews")'],
  getHighValueReview: ["GET", "/api/v1/admin/mining/high-value-reviews/:reviewId", '@Get("mining/high-value-reviews/:reviewId")'],
  approveHighValueReview: ["POST", "/api/v1/admin/mining/high-value-reviews/:reviewId/approve", '@Post("mining/high-value-reviews/:reviewId/approve")'],
  rejectHighValueReview: ["POST", "/api/v1/admin/mining/high-value-reviews/:reviewId/reject", '@Post("mining/high-value-reviews/:reviewId/reject")'],
};

for (const [name, [method, route, decorator]] of Object.entries(highValueRoutes)) {
  must(contract.adminApi?.[name]?.method === method, `${name} method drift`);
  must(contract.adminApi?.[name]?.path === route, `${name} route drift`);
  must(adminController.includes(decorator), `${name} controller route missing`);
  must(capabilities.includes(`${name}: `), `${name} RBAC classification missing`);
}

must(capabilities.includes('approveHighValueReview: write("balanceAdjust")'), "high-value approve finance authority drift");
must(capabilities.includes('rejectHighValueReview: write("balanceAdjust")'), "high-value reject finance authority drift");
must(moduleSource.includes("MiningHighValueService"), "high-value service not wired");
must(coordinator.includes("requestReviewIfRequired"), "start path does not enforce high-value review");
must(highValue.includes("metadata?.highValueThresholdAmount"), "high-value threshold is not admin-configured metadata");
must(highValue.includes("고액운용 기준 설정을 확인해 주세요."), "missing threshold must fail closed");
must(highValue.includes("mine_high_value_reviews"), "high-value review table not used");
must(highValue.includes("'START_PENDING'"), "high-value request must remain pending before approval");
must(highValue.includes("mine:position:start:${review.position_id}"), "approval does not reuse stable start ledger key");
must(highValue.includes('bucket: "principal"'), "approval principal debit missing");
must(highValue.includes('bucket: "locked"'), "approval locked credit missing");
must(highValue.includes('assertPath("mining_new_positions")'), "approval bypasses new-position kill switch");
must(foundation.includes("threshold is snapshotted, never hardcoded"), "foundation high-value threshold rule missing");

must(contract.userApi?.getTrialStatus?.method === "GET", "getTrialStatus method drift");
must(contract.userApi?.getTrialStatus?.path === "/api/v1/mining/trial", "getTrialStatus route drift");
must(contract.userApi?.startTrial?.method === "POST", "startTrial method drift");
must(contract.userApi?.startTrial?.path === "/api/v1/mining/trial/start", "startTrial route drift");
must(contract.adminApi?.getTrialConfig?.method === "GET", "getTrialConfig method drift");
must(contract.adminApi?.getTrialConfig?.path === "/api/v1/admin/mining/trial-config", "getTrialConfig route drift");
must(contract.adminApi?.updateTrialConfig?.method === "PATCH", "updateTrialConfig method drift");
must(contract.adminApi?.updateTrialConfig?.path === "/api/v1/admin/mining/trial-config", "updateTrialConfig route drift");

must(trialController.includes('@Controller("mining/trial")'), "trial user controller path missing");
must(trialController.includes("getTrialStatus"), "trial status handler missing");
must(trialController.includes('@Post("start")'), "trial start handler missing");
must(trialController.includes('@Controller("admin/mining/trial-config")'), "trial admin controller path missing");
must(trialController.includes("getTrialConfig"), "trial config read handler missing");
must(trialController.includes("updateTrialConfig"), "trial config update handler missing");
must(moduleSource.includes("MiningTrialController"), "trial user controller not wired");
must(moduleSource.includes("MiningTrialAdminController"), "trial admin controller not wired");
must(moduleSource.includes("MiningTrialService"), "trial service not wired");
must(capabilities.includes("MiningTrialAdminController"), "trial admin RBAC controller missing");
must(capabilities.includes('getTrialConfig: read("all")'), "trial config read capability missing");
must(capabilities.includes('updateTrialConfig: write("all")'), "trial config write capability missing");

must(trialLedger.includes("'trial_principal'"), "historical trial principal bucket missing");
must(trialLedger.includes("'trial_locked'"), "historical trial locked bucket missing");
must(trialLedger.includes("CREATE TABLE public.trial_program_config"), "historical trial config missing");
must(trialLedger.includes("CREATE TABLE public.trial_grants"), "historical trial grants missing");
must(trialLedger.includes("CREATE TABLE public.trial_user_state"), "historical trial state missing");
must(trialLedger.includes("trial welcome 1x; no journal without FX"), "historical trial grant rule missing");
must(foundation.includes("CREATE TABLE public.mine_trial_sessions"), "mining trial session table missing");
must(trialRepeatability.includes("DROP CONSTRAINT IF EXISTS mine_trial_sessions_trial_grant_id_key"), "configured repeated trials remain blocked by grant uniqueness");

must(trialService.includes('const TRIAL_GRANT_KEY = "trial_grant_welcome"'), "trial grant key drift");
must(trialService.includes("24 * 60 * 60 * 1000"), "24-hour trial window missing");
must(trialService.includes("SYSTEM_ACCOUNT_CODES.OPS_POOL"), "trial grant source is not ops pool");
must(trialService.includes('bucket: "trial_principal"'), "trial principal bucket path missing");
must(trialService.includes('bucket: "trial_locked"'), "trial locked bucket path missing");
must(trialService.includes('journalType: "trial_grant"'), "trial grant journal missing");
must(trialService.includes('journalType: "mine_position_lock"'), "trial lock journal missing");
must(trialService.includes('journalType: "mine_position_unlock"'), "trial unlock journal missing");
must(trialService.includes("this.engine.calculate"), "trial profit does not use canonical mining engine");
must(trialService.includes("profit_cap_krw"), "trial profit cap missing");
must(trialService.includes('assertPath("mining_new_positions")'), "trial start bypasses mining kill switch");

for (const marker of [
  "BLOCKER-TRIAL-LEDGER-PREREQ-01 — RESOLVED",
  "BLOCKER-DB-BASELINE-COMPAT-01",
  "20260909040657_trial_welcome_grant.sql",
  "20260922010000_mining_trial_repeatability_v1.sql",
  "d6e279841aaa62b7b75f26a7b33d1768923d551b",
  "mgsytcetsiecllmhcyox",
  "gaugwamwceqdnqdqrxqg",
  "Production untouched",
]) {
  must(governance.includes(marker), `governance marker missing: ${marker}`);
}

console.log("PHASE20_RELEASE_INTEGRATION_ASSERTIONS_PASS");
