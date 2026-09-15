/**
 * BACKEND-ONLY PORT of tooling/verify/membership-daily-cap.cjs (recovery base SHA 86f15964).
 * UI assertions (customer web / admin UI / shared UI package / client SDK) were recorded in
 * quality/putduk-web-ui-assertions-handoff.md and removed here; only backend
 * (services / schemas / supabase / workers / infra / governance) assertions remain.
 */
﻿/**
 * verify:membership-daily-cap — Engine §0.0.7 A+B
 * dailyUserMatchCap per grade · participate guards · strictness overlay merge · user override
 */
const fs = require("fs");
const path = require("path");

const root = path.resolve(__dirname, "../../../..");
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

const observedLadder = { sprout: 8, entry: 6, core: 5, high: 3, vip: 2 };
const wantDefaults = { sprout: 5, entry: 6, core: 5, high: 3, vip: 2 };
for (const [id, cap] of Object.entries(observedLadder)) {
  if (mem.MEMBERSHIP_LADDER[id].dailyUserMatchCap !== cap) {
    fails.push(`${id} observed ladder daily cap want ${cap}`);
  }
}
for (const [id, cap] of Object.entries(wantDefaults)) {
  const d = mem.membershipDefaults(id);
  if (d.dailyUserMatchCap !== cap) {
    fails.push(`defaults ${id} daily cap want ${cap}`);
  }
}
if (mem.NEW_SIGNUP_DAILY_MATCH_CAP !== 5) {
  fails.push("NEW_SIGNUP_DAILY_MATCH_CAP want 5");
}
if (mem.QUOTA_DAY_TIMEZONE !== "Asia/Seoul") {
  fails.push("quota day timezone must stay Asia/Seoul");
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
  fails.push("vip overlay must keep grade dailyUserMatchCap=2 (not lenient preset 8)");
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

// B1 — 0 is explicit block, not falsy fallback
const zeroCap = mem.checkParticipateMembershipGuards({
  opportunityCapitalBand: "micro",
  maxCapitalBand: "micro",
  dailyMatchesUsed: 0,
  dailyUserMatchCap: 0,
  slotsLeft: 1,
});
if (zeroCap?.code !== "DAILY_MATCH_CAP") {
  fails.push("cap 0 used 0 must DAILY_MATCH_CAP");
}
if (typeof mem.readExplicitNonNegativeInt !== "function") {
  fails.push("readExplicitNonNegativeInt export missing");
}
if (mem.readExplicitNonNegativeInt(0) !== 0) {
  fails.push("readExplicitNonNegativeInt(0) must be 0");
}
const resolvedZero = mem.resolveMemberDailyMatchCap({
  overrideDailyUserMatchCap: 0,
  membershipRowCap: 8,
  ladderCap: 8,
});
if (resolvedZero.cap !== 0 || resolvedZero.source !== "user_override") {
  fails.push("resolveMemberDailyMatchCap must keep override 0");
}
const quotaZero = mem.projectDailyMatchQuota({
  userId: "u1",
  used: 0,
  overrideDailyUserMatchCap: 0,
  membershipRowCap: 8,
});
if (
  quotaZero.remaining !== 0 ||
  quotaZero.blocked !== true ||
  quotaZero.cap !== 0
) {
  fails.push("projectDailyMatchQuota cap 0 must block with remaining 0");
}
const presetCapOnly = mem.mergeEffectivePolicy({
  basePolicy: base,
  membership: "core",
  capitalBand: "mid",
  membershipBandOverlayEnabled: false,
  userOverride: {
    matchStrictnessOverride: "standard",
    dailyUserMatchCap: 0,
  },
});
if (presetCapOnly.dailyUserMatchCap !== 0) {
  fails.push("preset override dailyUserMatchCap 0 must stick");
}
if (presetCapOnly.minProfitUsdt !== base.minProfitUsdt) {
  fails.push("cap-only must not change minProfitUsdt");
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
const participate = read("services/api-nest/src/opportunities/participate.service.ts");
if (!participate.includes("effectiveDailyMatchesUsed")) {
  fails.push("participate must use effectiveDailyMatchesUsed (KST day reset)");
}
if (!participate.includes("ensureRow")) {
  fails.push("participate must ensure user_membership before daily cap");
}
if (!participate.includes("resolveMemberDailyMatchCap")) {
  fails.push("participate must resolveMemberDailyMatchCap (keep 0)");
}
if (participate.includes("operator-control.store.cjs")) {
  fails.push("participate must not read memory operator-control.store");
}
if (!participate.includes("operator-control.provider.cjs")) {
  fails.push("participate must use operator-control.provider (runtime persist)");
}
if (/Number\(effective\.dailyUserMatchCap\)\s*\|\|/.test(participate)) {
  fails.push("participate must not Number(effective.dailyUserMatchCap)|| fallback");
}
if (!routes.includes("daily-match-cap")) {
  fails.push("routes must expose daily-match-cap");
}
if (!routes.includes("grade-daily-caps")) {
  fails.push("routes must expose grade-daily-caps");
}
if (!routes.includes("bonus-grants")) {
  fails.push("routes must expose bonus-grants");
}
const runtime = read("services/api-nest/src/membership/membership.runtime.service.ts");
if (!runtime.includes("Asia/Seoul")) {
  fails.push("daily reset must use Asia/Seoul");
}
if (!runtime.includes("date_trunc('day'")) {
  fails.push("daily reset must key off KST day (date_trunc)");
}
if (!runtime.includes("participate_requests")) {
  fails.push("daily used SoT must be today's participate_requests (no new column)");
}
if (!runtime.includes("daily_matches_used = 0")) {
  fails.push("runtime must reset daily_matches_used on a new KST day");
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
