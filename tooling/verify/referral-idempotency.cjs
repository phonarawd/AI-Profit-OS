/**
 * verify:referral-idempotency — Money §51.5 RE1
 * idempotency keys referral:{edgeId}:{level} · UNIQUE payout · silent reuse
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
  "services/api-nest/src/referral/referral.pool.service.ts",
  "services/api-nest/src/referral/referral.ladder.service.ts",
  "schemas/referral-edge.v1.json",
  "supabase/migrations/20260809010858_referral_pool_fifo_clawback.sql",
];
for (const f of files) mustExist(f);

const bonus = read("services/api-nest/src/referral/referral.bonus.ts");
if (!bonus.includes("`referral:${edgeId}:${level}`")) {
  fails.push("idempotencyKeyFor must use referral:{edgeId}:{level}");
}

const pool = read("services/api-nest/src/referral/referral.pool.service.ts");
for (const needle of [
  "idempotency_key",
  "reused: true",
  "idempotencyKey",
]) {
  if (!pool.includes(needle)) {
    fails.push(`pool.service missing: ${needle}`);
  }
}

const ladder = read("services/api-nest/src/referral/referral.ladder.service.ts");
if (!ladder.includes('idempotencyKeyFor(edge.id, "L2")')) {
  fails.push("ladder L2 must use idempotencyKeyFor");
}
if (!ladder.includes('idempotencyKeyFor(edge.id, "L3")')) {
  fails.push("ladder L3 must use idempotencyKeyFor");
}
if (!ladder.includes("already_l2")) {
  fails.push("ladder must skip duplicate L2");
}

const mig = read(
  "supabase/migrations/20260809010858_referral_pool_fifo_clawback.sql",
);
if (!mig.includes("referral_payout_idem_uq")) {
  fails.push("payout queue must UNIQUE(idempotency_key)");
}

const edgeSchema = JSON.parse(read("schemas/referral-edge.v1.json"));
if (!edgeSchema.required?.includes("idempotencyKeys")) {
  fails.push("referral-edge must require idempotencyKeys");
}

if (fails.length) {
  console.error("[verify:referral-idempotency] FAIL");
  for (const f of fails) console.error(" -", f);
  process.exit(1);
}
console.log("[verify:referral-idempotency] PASS");
