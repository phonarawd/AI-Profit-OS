/**
 * Engine §48.13.3 — matchStrictness → Rule policy map
 * Admin expands presets into real condition fields on save.
 * FORBIDDEN: Math.random · successRatePercent · winRate · rngSuccess
 */

"use strict";

/** Soft/Hard walls — membership-uniform · presentation ≠ SLA */
const SOFT_SEC = 60;
const HARD_SEC = 90;

const MATCH_STRICTNESS_ENUM = [
  "lenient",
  "standard",
  "tight",
  "scarce",
  "custom",
];

/**
 * Day-1 preset → policy fields (오차0 · Admin 저장 시 펼침)
 * @type {Readonly<Record<"lenient"|"standard"|"tight"|"scarce", {
 *   minProfitUsdt: string,
 *   staleAllowanceSec: number,
 *   maxRematchCount: number,
 *   slippageBoundBps: number,
 *   dailyUserMatchCap: number,
 *   dailyOppSlotsDefault: number,
 * }>>}
 */
const MATCH_STRICTNESS_PRESETS = Object.freeze({
  lenient: Object.freeze({
    minProfitUsdt: "2",
    staleAllowanceSec: 5,
    maxRematchCount: 4,
    slippageBoundBps: 80,
    dailyUserMatchCap: 8,
    dailyOppSlotsDefault: 20,
  }),
  standard: Object.freeze({
    minProfitUsdt: "5",
    staleAllowanceSec: 3,
    maxRematchCount: 2,
    slippageBoundBps: 50,
    dailyUserMatchCap: 5,
    dailyOppSlotsDefault: 12,
  }),
  tight: Object.freeze({
    minProfitUsdt: "8",
    staleAllowanceSec: 2,
    maxRematchCount: 1,
    slippageBoundBps: 30,
    dailyUserMatchCap: 3,
    dailyOppSlotsDefault: 6,
  }),
  scarce: Object.freeze({
    minProfitUsdt: "12",
    staleAllowanceSec: 1,
    maxRematchCount: 0,
    slippageBoundBps: 15,
    dailyUserMatchCap: 2,
    dailyOppSlotsDefault: 3,
  }),
});

/** Snapshot lock for verify:match-strictness (sha256 of canonical JSON) */
const MATCH_STRICTNESS_PRESET_SNAPSHOT =
  '{"lenient":{"dailyOppSlotsDefault":20,"dailyUserMatchCap":8,"maxRematchCount":4,"minProfitUsdt":"2","slippageBoundBps":80,"staleAllowanceSec":5},"scarce":{"dailyOppSlotsDefault":3,"dailyUserMatchCap":2,"maxRematchCount":0,"minProfitUsdt":"12","slippageBoundBps":15,"staleAllowanceSec":1},"standard":{"dailyOppSlotsDefault":12,"dailyUserMatchCap":5,"maxRematchCount":2,"minProfitUsdt":"5","slippageBoundBps":50,"staleAllowanceSec":3},"tight":{"dailyOppSlotsDefault":6,"dailyUserMatchCap":3,"maxRematchCount":1,"minProfitUsdt":"8","slippageBoundBps":30,"staleAllowanceSec":2}}';

const DAY1_RETRY_WAIT_SEC = 4;
const DAY1_PRESENTATION = Object.freeze({
  durationSecMin: 8,
  durationSecMax: 15,
  steps: Object.freeze([
    "product_check",
    "price_compare",
    "matching",
    "settle_prep",
    "credit",
  ]),
});
const DAY1_FEED = Object.freeze({ nearMissCapUsdt: "50" });

function isPresetStrictness(v) {
  return (
    v === "lenient" || v === "standard" || v === "tight" || v === "scarce"
  );
}

function isMatchStrictness(v) {
  return isPresetStrictness(v) || v === "custom";
}

/** Canonical snapshot string (sorted keys) for CI hash. */
function presetSnapshotCanonical() {
  const keys = Object.keys(MATCH_STRICTNESS_PRESETS).sort();
  const out = {};
  for (const k of keys) {
    const p = MATCH_STRICTNESS_PRESETS[k];
    const fieldKeys = Object.keys(p).sort();
    const row = {};
    for (const fk of fieldKeys) row[fk] = p[fk];
    out[k] = row;
  }
  return JSON.stringify(out);
}

function assertPresetSnapshot() {
  const got = presetSnapshotCanonical();
  if (got !== MATCH_STRICTNESS_PRESET_SNAPSHOT) {
    throw new Error(
      `matchStrictness preset snapshot drift\nwant ${MATCH_STRICTNESS_PRESET_SNAPSHOT}\ngot  ${got}`,
    );
  }
  return true;
}

/**
 * Expand preset into Rule input fields. custom → null (caller keeps body fields).
 * @param {string} matchStrictness
 */
function expandMatchStrictness(matchStrictness) {
  if (!isPresetStrictness(matchStrictness)) return null;
  return { ...MATCH_STRICTNESS_PRESETS[matchStrictness] };
}

/**
 * Apply preset onto a partial policy. custom leaves mapped fields as provided.
 * @param {object} input
 */
function applyMatchStrictness(input) {
  const strictness = input.matchStrictness;
  if (!isMatchStrictness(strictness)) {
    throw new Error(
      "matchStrictness must be lenient|standard|tight|scarce|custom",
    );
  }
  const expanded = expandMatchStrictness(strictness);
  if (!expanded) {
    return {
      matchStrictness: "custom",
      minProfitUsdt: String(input.minProfitUsdt ?? ""),
      staleAllowanceSec: Number(input.staleAllowanceSec),
      maxRematchCount: Number(input.maxRematchCount),
      slippageBoundBps: Number(input.slippageBoundBps),
      dailyUserMatchCap: Number(input.dailyUserMatchCap),
      dailyOppSlotsDefault: Number(input.dailyOppSlotsDefault),
    };
  }
  return {
    matchStrictness: strictness,
    ...expanded,
  };
}

/**
 * If mapped fields diverge from the named preset, coerce to custom.
 * @param {object} fields
 */
function coerceStrictnessLabel(fields) {
  const s = fields.matchStrictness;
  if (!isPresetStrictness(s)) return "custom";
  const want = MATCH_STRICTNESS_PRESETS[s];
  const same =
    String(fields.minProfitUsdt) === want.minProfitUsdt &&
    Number(fields.staleAllowanceSec) === want.staleAllowanceSec &&
    Number(fields.maxRematchCount) === want.maxRematchCount &&
    Number(fields.slippageBoundBps) === want.slippageBoundBps &&
    Number(fields.dailyUserMatchCap) === want.dailyUserMatchCap &&
    Number(fields.dailyOppSlotsDefault) === want.dailyOppSlotsDefault;
  return same ? s : "custom";
}

/** Day-1 standard policy (no admin row yet). */
function day1ExecutionPolicyDefaults(updatedByAdminId = "system:bootstrap") {
  const mapped = expandMatchStrictness("standard");
  return {
    matchStrictness: "standard",
    ...mapped,
    retryWaitSec: DAY1_RETRY_WAIT_SEC,
    autoCancelOnShortfall: true,
    membershipBandOverlayEnabled: false,
    feed: { ...DAY1_FEED },
    presentation: {
      durationSecMin: DAY1_PRESENTATION.durationSecMin,
      durationSecMax: DAY1_PRESENTATION.durationSecMax,
      steps: [...DAY1_PRESENTATION.steps],
    },
    updatedAt: new Date(0).toISOString(),
    updatedByAdminId,
  };
}

/** Soft/Hard read-only meta for Admin (≠ success knobs). */
function softHardReadOnly() {
  return {
    softSec: SOFT_SEC,
    hardSec: HARD_SEC,
    membershipUniform: true,
  };
}

/**
 * Rule-facing slice used by evaluateMatchSuccess (effectivePolicy).
 * @param {object} policy
 */
function toRulePolicy(policy) {
  return {
    minProfitUsdt: String(policy.minProfitUsdt),
    staleAllowanceSec: Number(policy.staleAllowanceSec),
    maxRematchCount: Number(policy.maxRematchCount),
    retryWaitSec: Number(policy.retryWaitSec ?? DAY1_RETRY_WAIT_SEC),
  };
}

module.exports = {
  SOFT_SEC,
  HARD_SEC,
  MATCH_STRICTNESS_ENUM,
  MATCH_STRICTNESS_PRESETS,
  MATCH_STRICTNESS_PRESET_SNAPSHOT,
  DAY1_RETRY_WAIT_SEC,
  DAY1_PRESENTATION,
  DAY1_FEED,
  isPresetStrictness,
  isMatchStrictness,
  presetSnapshotCanonical,
  assertPresetSnapshot,
  expandMatchStrictness,
  applyMatchStrictness,
  coerceStrictnessLabel,
  day1ExecutionPolicyDefaults,
  softHardReadOnly,
  toRulePolicy,
};
