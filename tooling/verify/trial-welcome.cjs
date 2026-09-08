/**
 * verify:trial-welcome — PUTDUK desk trial capital
 * practice auto-welcome off · trial grant once · FX fail-closed · profit USDT withdraw only
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
  "supabase/migrations/20260909060000_trial_welcome_grant.sql",
  "services/api-nest/src/ledger/trial-grant.service.ts",
  "services/api-nest/src/ledger/trial-funding.service.ts",
  "services/api-nest/src/ledger/trial-fx.ts",
  "services/api-nest/src/referral/referral-slot.service.ts",
];
for (const f of files) mustExist(f);

const mig = read("supabase/migrations/20260909060000_trial_welcome_grant.sql");
for (const needle of [
  "trial_principal",
  "trial_locked",
  "trial_grant",
  "trial_grants",
  "trial_user_state",
  "trial_eligible",
  "referral_slot_grants",
  "failed_fx",
]) {
  if (!mig.includes(needle)) fails.push(`migration missing ${needle}`);
}

const grant = read("services/api-nest/src/ledger/trial-grant.service.ts");
if (!grant.includes("TRIAL_GRANT_KEY_WELCOME")) {
  fails.push("trial-grant missing TRIAL_GRANT_KEY_WELCOME");
}
if (!grant.includes("failed_fx")) {
  fails.push("trial-grant must record failed_fx without inventing FX");
}
if (!grant.includes('journalType: "trial_grant"')) {
  fails.push("trial-grant must post trial_grant journal");
}

const auth = read("services/api-nest/src/auth/auth.service.ts");
if (auth.includes("await this.practiceGrant.grantWelcome(userId)")) {
  fails.push("signup must not auto-call practiceGrant.grantWelcome");
}
if (!auth.includes("trialGrant.grantWelcome")) {
  fails.push("signup must call trialGrant.grantWelcome");
}

const funding = read("services/api-nest/src/ledger/trial-funding.service.ts");
if (!funding.includes('source: "trial"')) {
  fails.push("trial-funding must decide trial vs own_principal");
}

const withdraw = read("services/api-nest/src/wallet/withdraw-intent.service.ts");
if (!withdraw.includes("WITHDRAW_PROFIT_USDT_ONLY")) {
  fails.push("withdraw must reject non profit+USDT at launch");
}

const types = read("services/api-nest/src/ledger/ledger.types.ts");
if (!types.includes("trial_principal") || !types.includes("trial_grant")) {
  fails.push("ledger.types must include trial bucket and journal");
}

const posting = read("services/api-nest/src/ledger/ledger.posting.service.ts");
if (!posting.includes("TRIAL_PRINCIPAL_NOT_WITHDRAWABLE")) {
  fails.push("posting must block trial buckets on withdraw journals");
}

if (fails.length) {
  console.error("verify:trial-welcome FAIL");
  for (const f of fails) console.error(" -", f);
  process.exit(1);
}
console.log("verify:trial-welcome PASS");
