/**
 * verify:referral-pool-fifo — Money §51.5
 * Pool FIFO · queued_pool · top-up drain · RE7 invite≠fail
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
  "services/api-nest/src/referral/referral.pool.service.ts",
  "services/api-nest/src/referral/referral.ladder.service.ts",
  "supabase/migrations/20260809010858_referral_pool_fifo_clawback.sql",
  "schemas/referral-edge.v1.json",
  "schemas/toast-codes.v1.json",
];
for (const f of files) mustExist(f);

const pool = read("services/api-nest/src/referral/referral.pool.service.ts");
for (const needle of [
  "drainFifo",
  "queued_pool",
  "enqueued_at ASC",
  "SYS:PROMO_POOL",
  "PROMO_POOL",
  "referral_reward",
  'bucket: "profit"',
  "direction: \"debit\"",
  "direction: \"credit\"",
  "REFERRAL_POOL_WAIT",
  "topUp",
]) {
  if (!pool.includes(needle)) {
    fails.push(`referral.pool.service missing: ${needle}`);
  }
}
if (pool.includes('bucket: "principal"')) {
  fails.push("pool payout must NEVER credit principal");
}

const ladder = read("services/api-nest/src/referral/referral.ladder.service.ts");
for (const needle of [
  "onQualifyingDeposit",
  "queued_pool",
  "canAccrueCash",
  "rewardsEnabled",
]) {
  if (!ladder.includes(needle)) {
    fails.push(`referral.ladder.service missing: ${needle}`);
  }
}

const mig = read(
  "supabase/migrations/20260809010858_referral_pool_fifo_clawback.sql",
);
for (const needle of [
  "referral_payout_queue",
  "queued_pool",
  "enqueued_at",
  "referral_payout_fifo_idx",
  "accrual_halted",
]) {
  if (!mig.includes(needle)) {
    fails.push(`migration missing: ${needle}`);
  }
}

const edgeSchema = JSON.parse(read("schemas/referral-edge.v1.json"));
const statuses = edgeSchema.properties?.status?.enum ?? [];
if (!statuses.includes("queued_pool")) {
  fails.push("referral-edge status must include queued_pool");
}

const toast = read("schemas/toast-codes.v1.json");
if (!toast.includes("REFERRAL_POOL_WAIT")) {
  fails.push("toast-codes must include REFERRAL_POOL_WAIT");
}
if (!toast.includes("초대는 유지")) {
  fails.push("REFERRAL_POOL_WAIT must say invite is kept (RE7)");
}

const invite = read("packages/ui/copy/ko/invite.ts");
if (!invite.includes("초대 실패 아님")) {
  fails.push("invite.poolWaitNote must clarify not invite failure");
}

if (fails.length) {
  console.error("[verify:referral-pool-fifo] FAIL");
  for (const f of fails) console.error(" -", f);
  process.exit(1);
}
console.log("[verify:referral-pool-fifo] PASS");
