/**
 * verify:referral-ladder — Money §51.5.1
 * L1=0 referrer · L2 deposit · L3 MATCH_SUCCESS · formulas · 0원 rewardsEnabled
 */
const fs = require("fs");
const path = require("path");

const root = path.resolve(__dirname, "../..");
const fails = [];

function mustExist(rel) {
  if (!fs.existsSync(path.join(root, rel))) fails.push(`missing: ${rel}`);
}

function read(rel) {
  return fs.readFileSync(path.join(root, rel), "utf8");
}

const files = [
  "services/api-nest/src/referral/referral.bonus.ts",
  "services/api-nest/src/referral/referral.ladder.service.ts",
  "services/api-nest/src/referral/referral.hooks.ts",
  "services/api-nest/src/referral/referral.types.ts",
  "schemas/referral-program.v1.json",
  "schemas/referral-edge.v1.json",
  "schemas/referral-season.v1.json",
];
for (const f of files) mustExist(f);

const hooks = read("services/api-nest/src/referral/referral.hooks.ts");
for (const needle of [
  "depositConfirmed",
  "krwDepositApproved",
  "onQualifyingDeposit",
  "usdt_deposit_confirmed",
  "krw_admin_approve",
]) {
  if (!hooks.includes(needle)) {
    fails.push(`referral.hooks missing: ${needle}`);
  }
}

const bonus = read("services/api-nest/src/referral/referral.bonus.ts");
for (const needle of [
  "computeL2ReferrerPay",
  "computeL3ReferrerPay",
  "ceilToCent",
  "l2ReferrerHardCapUsdt",
  "l2ReferrerPct",
  "idempotencyKeyFor",
]) {
  if (!bonus.includes(needle)) {
    fails.push(`referral.bonus missing: ${needle}`);
  }
}

const ladder = read("services/api-nest/src/referral/referral.ladder.service.ts");
for (const needle of [
  "onQualifyingDeposit",
  "onMatchSuccess",
  "l2_pending_hold",
  "minRefereeDeposit",
  "clawbackHoursL2",
  "rewardsSkipped",
  "usdt_deposit_confirmed",
  "krw_admin_approve",
]) {
  if (!ladder.includes(needle)) {
    fails.push(`referral.ladder missing: ${needle}`);
  }
}

const types = read("services/api-nest/src/referral/referral.types.ts");
const defaults = [
  'rewardsEnabled: false',
  'l2ReferrerPct: "0.05"',
  'l2ReferrerHardCapUsdt: "3"',
  'l3ReferrerHardCapUsdt: "1"',
  "clawbackHoursL2: 72",
  'minRefereeDepositUsdt: "20"',
  "sharePerUserPerDay: 30",
];
for (const d of defaults) {
  if (!types.includes(d)) {
    fails.push(`DAY1 defaults missing: ${d}`);
  }
}

const edgeSchema = JSON.parse(read("schemas/referral-edge.v1.json"));
const statuses = edgeSchema.properties?.status?.enum ?? [];
for (const s of [
  "bound",
  "l1_done",
  "l2_pending_hold",
  "l2_released",
  "l3_done",
  "held_risk",
  "clawed_back",
  "queued_pool",
]) {
  if (!statuses.includes(s)) {
    fails.push(`edge status missing: ${s}`);
  }
}

const edgeSvc = read("services/api-nest/src/referral/referral.edge.service.ts");
if (!edgeSvc.includes("l1_done")) {
  fails.push("bind must set l1_done");
}
if (!edgeSvc.includes("L1 referrer cash = 0") && !edgeSvc.includes("L1 referrer")) {
  fails.push("edge bind must document L1 referrer cash = 0");
}

if (fails.length) {
  console.error("[verify:referral-ladder] FAIL");
  for (const f of fails) console.error(" -", f);
  process.exit(1);
}
console.log("[verify:referral-ladder] PASS");
