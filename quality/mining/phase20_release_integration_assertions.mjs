import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const read = (p) => fs.readFileSync(path.join(root, p), "utf8");
const must = (condition, message) => {
  if (!condition) throw new Error(`PHASE20_ASSERTION_FAILED: ${message}`);
};

const contract = JSON.parse(read("contracts/mining/mining-contract.v1.json"));
const userController = read("services/api-nest/src/mining/mining.controller.ts");
const adminController = read("services/api-nest/src/mining/mining.admin.controller.ts");
const coordinator = read("services/api-nest/src/mining/mining-operation-coordinator.service.ts");
const highValue = read("services/api-nest/src/mining/mining-high-value.service.ts");
const moduleSource = read("services/api-nest/src/mining/mining.module.ts");
const capabilities = read("services/api-nest/src/common/admin-capabilities.ts");
const foundation = read("supabase/migrations/20260920134053_mining_foundation_v1.sql");
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

// Trial stays an explicit open blocker until its historical ledger prerequisites
// are reconciled with the actual release database baseline.
must(!userController.includes('@Get("trial")'), "trial user route appeared without PHASE20 trial gate update");
must(!userController.includes('@Post("trial/start")'), "trial start route appeared without PHASE20 trial gate update");
must(!adminController.includes('@Get("mining/trial-config")'), "trial admin route appeared without PHASE20 trial gate update");
must(!adminController.includes('@Patch("mining/trial-config")'), "trial admin update appeared without PHASE20 trial gate update");

for (const marker of [
  "BLOCKER-DB-BASELINE-COMPAT-01",
  "BLOCKER-TRIAL-LEDGER-PREREQ-01",
  "d6e279841aaa62b7b75f26a7b33d1768923d551b",
  "mgsytcetsiecllmhcyox",
  "gaugwamwceqdnqdqrxqg",
  "Production untouched",
]) {
  must(governance.includes(marker), `governance marker missing: ${marker}`);
}

console.log("PHASE20_RELEASE_INTEGRATION_ASSERTIONS_PASS");
