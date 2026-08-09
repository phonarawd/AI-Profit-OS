/**
 * Engine §51.4 M0.5 Pass/Fail gates S1~S4
 * S1 uxDisplayAccuracy mismatch=0 · S2 drain ≤ reserve×10% · S3 score≥0.85 · S4 failRate≤15%
 */

"use strict";

const money = require("@aipo/market-intelligence/money");

const GATE_THRESHOLDS = Object.freeze({
  /** S2: worstCasePlatformDrain ≤ platform_reserve × 0.10 */
  s2ReserveDrainMaxPct: "0.10",
  /** S3: published opp payoutFeasibilityScore ≥ 0.85 */
  s3PayoutFeasibilityMin: 0.85,
  /** S4: adapterMatchFailureRate ≤ 15% (v1 seed · §51.15) */
  s4AdapterMatchFailureRateMax: 0.15,
  /** Growth ON: latest PASS within hours */
  growthPassMaxAgeHours: 24,
});

/**
 * S1 — uxDisplayAccuracy mismatch = 0 → else block publish
 * @param {Array<{ field: string, sample: number, mismatch: number }>|null|undefined} rows
 */
function evaluateS1(rows) {
  const list = Array.isArray(rows) ? rows : [];
  let totalMismatch = 0;
  for (const r of list) {
    const m = Number(r?.mismatch ?? 0);
    if (!Number.isFinite(m) || m < 0) {
      return {
        id: "S1",
        pass: false,
        failAction: "block_publish",
        totalMismatch: -1,
        detail: "invalid mismatch",
      };
    }
    totalMismatch += m;
  }
  return {
    id: "S1",
    pass: totalMismatch === 0,
    failAction: "block_publish",
    totalMismatch,
    threshold: 0,
  };
}

/**
 * S2 — worstCasePlatformDrain ≤ platform_reserve × 10%
 * Unset reserve → Fail (Day-1)
 * @param {string} worstCasePlatformDrainUsdt
 * @param {{ isSet: boolean, targetUsdt?: string|null, balanceUsdt?: string|null }} reserve
 */
function evaluateS2(worstCasePlatformDrainUsdt, reserve) {
  const drain = money.assertAmount(
    String(worstCasePlatformDrainUsdt ?? ""),
    "worstCasePlatformDrainUsdt",
  );
  if (!reserve || reserve.isSet !== true) {
    return {
      id: "S2",
      pass: false,
      failAction: "admin_alert",
      reason: "platform_reserve_unset",
      drainUsdt: drain,
      reserveUsdt: null,
      maxAllowedUsdt: null,
      thresholdPct: GATE_THRESHOLDS.s2ReserveDrainMaxPct,
    };
  }
  const reserveUsdt = money.assertAmount(
    String(reserve.targetUsdt ?? reserve.balanceUsdt ?? "0"),
    "platform_reserve",
  );
  if (!money.isNonNegAmount(reserveUsdt)) {
    return {
      id: "S2",
      pass: false,
      failAction: "admin_alert",
      reason: "platform_reserve_invalid",
      drainUsdt: drain,
      reserveUsdt,
      maxAllowedUsdt: null,
      thresholdPct: GATE_THRESHOLDS.s2ReserveDrainMaxPct,
    };
  }
  const maxAllowedUsdt = money.mulAmount(
    reserveUsdt,
    GATE_THRESHOLDS.s2ReserveDrainMaxPct,
  );
  const pass = money.cmpAmount(drain, maxAllowedUsdt) <= 0;
  return {
    id: "S2",
    pass,
    failAction: "admin_alert",
    drainUsdt: drain,
    reserveUsdt,
    maxAllowedUsdt,
    thresholdPct: GATE_THRESHOLDS.s2ReserveDrainMaxPct,
  };
}

/**
 * S3 — payoutFeasibilityScore ≥ 0.85 → else hide feed
 * @param {number} score
 */
function evaluateS3(score) {
  const n = Number(score);
  const safe = Number.isFinite(n) ? Math.min(1, Math.max(0, n)) : NaN;
  const threshold = GATE_THRESHOLDS.s3PayoutFeasibilityMin;
  return {
    id: "S3",
    pass: Number.isFinite(safe) && safe >= threshold,
    failAction: "hide_feed",
    score: Number.isFinite(safe) ? safe : null,
    threshold,
  };
}

/**
 * S4 — adapterMatchFailureRate ≤ 15% → else adapter alert
 * @param {number} rate
 */
function evaluateS4(rate) {
  const n = Number(rate);
  const safe = Number.isFinite(n) ? Math.min(1, Math.max(0, n)) : NaN;
  const threshold = GATE_THRESHOLDS.s4AdapterMatchFailureRateMax;
  return {
    id: "S4",
    pass: Number.isFinite(safe) && safe <= threshold,
    failAction: "adapter_alert",
    rate: Number.isFinite(safe) ? safe : null,
    threshold,
  };
}

/**
 * Evaluate all M0.5 gates from report KPI inputs + reserve.
 * @param {{
 *   uxDisplayAccuracy?: Array<{field:string,sample:number,mismatch:number}>,
 *   worstCasePlatformDrainUsdt: string,
 *   payoutFeasibilityScore: number,
 *   adapterMatchFailureRate: number,
 * }} report
 * @param {{ isSet: boolean, targetUsdt?: string|null, balanceUsdt?: string|null }} reserve
 */
function evaluateGates(report, reserve) {
  const s1 = evaluateS1(report?.uxDisplayAccuracy);
  const s2 = evaluateS2(report?.worstCasePlatformDrainUsdt, reserve);
  const s3 = evaluateS3(report?.payoutFeasibilityScore);
  const s4 = evaluateS4(report?.adapterMatchFailureRate);
  const overallPass = s1.pass && s2.pass && s3.pass && s4.pass;
  return {
    s1,
    s2,
    s3,
    s4,
    overallPass,
    thresholds: { ...GATE_THRESHOLDS },
  };
}

module.exports = {
  GATE_THRESHOLDS,
  evaluateS1,
  evaluateS2,
  evaluateS3,
  evaluateS4,
  evaluateGates,
};
