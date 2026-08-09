/**
 * Drift gate — 0.000% only (오차0)
 */

"use strict";

/** Locked — any nonzero drift fails */
const MAX_DRIFT_PCT = 0;
const FAIL_ACTION = "block_settlement";
const HORIZON_HOURS = 24;

/**
 * @param {number} expected
 * @param {number} actual
 * @returns {number} absolute relative drift in percent (0..∞)
 */
function driftPct(expected, actual) {
  const e = Number(expected);
  const a = Number(actual);
  if (!Number.isFinite(e) || !Number.isFinite(a)) {
    return Number.POSITIVE_INFINITY;
  }
  if (e === a) return 0;
  if (e === 0) return a === 0 ? 0 : Number.POSITIVE_INFINITY;
  return (Math.abs(a - e) / Math.abs(e)) * 100;
}

/**
 * @param {Array<{ expected: number, actual: number, id?: string }>} rows
 */
function evaluateDrift(rows) {
  const list = Array.isArray(rows) ? rows : [];
  let max = 0;
  const mismatches = [];
  for (const row of list) {
    const d = driftPct(row.expected, row.actual);
    if (d > max) max = d;
    if (d > MAX_DRIFT_PCT) {
      mismatches.push(
        Object.freeze({
          id: row.id != null ? String(row.id) : null,
          expected: row.expected,
          actual: row.actual,
          driftPct: d,
        }),
      );
    }
  }
  const pass = mismatches.length === 0 && max <= MAX_DRIFT_PCT;
  return Object.freeze({
    pass,
    driftPct: pass ? 0 : max,
    maxDriftPct: MAX_DRIFT_PCT,
    failAction: pass ? null : FAIL_ACTION,
    mismatchCount: mismatches.length,
    mismatches: Object.freeze(mismatches),
  });
}

module.exports = {
  MAX_DRIFT_PCT,
  FAIL_ACTION,
  HORIZON_HOURS,
  driftPct,
  evaluateDrift,
};
