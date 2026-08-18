/**
 * verify:membership-daily-cap — Engine §0.0.7 A+B
 * dailyUserMatchCap per grade · participate guards · strictness overlay merge · user override
 */
const fs = require("fs");
const path = require("path");

const root = path.resolve(__dirname, "../..");
const fails = [];

function read(rel) {
  return fs.readFileSync(path.join(root, rel), "utf8");
}

const mem = require(path.join(
  root,
  "services/market-intelligence/src/membership.cjs",
));
const ms = require(path.join(
  root,
  "services/market-intelligence/src/match-strictness.cjs",
));
const rule = require(path.join(root, "services/engine-rust/settlement_rule.cjs"));

const wantDaily = { sprout: 8, entry: 6, core: 5, high: 3, vip: 2 };
for (const [id, cap] of Object.entries(wantDaily)) {
  if (mem.MEMBERSHIP_LADDER[id].dailyUserMatchCap !== cap) {
    fails.push(`${id} daily cap want ${cap}`);
  }
  const d = mem.membershipDefaults(id);
  if (d.dailyUserMatchCap !== cap) {
    fails.push(`defaults ${id} daily cap want ${cap}`);
  }
}

// Cap is not a success guarantee — documented via checkParticipate only
const ok = mem.checkParticipateMembershipGuards({
  opportunityCapitalBand: "micro",
  maxCapitalBand: "micro",
  dailyMatchesUsed: 0,
  dailyUserMatchCap: 8,
  slotsLeft: 1,
});
if (ok !== null) fails.push("guards should pass when under cap");

const capped = mem.checkParticipateMembershipGuards({
  opportunityCapitalBand: "micro",
  maxCapitalBand: "micro",
  dailyMatchesUsed: 8,
  dailyUserMatchCap: 8,
  slotsLeft: 1,
});
if (capped?.code !== "DAILY_MATCH_CAP") {
  fails.push("used>=cap must DAILY_MATCH_CAP");
}

const locked = mem.checkParticipateMembershipGuards({
  opportunityCapitalBand: "whale",
  maxCapitalBand: "micro",
  dailyMatchesUsed: 0,
  dailyUserMatchCap: 8,
  slotsLeft: 1,
});
if (locked?.code !== "CAPITAL_BAND_LOCKED") {
  fails.push("band > max must CAPITAL_BAND_LOCKED");
}

const noSlots = mem.checkParticipateMembershipGuards({
  opportunityCapitalBand: "micro",
  maxCapitalBand: "micro",
  dailyMatchesUsed: 0,
  dailyUserMatchCap: 8,
  slotsLeft: 0,
});
if (noSlots?.code !== "NO_SLOTS") {
  fails.push("slotsLeft 0 must NO_SLOTS");
}

// Overlay merge order
const base = {
  ...ms.applyMatchStrictness({ matchStrictness: "standard" }),
  retryWaitSec: 4,
};

const withOverlay = mem.mergeEffectivePolicy({
  basePolicy: base,
  membership: "vip",
  capitalBand: "whale",
  membershipBandOverlayEnabled: true,
});
if (withOverlay.matchStrictness !== "lenient") {
  fails.push("vip overlay must apply lenient");
}
if (withOverlay.minProfitUsdt !== "2") {
  fails.push("vip overlay minProfit must be 2");
}
if (withOverlay.dailyUserMatchCap !== 2) {
  fails.push("vip overlay must keep ladder dailyUserMatchCap=2 (not lenient preset 8)");
}

const withUser = mem.mergeEffectivePolicy({
  basePolicy: base,
  membership: "vip",
  capitalBand: "whale",
  membershipBandOverlayEnabled: true,
  userOverride: { matchStrictnessOverride: "tight" },
});
if (withUser.matchStrictness !== "tight" || withUser.minProfitUsdt !== "8") {
  fails.push("user override must win after overlay");
}

const custom = mem.mergeEffectivePolicy({
  basePolicy: base,
  membership: "core",
  capitalBand: "mid",
  membershipBandOverlayEnabled: false,
  userOverride: {
    matchStrictnessOverride: "custom",
    minProfitUsdt: "7",
    staleAllowanceSec: 4,
    maxRematchCount: 1,
    dailyUserMatchCap: 4,
  },
});
if (custom.matchStrictness !== "custom" || custom.minProfitUsdt !== "7") {
  fails.push("custom user override fields must stick");
}
if (custom.dailyUserMatchCap !== 4) {
  fails.push("custom dailyUserMatchCap want 4");
}

// Overlay disabled → keep base
const noOverlay = mem.mergeEffectivePolicy({
  basePolicy: base,
  membership: "vip",
  capitalBand: "whale",
  membershipBandOverlayEnabled: false,
});
if (noOverlay.matchStrictness !== "standard" || noOverlay.minProfitUsdt !== "5") {
  fails.push("overlay disabled must keep global standard");
}

// effective → Rule (no RNG)
const rulePol = mem.toRulePolicyFromEffective(withUser);
const ctx = {
  nowMs: 1_000_000,
  participateAcceptedAtMs: 1_000_000,
  circuitStatus: "closed",
  userStatus: "active",
  opportunityStatus: "available",
  compareReady: true,
  staleAtMs: 999_000,
  tradePricingVersion: 1,
  opportunityPricingVersion: 1,
  simulationPayoutFeasible: true,
  listingLegsFresh: true,
  rematchCount: 0,
  presentationDurationSec: 12,
  expectedProfitUsdt: "6",
  policy: rulePol,
};
if (rule.evaluateMatchSuccess(ctx) !== "BELOW_MIN_PROFIT") {
  fails.push("tight effective + profit6 must BELOW_MIN_PROFIT");
}

// Nest match-policy route
const routes = read("services/api-nest/src/membership/membership.routes.ts");
if (!routes.includes("match-policy-override")) {
  fails.push("routes must expose match-policy-override");
}
const mig = read(
  "supabase/migrations/20260809101114_user_membership_match_policy.sql",
);
for (const col of [
  "min_profit_usdt",
  "stale_allowance_sec",
  "max_rematch_count",
  "daily_user_match_cap",
]) {
  if (!mig.includes(col)) fails.push(`migration missing ${col}`);
}
if (!mig.includes("user_match_policy_override_audit")) {
  fails.push("migration must create match policy audit");
}

const page = read("apps/admin/app/admin/users/[id]/page.tsx");
for (const needle of [
  'data-field="matchStrictnessOverride"',
  'data-preview="effectivePolicy"',
  'data-forbid="successRatePercent"',
  "이 유저 매칭 조절",
]) {
  if (!page.includes(needle)) fails.push(`admin page missing: ${needle}`);
}

const schema = JSON.parse(read("schemas/user-match-policy-override.v1.json"));
if (!schema.properties?.matchStrictnessOverride) {
  fails.push("user-match-policy-override schema missing matchStrictnessOverride");
}
if (!schema.not) {
  fails.push("override schema must forbid successRatePercent via not");
}

if (fails.length) {
  console.error("[verify:membership-daily-cap] FAIL\n- " + fails.join("\n- "));
  process.exit(1);
}
console.log("[verify:membership-daily-cap] PASS");
