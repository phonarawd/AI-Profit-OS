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
  "services/api-nest/src/ledger/trial-state.service.ts",
  "services/api-nest/src/ledger/trial-state.user.controller.ts",
  "services/api-nest/src/opportunities/trial-eligible.admin.service.ts",
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

const trialState = read("services/api-nest/src/ledger/trial-state.service.ts");
if (!trialState.includes("grantWelcome")) {
  fails.push("trial-state must retry grantWelcome without inventing FX");
}
if (!trialState.includes("trialPrincipalWithdrawable: false")) {
  fails.push("trial-state must lock trial principal as non-withdrawable");
}
if (!trialState.includes("compareReady") || !trialState.includes("stale_at > now()")) {
  fails.push("trial-state ids must be participable (compareReady + not stale)");
}

const userFeed = read(
  "services/api-nest/src/opportunities/opportunities.user.service.ts",
);
if (!userFeed.includes("trialGrant.grantWelcome")) {
  fails.push("user feed must grant welcome so first entry sees trial SKU");
}
if (!userFeed.includes("allowsTrial")) {
  fails.push("user feed must classify trial SKU against trial principal");
}
if (!userFeed.includes("trial_eligible")) {
  fails.push("user feed SQL must load trial_eligible");
}
if (!/trialFeed\.items,\s*\.\.\.ownFeed\.items/.test(userFeed.replace(/\s+/g, ""))) {
  fails.push("user feed must pin trial-affordable cards before own-principal cards");
}

const trialCtrl = read(
  "services/api-nest/src/ledger/trial-state.user.controller.ts",
);
if (!trialCtrl.includes("me/trial-state") && !trialCtrl.includes("TRIAL_STATE_USER_ROUTES")) {
  fails.push("trial-state controller must expose GET /me/trial-state");
}
if (!trialCtrl.includes("JwtAuthGuard")) {
  fails.push("trial-state must use JwtAuthGuard");
}
if (trialCtrl.includes("@Query(\"userId\")") || trialCtrl.includes("body.userId")) {
  fails.push("trial-state must not trust query/body userId");
}

const adminTrial = read(
  "services/api-nest/src/opportunities/trial-eligible.admin.service.ts",
);
if (!adminTrial.includes("trial_eligible")) {
  fails.push("admin must be able to set opportunities.trial_eligible");
}

if (fails.length) {
  console.error("verify:trial-welcome FAIL");
  for (const f of fails) console.error(" -", f);
  process.exit(1);
}
console.log("verify:trial-welcome PASS");
