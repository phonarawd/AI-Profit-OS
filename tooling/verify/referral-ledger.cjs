/**
 * verify:referral-ledger — Money §51.5
 * Promo→profit · clawback reverse · practice isolation · journal types
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
  "services/api-nest/src/referral/referral.clawback.service.ts",
  "services/api-nest/src/ledger/ledger.types.ts",
  "schemas/ledger-journal.v1.json",
  "schemas/toast-codes.v1.json",
];
for (const f of files) mustExist(f);

const ledgerTypes = read("services/api-nest/src/ledger/ledger.types.ts");
for (const needle of [
  '"referral_reward"',
  '"referral_clawback"',
  "PROMO_POOL",
  '"promo_pool"',
]) {
  if (!ledgerTypes.includes(needle)) {
    fails.push(`ledger.types missing: ${needle}`);
  }
}
if (!ledgerTypes.includes("PRACTICE_FORBIDDEN_JOURNAL_TYPES")) {
  fails.push("ledger.types must define PRACTICE_FORBIDDEN_JOURNAL_TYPES");
}
if (
  !ledgerTypes.includes('referral_reward') ||
  !/PRACTICE_FORBIDDEN_JOURNAL_TYPES[\s\S]*referral_reward/.test(ledgerTypes)
) {
  fails.push("referral_reward must be practice-forbidden");
}

const journalSchema = read("schemas/ledger-journal.v1.json");
if (!journalSchema.includes("referral_reward")) {
  fails.push("ledger-journal schema missing referral_reward");
}
if (!journalSchema.includes("referral_clawback")) {
  fails.push("ledger-journal schema missing referral_clawback");
}

const pool = read("services/api-nest/src/referral/referral.pool.service.ts");
if (!pool.includes('journalType: "referral_reward"')) {
  fails.push("pool must post referral_reward journals");
}
if (!pool.includes("PROMO_POOL")) {
  fails.push("pool must debit PROMO_POOL");
}
if (pool.includes('bucket: "practice"') && pool.includes("referral_reward")) {
  fails.push("referral_reward must not credit practice");
}

const claw = read("services/api-nest/src/referral/referral.clawback.service.ts");
for (const needle of [
  'journalType: "referral_clawback"',
  "REFERRAL_EVENTS.clawback",
  "referral.clawback",
  "PROMO_POOL",
  'bucket: "profit"',
]) {
  if (!claw.includes(needle)) {
    fails.push(`clawback.service missing: ${needle}`);
  }
}
if (claw.includes('bucket: "principal"')) {
  fails.push("clawback must not touch principal as reward path");
}

const toast = read("schemas/toast-codes.v1.json");
for (const code of [
  "REFERRAL_BOUND",
  "REFERRAL_L2_PENDING",
  "REFERRAL_L2_RELEASED",
  "REFERRAL_CLAWBACK",
  "REFERRAL_POOL_WAIT",
]) {
  if (!toast.includes(`"${code}"`)) {
    fails.push(`toast-codes missing ${code}`);
  }
}

if (fails.length) {
  console.error("[verify:referral-ledger] FAIL");
  for (const f of fails) console.error(" -", f);
  process.exit(1);
}
console.log("[verify:referral-ledger] PASS");
