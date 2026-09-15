/**
 * 자동 하향 최소 구조 (T02/T05). enabled=false.
 * 입금 기준·휴면 일수·회수 정책을 임의 확정하지 않음.
 * MANUAL_PIN(admin_force)이 계산 등급·개별 cap을 덮지 못하게 평가만 한다.
 */

"use strict";

const DEFAULT_POLICY = Object.freeze({
  enabled: false,
  contractVersion: 1,
  observationWindow: null,
  evaluateEvery: null,
  grace: null,
  indicators: Object.freeze([]),
  note: "auto_downgrade_criteria_unapproved",
});

function createAutoDowngradePolicy(overrides) {
  return {
    ...DEFAULT_POLICY,
    ...(overrides && typeof overrides === "object" ? overrides : {}),
    enabled: false,
  };
}

/**
 * @param {{
 *   policy?: object,
 *   adminForce?: boolean,
 *   appliedMembership: string,
 *   autoMembership: string,
 *   evaluationAt?: string,
 *   policyVersion?: number,
 *   lastAppliedEvaluationAt?: string,
 *   fixtureIndicators?: object,
 * }} input
 */
function evaluateAutoDowngrade(input) {
  const policy = input.policy || DEFAULT_POLICY;
  const pin = input.adminForce === true;
  const stale =
    input.lastAppliedEvaluationAt &&
    input.evaluationAt &&
    input.lastAppliedEvaluationAt > input.evaluationAt;
  return {
    enabled: policy.enabled === true,
    wouldApply: false,
    skippedReason: pin
      ? "MANUAL_PIN"
      : policy.enabled !== true
        ? "DISABLED"
        : stale
          ? "STALE_EVALUATION"
          : "CRITERIA_UNAPPROVED",
    appliedMembership: input.appliedMembership,
    autoMembership: input.autoMembership,
    individualCapUntouched: true,
    benefitsNotClawed: true,
    ledgerMutated: false,
    stale: stale === true,
    policyVersion: input.policyVersion ?? policy.contractVersion,
    indicators: input.fixtureIndicators || {},
  };
}

function previewGradeChangeEffects(input) {
  return {
    nextMembership: input.nextMembership,
    nextGradeDailyCap: input.nextGradeDailyCap,
    individualCapPreserved: input.individualCap != null,
    bonusGrantsPreserved: true,
    usagePreserved: true,
    inFlightTradeMoneyPreserved: true,
    notify: false,
    perkClawback: false,
    ledgerMutated: false,
  };
}

module.exports = {
  DEFAULT_POLICY,
  createAutoDowngradePolicy,
  evaluateAutoDowngrade,
  previewGradeChangeEffects,
};
