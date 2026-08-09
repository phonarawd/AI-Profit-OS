/**
 * Engine §0.0.7 — user membership ladder · daily cap · strictness overlay · fulfillRate display-only
 * FORBIDDEN: membership ⇒ MATCH_SUCCESS 100% · fulfillRate as Rule input · Soft/Hard by grade · auto demote
 * CI: verify:membership-ladder · verify:membership-daily-cap · verify:no-fulfill-rate-as-rule
 */

"use strict";

const { cmpAmount, assertAmount } = require("./money.cjs");
const { capitalBandAtMost, isCapitalBand } = require("./capital-band.cjs");
const {
  applyMatchStrictness,
  expandMatchStrictness,
  isMatchStrictness,
  toRulePolicy,
} = require("./match-strictness.cjs");

const MEMBERSHIP_ENUM = Object.freeze([
  "sprout",
  "entry",
  "core",
  "high",
  "vip",
]);

const MEMBERSHIP_RANK = Object.freeze({
  sprout: 0,
  entry: 1,
  core: 2,
  high: 3,
  vip: 4,
});

/** ko label SSOT for Admin badge (user copy Owns=UI) */
const MEMBERSHIP_LABEL_KO = Object.freeze({
  sprout: "새싹",
  entry: "입문",
  core: "본격",
  high: "고액",
  vip: "VIP",
});

/**
 * Day-1 ladder (오차0 · Engine §0.0.7 table)
 * depositMinUsdt inclusive · successMin nullable (— = no success path)
 * @type {Readonly<Record<string, {
 *   depositMinUsdt: string,
 *   successMin: number|null,
 *   maxCapitalBand: string,
 *   dailyUserMatchCap: number,
 *   matchStrictness: 'lenient'|'standard'|'tight'|'scarce',
 *   aiPerkFlags: ReadonlyArray<string>,
 *   labelKo: string,
 * }>>}
 */
const MEMBERSHIP_LADDER = Object.freeze({
  sprout: Object.freeze({
    depositMinUsdt: "0",
    successMin: null,
    maxCapitalBand: "micro",
    dailyUserMatchCap: 8,
    matchStrictness: "lenient",
    aiPerkFlags: Object.freeze([
      "basic_feed",
      "safe_stop",
      "fact_basic",
    ]),
    labelKo: MEMBERSHIP_LABEL_KO.sprout,
  }),
  entry: Object.freeze({
    depositMinUsdt: "100",
    successMin: 2,
    maxCapitalBand: "small",
    dailyUserMatchCap: 6,
    matchStrictness: "lenient",
    aiPerkFlags: Object.freeze([
      "basic_feed",
      "safe_stop",
      "fact_basic",
      "near_miss_boost",
    ]),
    labelKo: MEMBERSHIP_LABEL_KO.entry,
  }),
  core: Object.freeze({
    depositMinUsdt: "1000",
    successMin: 5,
    maxCapitalBand: "mid",
    dailyUserMatchCap: 5,
    matchStrictness: "standard",
    aiPerkFlags: Object.freeze([
      "basic_feed",
      "safe_stop",
      "fact_basic",
      "near_miss_boost",
      "ai_pick_boost",
      "membership_band_align",
    ]),
    labelKo: MEMBERSHIP_LABEL_KO.core,
  }),
  high: Object.freeze({
    depositMinUsdt: "10000",
    successMin: null,
    maxCapitalBand: "high",
    dailyUserMatchCap: 3,
    matchStrictness: "tight",
    aiPerkFlags: Object.freeze([
      "basic_feed",
      "safe_stop",
      "fact_basic",
      "near_miss_boost",
      "ai_pick_boost",
      "membership_band_align",
      "high_room",
      "slot_priority",
      "stale_precision",
    ]),
    labelKo: MEMBERSHIP_LABEL_KO.high,
  }),
  vip: Object.freeze({
    depositMinUsdt: "100000",
    successMin: null,
    maxCapitalBand: "whale",
    dailyUserMatchCap: 2,
    matchStrictness: "lenient",
    aiPerkFlags: Object.freeze([
      "basic_feed",
      "safe_stop",
      "fact_basic",
      "near_miss_boost",
      "ai_pick_boost",
      "membership_band_align",
      "high_room",
      "slot_priority",
      "stale_precision",
      "whale_ultra_priority",
      "vip_desk_deeplink",
      "effective_strictness_lenient",
      "daily_cap_min",
    ]),
    labelKo: MEMBERSHIP_LABEL_KO.vip,
  }),
});

/**
 * membership × capitalBand → matchStrictness overlay (Day-1)
 * Uniform per membership (band gates via maxCapitalBand; Soft/Hard membershipUniform).
 * @type {Readonly<Record<string, Readonly<Record<string, 'lenient'|'standard'|'tight'|'scarce'>>>>}
 */
const MEMBERSHIP_BAND_OVERLAY = Object.freeze({
  sprout: Object.freeze({
    micro: "lenient",
    small: "lenient",
    mid: "lenient",
    high: "lenient",
    whale: "lenient",
  }),
  entry: Object.freeze({
    micro: "lenient",
    small: "lenient",
    mid: "lenient",
    high: "lenient",
    whale: "lenient",
  }),
  core: Object.freeze({
    micro: "standard",
    small: "standard",
    mid: "standard",
    high: "standard",
    whale: "standard",
  }),
  high: Object.freeze({
    micro: "tight",
    small: "tight",
    mid: "tight",
    high: "tight",
    whale: "tight",
  }),
  vip: Object.freeze({
    micro: "lenient",
    small: "lenient",
    mid: "lenient",
    high: "lenient",
    whale: "lenient",
  }),
});

/** Canonical snapshot for CI (sorted keys) */
const MEMBERSHIP_LADDER_SNAPSHOT =
  '{"core":{"dailyUserMatchCap":5,"depositMinUsdt":"1000","matchStrictness":"standard","maxCapitalBand":"mid","successMin":5},"entry":{"dailyUserMatchCap":6,"depositMinUsdt":"100","matchStrictness":"lenient","maxCapitalBand":"small","successMin":2},"high":{"dailyUserMatchCap":3,"depositMinUsdt":"10000","matchStrictness":"tight","maxCapitalBand":"high","successMin":null},"sprout":{"dailyUserMatchCap":8,"depositMinUsdt":"0","matchStrictness":"lenient","maxCapitalBand":"micro","successMin":null},"vip":{"dailyUserMatchCap":2,"depositMinUsdt":"100000","matchStrictness":"lenient","maxCapitalBand":"whale","successMin":null}}';

const MEMBERSHIP_BAND_OVERLAY_SNAPSHOT =
  '{"core":{"high":"standard","micro":"standard","mid":"standard","small":"standard","whale":"standard"},"entry":{"high":"lenient","micro":"lenient","mid":"lenient","small":"lenient","whale":"lenient"},"high":{"high":"tight","micro":"tight","mid":"tight","small":"tight","whale":"tight"},"sprout":{"high":"lenient","micro":"lenient","mid":"lenient","small":"lenient","whale":"lenient"},"vip":{"high":"lenient","micro":"lenient","mid":"lenient","small":"lenient","whale":"lenient"}}';

function isMembership(v) {
  return MEMBERSHIP_ENUM.includes(v);
}

function membershipLabelKo(membership) {
  if (!isMembership(membership)) {
    throw new Error(`unknown membership: ${membership}`);
  }
  return MEMBERSHIP_LABEL_KO[membership];
}

function membershipDefaults(membership) {
  if (!isMembership(membership)) {
    throw new Error(`unknown membership: ${membership}`);
  }
  const row = MEMBERSHIP_LADDER[membership];
  return {
    membership,
    maxCapitalBand: row.maxCapitalBand,
    dailyUserMatchCap: row.dailyUserMatchCap,
    matchStrictness: row.matchStrictness,
    aiPerkFlags: [...row.aiPerkFlags],
    labelKo: row.labelKo,
  };
}

/**
 * Deposit stage only (success OR-path handled separately).
 * @param {string} cumulativeDepositUsdt
 */
function membershipFromDeposit(cumulativeDepositUsdt) {
  const d = assertAmount(
    String(cumulativeDepositUsdt),
    "cumulativeDepositUsdt",
  );
  let best = "sprout";
  for (const id of MEMBERSHIP_ENUM) {
    const min = MEMBERSHIP_LADDER[id].depositMinUsdt;
    if (cmpAmount(d, min) >= 0) best = id;
  }
  return best;
}

/**
 * Success-count stage (entry≥2 · core≥5 · high/vip have no success path).
 * @param {number} matchSuccessCount
 */
function membershipFromSuccess(matchSuccessCount) {
  const n = Number(matchSuccessCount);
  if (!Number.isFinite(n) || n < 0 || !Number.isInteger(n)) {
    throw new Error("matchSuccessCount must be non-negative integer");
  }
  let best = "sprout";
  for (const id of MEMBERSHIP_ENUM) {
    const min = MEMBERSHIP_LADDER[id].successMin;
    if (min != null && n >= min) best = id;
  }
  return best;
}

function maxMembership(a, b) {
  if (!isMembership(a) || !isMembership(b)) {
    throw new Error("maxMembership: invalid");
  }
  return MEMBERSHIP_RANK[a] >= MEMBERSHIP_RANK[b] ? a : b;
}

/**
 * Resolve membership.
 * Auto: max(deposit, success). Admin force pins grade (raise or demote) — auto demote path 0.
 * @param {{
 *   cumulativeDepositUsdt: string,
 *   matchSuccessCount: number,
 *   adminForce?: boolean,
 *   forcedMembership?: string|null,
 * }} input
 */
function resolveMembership(input) {
  const fromDep = membershipFromDeposit(input.cumulativeDepositUsdt);
  const fromSuc = membershipFromSuccess(input.matchSuccessCount ?? 0);
  const auto = maxMembership(fromDep, fromSuc);

  if (input.adminForce === true) {
    const forced = input.forcedMembership;
    if (!isMembership(forced)) {
      throw new Error("adminForce requires valid forcedMembership");
    }
    return {
      membership: forced,
      adminForce: true,
      autoMembership: auto,
      fromDeposit: fromDep,
      fromSuccess: fromSuc,
    };
  }

  return {
    membership: auto,
    adminForce: false,
    autoMembership: auto,
    fromDeposit: fromDep,
    fromSuccess: fromSuc,
  };
}

/**
 * Build UserMembershipV1 projection fields from resolved grade + usage.
 * fulfillRate7d is display-only (never passed to evaluateMatchSuccess).
 */
function projectUserMembership(input) {
  const resolved = resolveMembership(input);
  const defaults = membershipDefaults(resolved.membership);
  const used = Number(input.dailyMatchesUsed ?? 0);
  if (!Number.isFinite(used) || used < 0 || !Number.isInteger(used)) {
    throw new Error("dailyMatchesUsed must be non-negative integer");
  }
  /** @type {Record<string, unknown>} */
  const out = {
    userId: String(input.userId ?? ""),
    membership: defaults.membership,
    maxCapitalBand: defaults.maxCapitalBand,
    dailyUserMatchCap: defaults.dailyUserMatchCap,
    matchStrictness: defaults.matchStrictness,
    adminForce: resolved.adminForce,
    aiPerkFlags: defaults.aiPerkFlags,
    dailyMatchesUsed: used,
  };
  if (input.fulfillRate7d != null) {
    const r = Number(input.fulfillRate7d);
    if (!(r >= 0 && r <= 1)) {
      throw new Error("fulfillRate7d must be in [0,1]");
    }
    out.fulfillRate7d = r;
  }
  if (input.updatedAt) out.updatedAt = String(input.updatedAt);
  return out;
}

/**
 * Overlay strictness for membership × capitalBand.
 * @param {string} membership
 * @param {string} capitalBand
 */
function membershipBandOverlayStrictness(membership, capitalBand) {
  if (!isMembership(membership)) {
    throw new Error(`unknown membership: ${membership}`);
  }
  if (!isCapitalBand(capitalBand)) {
    throw new Error(`unknown capitalBand: ${capitalBand}`);
  }
  return MEMBERSHIP_BAND_OVERLAY[membership][capitalBand];
}

function pickPolicyFields(policy) {
  return {
    matchStrictness: policy.matchStrictness,
    minProfitUsdt: String(policy.minProfitUsdt),
    staleAllowanceSec: Number(policy.staleAllowanceSec),
    maxRematchCount: Number(policy.maxRematchCount),
    slippageBoundBps: Number(policy.slippageBoundBps ?? 50),
    dailyUserMatchCap: Number(policy.dailyUserMatchCap),
    dailyOppSlotsDefault: Number(policy.dailyOppSlotsDefault ?? 12),
    retryWaitSec: Number(policy.retryWaitSec ?? 4),
  };
}

/**
 * Merge order §0.0.7:
 * 1) global execution-policy
 * 2) membership×capitalBand overlay (if enabled)
 * 3) user.matchStrictnessOverride
 * evaluateMatchSuccess sees effectivePolicy only · fulfillRate NEVER merged in.
 *
 * @param {{
 *   basePolicy: object,
 *   membership: string,
 *   capitalBand: string,
 *   membershipBandOverlayEnabled?: boolean,
 *   userOverride?: {
 *     matchStrictnessOverride?: string,
 *     minProfitUsdt?: string,
 *     staleAllowanceSec?: number,
 *     maxRematchCount?: number,
 *     dailyUserMatchCap?: number,
 *     slippageBoundBps?: number,
 *     dailyOppSlotsDefault?: number,
 *   }|null,
 * }} input
 */
function mergeEffectivePolicy(input) {
  if (input == null || typeof input !== "object") {
    throw new Error("mergeEffectivePolicy: input required");
  }
  // Guard: callers must not smuggle fulfillRate into Rule path
  if (
    input.fulfillRate7d != null ||
    input.fulfillRate != null ||
    input.basePolicy?.fulfillRate7d != null ||
    input.userOverride?.fulfillRate7d != null
  ) {
    throw new Error("FULFILL_RATE_AS_RULE_FORBIDDEN");
  }

  let policy = pickPolicyFields(input.basePolicy);

  if (input.membershipBandOverlayEnabled === true) {
    const overlayStrictness = membershipBandOverlayStrictness(
      input.membership,
      input.capitalBand,
    );
    const expanded = applyMatchStrictness({
      matchStrictness: overlayStrictness,
    });
    // Ladder owns Day-1 dailyUserMatchCap · preset map must not loosen/tighten it
    const ladderCap = MEMBERSHIP_LADDER[input.membership].dailyUserMatchCap;
    policy = {
      ...policy,
      ...expanded,
      dailyUserMatchCap: ladderCap,
      retryWaitSec: policy.retryWaitSec,
    };
  }

  const ov = input.userOverride;
  if (ov && ov.matchStrictnessOverride) {
    if (!isMatchStrictness(ov.matchStrictnessOverride)) {
      throw new Error("invalid matchStrictnessOverride");
    }
    if (ov.matchStrictnessOverride === "custom") {
      policy = {
        matchStrictness: "custom",
        minProfitUsdt:
          ov.minProfitUsdt != null
            ? String(ov.minProfitUsdt)
            : policy.minProfitUsdt,
        staleAllowanceSec:
          ov.staleAllowanceSec != null
            ? Number(ov.staleAllowanceSec)
            : policy.staleAllowanceSec,
        maxRematchCount:
          ov.maxRematchCount != null
            ? Number(ov.maxRematchCount)
            : policy.maxRematchCount,
        slippageBoundBps:
          ov.slippageBoundBps != null
            ? Number(ov.slippageBoundBps)
            : policy.slippageBoundBps,
        dailyUserMatchCap:
          ov.dailyUserMatchCap != null
            ? Number(ov.dailyUserMatchCap)
            : policy.dailyUserMatchCap,
        dailyOppSlotsDefault:
          ov.dailyOppSlotsDefault != null
            ? Number(ov.dailyOppSlotsDefault)
            : policy.dailyOppSlotsDefault,
        retryWaitSec: policy.retryWaitSec,
      };
    } else {
      const expanded = applyMatchStrictness({
        matchStrictness: ov.matchStrictnessOverride,
      });
      policy = {
        ...policy,
        ...expanded,
        retryWaitSec: policy.retryWaitSec,
      };
    }
  }

  return policy;
}

/**
 * Participate guards (§0.0.7)
 * @returns {null|{ code: string, message: string }}
 */
function checkParticipateMembershipGuards(input) {
  const band = input.opportunityCapitalBand;
  const maxBand = input.maxCapitalBand;
  if (!capitalBandAtMost(band, maxBand)) {
    return {
      code: "CAPITAL_BAND_LOCKED",
      message: "opportunity.capitalBand exceeds user.maxCapitalBand",
    };
  }
  const used = Number(input.dailyMatchesUsed);
  const cap = Number(input.dailyUserMatchCap);
  if (!Number.isFinite(used) || !Number.isFinite(cap) || used < 0 || cap < 0) {
    throw new Error("dailyMatchesUsed/dailyUserMatchCap invalid");
  }
  if (used >= cap) {
    return {
      code: "DAILY_MATCH_CAP",
      message: "dailyUserMatchCap reached",
    };
  }
  const slots = Number(input.slotsLeft);
  if (!Number.isFinite(slots) || slots <= 0) {
    return {
      code: "NO_SLOTS",
      message: "opp.slotsLeft must be > 0",
    };
  }
  return null;
}

/**
 * Display-only KPI. NEVER feed into evaluateMatchSuccess / mergeEffectivePolicy.
 * attempts = SUCCESS + PRICE_MOVED + BELOW_MIN (+ optional REQUEUE terminal)
 * @param {{
 *   matchSuccess: number,
 *   priceMoved: number,
 *   belowMinProfit: number,
 *   requeueTerminal?: number,
 * }} counts
 * @returns {number|null} ratio in [0,1] or null when attempts=0
 */
function computeFulfillRate7d(counts) {
  const success = Number(counts.matchSuccess ?? 0);
  const moved = Number(counts.priceMoved ?? 0);
  const below = Number(counts.belowMinProfit ?? 0);
  const requeue = Number(counts.requeueTerminal ?? 0);
  for (const [k, v] of [
    ["matchSuccess", success],
    ["priceMoved", moved],
    ["belowMinProfit", below],
    ["requeueTerminal", requeue],
  ]) {
    if (!Number.isFinite(v) || v < 0 || !Number.isInteger(v)) {
      throw new Error(`${k} must be non-negative integer`);
    }
  }
  const attempts = success + moved + below + requeue;
  if (attempts === 0) return null;
  return success / attempts;
}

function ladderSnapshotCanonical() {
  const keys = Object.keys(MEMBERSHIP_LADDER).sort();
  const out = {};
  for (const k of keys) {
    const row = MEMBERSHIP_LADDER[k];
    out[k] = {
      dailyUserMatchCap: row.dailyUserMatchCap,
      depositMinUsdt: row.depositMinUsdt,
      matchStrictness: row.matchStrictness,
      maxCapitalBand: row.maxCapitalBand,
      successMin: row.successMin,
    };
  }
  return JSON.stringify(out);
}

function overlaySnapshotCanonical() {
  const mKeys = Object.keys(MEMBERSHIP_BAND_OVERLAY).sort();
  const out = {};
  for (const m of mKeys) {
    const bands = MEMBERSHIP_BAND_OVERLAY[m];
    const bKeys = Object.keys(bands).sort();
    const row = {};
    for (const b of bKeys) row[b] = bands[b];
    out[m] = row;
  }
  return JSON.stringify(out);
}

function assertMembershipSnapshots() {
  const ladder = ladderSnapshotCanonical();
  if (ladder !== MEMBERSHIP_LADDER_SNAPSHOT) {
    throw new Error(
      `membership ladder snapshot drift\nwant ${MEMBERSHIP_LADDER_SNAPSHOT}\ngot  ${ladder}`,
    );
  }
  const overlay = overlaySnapshotCanonical();
  if (overlay !== MEMBERSHIP_BAND_OVERLAY_SNAPSHOT) {
    throw new Error(
      `membership overlay snapshot drift\nwant ${MEMBERSHIP_BAND_OVERLAY_SNAPSHOT}\ngot  ${overlay}`,
    );
  }
  // defaults matchStrictness must equal overlay cells for that membership
  for (const m of MEMBERSHIP_ENUM) {
    const want = MEMBERSHIP_LADDER[m].matchStrictness;
    for (const band of Object.keys(MEMBERSHIP_BAND_OVERLAY[m])) {
      if (MEMBERSHIP_BAND_OVERLAY[m][band] !== want) {
        throw new Error(
          `overlay ${m}×${band} must equal ladder matchStrictness ${want}`,
        );
      }
    }
  }
  return true;
}

/** Rule-facing slice — explicitly excludes fulfillRate */
function toRulePolicyFromEffective(effectivePolicy) {
  return toRulePolicy(effectivePolicy);
}

module.exports = {
  MEMBERSHIP_ENUM,
  MEMBERSHIP_RANK,
  MEMBERSHIP_LABEL_KO,
  MEMBERSHIP_LADDER,
  MEMBERSHIP_BAND_OVERLAY,
  MEMBERSHIP_LADDER_SNAPSHOT,
  MEMBERSHIP_BAND_OVERLAY_SNAPSHOT,
  isMembership,
  membershipLabelKo,
  membershipDefaults,
  membershipFromDeposit,
  membershipFromSuccess,
  maxMembership,
  resolveMembership,
  projectUserMembership,
  membershipBandOverlayStrictness,
  mergeEffectivePolicy,
  checkParticipateMembershipGuards,
  computeFulfillRate7d,
  ladderSnapshotCanonical,
  overlaySnapshotCanonical,
  assertMembershipSnapshots,
  toRulePolicyFromEffective,
  expandMatchStrictness,
};
