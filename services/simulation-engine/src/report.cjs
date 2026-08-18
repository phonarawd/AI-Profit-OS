/**
 * Engine §51.4 SimulationReport builder — KPI inputs → report (+ gates)
 */

"use strict";

const { randomUUID } = require("crypto");
const { evaluateGates } = require("./gates.cjs");
const {
  evaluatePayoutFeasibility,
  scoreFromFeasibility,
} = require("./feasibility.cjs");

/**
 * @param {{
 *   runId?: string,
 *   asOf?: string,
 *   opportunityPublishRate?: number,
 *   spreadDistribution?: { p50: string, p10: string, p90: string },
 *   payoutFeasibilityScore?: number,
 *   worstCasePlatformDrainUsdt?: string,
 *   uxDisplayAccuracy?: Array<{field:string,sample:number,mismatch:number}>,
 *   adapterMatchFailureRate?: number,
 *   feasibility?: Array<object>,
 *   opportunities?: Array<object>,
 * }} kpi
 * @param {{ isSet: boolean, targetUsdt?: string|null, balanceUsdt?: string|null }} reserve
 */
function buildSimulationReport(kpi, reserve) {
  const asOf = kpi?.asOf || new Date().toISOString();
  const runId = kpi?.runId || randomUUID();

  let feasibility = Array.isArray(kpi?.feasibility) ? kpi.feasibility : null;
  if (!feasibility && Array.isArray(kpi?.opportunities)) {
    feasibility = kpi.opportunities.map((o) => evaluatePayoutFeasibility(o));
  }

  let payoutFeasibilityScore =
    typeof kpi?.payoutFeasibilityScore === "number"
      ? kpi.payoutFeasibilityScore
      : null;
  if (payoutFeasibilityScore == null && feasibility) {
    payoutFeasibilityScore = scoreFromFeasibility(feasibility);
  }
  if (payoutFeasibilityScore == null) payoutFeasibilityScore = 1;

  const report = {
    runId,
    asOf,
    horizonHours: 24,
    opportunityPublishRate: clamp01(kpi?.opportunityPublishRate ?? 1),
    spreadDistribution: {
      p50: String(kpi?.spreadDistribution?.p50 ?? "0"),
      p10: String(kpi?.spreadDistribution?.p10 ?? "0"),
      p90: String(kpi?.spreadDistribution?.p90 ?? "0"),
    },
    payoutFeasibilityScore: clamp01(payoutFeasibilityScore),
    worstCasePlatformDrainUsdt: String(
      kpi?.worstCasePlatformDrainUsdt ?? "0",
    ),
    uxDisplayAccuracy: Array.isArray(kpi?.uxDisplayAccuracy)
      ? kpi.uxDisplayAccuracy.map((r) => ({
          field: String(r.field),
          sample: Number(r.sample),
          mismatch: Number(r.mismatch),
        }))
      : [],
    adapterMatchFailureRate: clamp01(kpi?.adapterMatchFailureRate ?? 0),
  };
  if (feasibility) {
    report.feasibility = feasibility;
  }

  const gates = evaluateGates(report, reserve || { isSet: false });
  return { report, gates };
}

function clamp01(n) {
  const x = Number(n);
  if (!Number.isFinite(x)) return 0;
  if (x < 0) return 0;
  if (x > 1) return 1;
  return x;
}

/**
 * R8 helper — simulation.payoutFeasible(opportunityId)
 * @param {string} opportunityId
 * @param {Array<{opportunityId:string,payoutFeasible:boolean}>|null|undefined} feasibility
 */
function payoutFeasible(opportunityId, feasibility) {
  const id = String(opportunityId ?? "");
  const list = Array.isArray(feasibility) ? feasibility : [];
  const hit = list.find((f) => f.opportunityId === id);
  if (!hit) return false;
  return hit.payoutFeasible === true;
}

module.exports = {
  buildSimulationReport,
  payoutFeasible,
};
