import fs from "node:fs";
import path from "node:path";
import { createRequire } from "node:module";

const root = process.cwd();
const read = (p) => fs.readFileSync(path.join(root, p), "utf8");
const must = (condition, message) => {
  if (!condition) throw new Error(`PHASE05_ASSERTION_FAILED: ${message}`);
};

const contract = JSON.parse(read("contracts/mining/mining-contract.v1.json"));
const controller = read("services/api-nest/src/mining/mining.admin.controller.ts");
const service = read("services/api-nest/src/mining/mining-admin.service.ts");
const coordinator = read("services/api-nest/src/mining/mining-operation-coordinator.service.ts");
const moduleSource = read("services/api-nest/src/mining/mining.module.ts");
const capabilities = read("services/api-nest/src/common/admin-capabilities.ts");
const killCore = read("services/api-nest/admin-kill-switch.core.cjs");
const migration = read("supabase/migrations/20260921162500_mining_admin_controls_v1.sql");
const internal = read("services/api-nest/src/mining/mining.internal.controller.ts");
const reads = read("services/api-nest/src/mining/mining-read.service.ts");
const activation = read("services/api-nest/src/mining/mining-rate-activation.service.ts");

must(controller.includes("@UseGuards(AdminGuard)"), "AdminGuard missing");
must(controller.includes('@Controller("admin")'), "admin controller prefix missing");
must(!controller.includes("api/v1/admin"), "global prefix duplicated in admin controller");

const expected = {
  listMines: ["GET", "/api/v1/admin/mines", '@Get("mines")'],
  createMine: ["POST", "/api/v1/admin/mines", '@Post("mines")'],
  getMine: ["GET", "/api/v1/admin/mines/:mineId", '@Get("mines/:mineId")'],
  updateMine: ["PATCH", "/api/v1/admin/mines/:mineId", '@Patch("mines/:mineId")'],
  publishMine: ["POST", "/api/v1/admin/mines/:mineId/publish", '@Post("mines/:mineId/publish")'],
  pauseNewPositions: ["POST", "/api/v1/admin/mines/:mineId/pause-new-positions", '@Post("mines/:mineId/pause-new-positions")'],
  pauseMine: ["POST", "/api/v1/admin/mines/:mineId/pause", '@Post("mines/:mineId/pause")'],
  resumeMine: ["POST", "/api/v1/admin/mines/:mineId/resume", '@Post("mines/:mineId/resume")'],
  endMine: ["POST", "/api/v1/admin/mines/:mineId/end", '@Post("mines/:mineId/end")'],
  listRateVersions: ["GET", "/api/v1/admin/mines/:mineId/rates", '@Get("mines/:mineId/rates")'],
  createRateVersion: ["POST", "/api/v1/admin/mines/:mineId/rates", '@Post("mines/:mineId/rates")'],
  updateRateVersion: ["PATCH", "/api/v1/admin/mines/:mineId/rates/:rateVersionId", '@Patch("mines/:mineId/rates/:rateVersionId")'],
  requestRateApproval: ["POST", "/api/v1/admin/mines/:mineId/rates/:rateVersionId/request-approval", '@Post("mines/:mineId/rates/:rateVersionId/request-approval")'],
  approveRateVersion: ["POST", "/api/v1/admin/mines/:mineId/rates/:rateVersionId/approve", '@Post("mines/:mineId/rates/:rateVersionId/approve")'],
  scheduleRateVersion: ["POST", "/api/v1/admin/mines/:mineId/rates/:rateVersionId/schedule", '@Post("mines/:mineId/rates/:rateVersionId/schedule")'],
  listPositions: ["GET", "/api/v1/admin/mining/positions", '@Get("mining/positions")'],
  getPosition: ["GET", "/api/v1/admin/mining/positions/:positionId", '@Get("mining/positions/:positionId")'],
  listSettlements: ["GET", "/api/v1/admin/mining/settlements", '@Get("mining/settlements")'],
  getSettlement: ["GET", "/api/v1/admin/mining/settlements/:settlementId", '@Get("mining/settlements/:settlementId")'],
  retrySettlement: ["POST", "/api/v1/admin/mining/settlements/:settlementId/retry", '@Post("mining/settlements/:settlementId/retry")'],
};

for (const [name, [method, route, decorator]] of Object.entries(expected)) {
  must(contract.adminApi?.[name]?.method === method, `${name} method drift`);
  must(contract.adminApi?.[name]?.path === route, `${name} path drift`);
  must(controller.includes(decorator), `${name} controller route missing`);
  must(capabilities.includes(`${name}: `), `${name} RBAC classification missing`);
}

for (const handler of [
  "createMine", "updateMine", "publishMine", "pauseNewPositions", "pauseMine",
  "resumeMine", "endMine", "createRateVersion", "updateRateVersion",
  "requestRateApproval", "approveRateVersion", "scheduleRateVersion", "retrySettlement",
]) {
  const start = controller.indexOf(`${handler}(`);
  must(start >= 0, `${handler} handler missing`);
  const window = controller.slice(Math.max(0, start - 250), start + 900);
  must(window.includes('Headers("idempotency-key")'), `${handler} Idempotency-Key missing`);
}

must(capabilities.includes("MiningAdminController: {"), "mining admin RBAC controller missing");
must(capabilities.includes('retrySettlement: write("balanceAdjust")'), "settlement retry finance authority drift");
must(capabilities.includes('pauseNewPositions: write("circuit")'), "mine pause capability drift");
must(capabilities.includes('pauseMine: write("circuit")'), "mine emergency pause capability drift");

must(service.includes("admin_approval_requests"), "maker/checker approval table not used");
must(service.includes("maker_admin_id"), "approval maker check missing");
must(service.includes("created_by_admin_id === input.actor.adminId"), "rate creator/checker separation missing");
must(service.includes("request.maker_admin_id === input.actor.adminId"), "approval request maker/checker separation missing");
must(service.includes("admin_audit_events"), "admin audit/idempotency registry missing");
must(service.includes("pg_advisory_xact_lock(hashtext($1))"), "cross-instance admin idempotency lock missing");
must(service.includes("payload?.fingerprint"), "semantic idempotency fingerprint missing");

must(killCore.includes('"MINING_NEW_POSITIONS_PAUSE"'), "global new-position mining switch missing");
must(killCore.includes('"MINING_SETTLEMENT_PAUSE"'), "global settlement mining switch missing");
must(killCore.includes("mining_new_positions"), "new-position kill path missing");
must(killCore.includes("mining_settlement"), "settlement kill path missing");
must(coordinator.includes('assertPath("mining_new_positions")'), "new-position server enforcement missing");
must(coordinator.includes('assertPath("mining_settlement")'), "settlement server enforcement missing");
must(coordinator.includes("async assertSettlementAllowed()"), "settlement hold helper missing");
must(migration.includes("MINING_NEW_POSITIONS_PAUSE"), "kill switch DB constraint migration missing new-position switch");
must(migration.includes("MINING_SETTLEMENT_PAUSE"), "kill switch DB constraint migration missing settlement switch");

const require = createRequire(import.meta.url);
const kill = require(path.join(root, "services/api-nest/admin-kill-switch.core.cjs"));
must(
  kill.evaluatePath("mining_new_positions", { MINING_NEW_POSITIONS_PAUSE: true }).blocked === true,
  "new-position switch does not block runtime path",
);
must(
  kill.evaluatePath("mining_settlement", { MINING_SETTLEMENT_PAUSE: true }).blocked === true,
  "settlement switch does not block runtime path",
);
must(
  kill.evaluatePath("mining_settlement", { MONEY_CIRCUIT: true }).blocked === true,
  "money circuit does not block mining settlement",
);
must(
  kill.evaluatePath("mining_new_positions", {}).blocked === false,
  "mining new-position path defaults blocked",
);

must(moduleSource.includes("MiningAdminController"), "admin controller not wired");
must(moduleSource.includes("MiningAdminService"), "admin service not wired");
must(moduleSource.includes("KillSwitchModule"), "kill switch module not wired");
must(moduleSource.includes("MiningRateActivationService"), "rate activation service not wired");
const holdIndex = internal.indexOf("operations.assertSettlementAllowed()");
const activationIndex = internal.indexOf("rateActivation.activateDue(now)");
const settlementIndex = internal.indexOf("operations.settleDueDaily(");
must(holdIndex >= 0, "settlement hold check missing from internal tick");
must(activationIndex > holdIndex, "rate activation occurs before settlement hold check");
must(settlementIndex > activationIndex, "daily settlement must follow rate activation");
must(activation.includes("status='SCHEDULED'"), "scheduled rate activation query missing");
must(activation.includes("m.status <> 'ENDED'"), "ended mine rate activation guard missing");
must(activation.includes("status='ENDED',ended_at=$3::timestamptz"), "previous active rate exact end boundary missing");
must(reads.includes("r.status='SCHEDULED' AND r.approved_at IS NOT NULL"), "due scheduled rate read support missing");
must(reads.includes("calculateLiveAccrued"), "multi-rate live accrued calculator missing");
must(reads.includes("status IN ('ACTIVE','ENDED')"), "historical rate segments missing from live accrued read");
must(reads.includes("total = addAmount(total, profit)"), "live accrued segments are not summed");

must(!controller.includes("trial-config"), "PHASE11 trial admin leaked into PHASE05");
must(!controller.includes("high-value"), "PHASE17 high-value admin leaked into PHASE05");

console.log("PHASE05_ADMIN_API_ASSERTIONS_PASS");
