import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const read = (relative) =>
  fs.readFileSync(path.join(root, relative), "utf8");
const must = (condition, message) => {
  if (!condition) throw new Error(`PHASE04_ASSERTION_FAILED: ${message}`);
};

const main = read("services/api-nest/src/main.ts");
const controller = read("services/api-nest/src/mining/mining.controller.ts");
const moduleSource = read("services/api-nest/src/mining/mining.module.ts");
const coordinator = read(
  "services/api-nest/src/mining/mining-operation-coordinator.service.ts",
);
const service = read("services/api-nest/src/mining/mining.service.ts");
const reads = read("services/api-nest/src/mining/mining-read.service.ts");
const internal = read(
  "services/api-nest/src/mining/mining.internal.controller.ts",
);
const env = read("services/api-nest/src/config/phase0.env.ts");
const contract = JSON.parse(
  read("contracts/mining/mining-contract.v1.json"),
);

must(main.includes('app.setGlobalPrefix("api/v1")'), "global API prefix drift");
must(!controller.includes("api/v1/"), "controller duplicates global API prefix");
must(!fs.existsSync(path.join(root, "services/api-nest/src/mining/mining.routes.ts")), "stale mining route map exists");

const expectedUserPaths = {
  listMines: "/api/v1/mines",
  getMine: "/api/v1/mines/:mineId",
  getMyMiningSummary: "/api/v1/mining/me/summary",
  listMyPositions: "/api/v1/mining/me/positions",
  getMyPosition: "/api/v1/mining/me/positions/:positionId",
  startPosition: "/api/v1/mining/positions/start",
  increasePosition: "/api/v1/mining/positions/:positionId/increase",
  decreasePosition: "/api/v1/mining/positions/:positionId/decrease",
  endPosition: "/api/v1/mining/positions/:positionId/end",
  listMySettlements: "/api/v1/mining/me/settlements",
};
for (const [name, expectedPath] of Object.entries(expectedUserPaths)) {
  must(contract.userApi?.[name]?.path === expectedPath, `${name} contract path drift`);
}

for (const routeFragment of [
  '@Controller("mines")',
  '@Controller("mining")',
  '@Get("me/summary")',
  '@Get("me/positions")',
  '@Get("me/positions/:positionId")',
  '@Get("me/settlements")',
  '@Post("positions/start")',
  '@Post("positions/:positionId/increase")',
  '@Post("positions/:positionId/decrease")',
  '@Post("positions/:positionId/end")',
]) {
  must(controller.includes(routeFragment), `missing route ${routeFragment}`);
}

must(controller.includes("body.principalAmount"), "principalAmount body contract missing");
must(controller.includes("body.assetCode"), "assetCode body contract missing");
must(controller.includes('Headers("idempotency-key")'), "Idempotency-Key missing");
must(!controller.includes("body.amountUsdt"), "legacy amountUsdt leaked into user API");
must(!controller.includes("body.principalUsdt"), "legacy principalUsdt leaked into user API");

must(coordinator.includes("pg_advisory_xact_lock"), "cross-instance write lock missing");
must(!coordinator.includes("mutationTails"), "process-local mutation lock present");
must(!service.includes("mutationTails"), "process-local service lock present");
must(
  service.includes('idempotencyKey: `mine:settlement:ledger:${settlement.id}`'),
  "stable settlement ledger idempotency key missing",
);
must(service.includes('status === "LEDGER_POSTED"'), "posted settlement replay guard missing");

must(moduleSource.includes("MiningInternalController"), "daily settlement controller not wired");
must(!moduleSource.includes("MiningAdminController"), "PHASE05 admin controller leaked into PHASE04");
must(internal.includes("x-internal-mining-token"), "internal settlement auth header missing");
must(env.includes("internalMiningTickToken"), "internal settlement token env missing");

for (const field of [
  "mineId",
  "positionId",
  "settlementId",
  "principalAmount",
  "assetCode",
  "currentDailyRate",
  "accruedProfitAmount",
  "baselineAt",
  "nextSettlementAt",
  "periodStartAt",
  "periodEndAt",
  "profitAmount",
  "ledgerJournalId",
]) {
  must(reads.includes(field), `contract read field missing: ${field}`);
}

console.log("PHASE04_API_ASSERTIONS_PASS");
