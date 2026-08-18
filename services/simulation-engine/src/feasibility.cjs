/**
 * Engine §51.4 SimulationFeasibility — R8 per-opportunity payoutFeasible
 */

"use strict";

/**
 * @param {{
 *   opportunityId: string,
 *   expectedProfitUsdt?: string|null,
 *   minProfitUsdt?: string|null,
 *   compareReady?: boolean,
 *   forceInfeasible?: boolean,
 * }} input
 * @returns {{ opportunityId: string, payoutFeasible: boolean, reasonKo?: string }}
 */
function evaluatePayoutFeasibility(input) {
  const opportunityId = String(input?.opportunityId ?? "").trim();
  if (!opportunityId) {
    throw new Error("opportunityId required");
  }
  if (input?.forceInfeasible === true) {
    return {
      opportunityId,
      payoutFeasible: false,
      reasonKo: "지급 가능 조건 미달",
    };
  }
  if (input?.compareReady === false) {
    return {
      opportunityId,
      payoutFeasible: false,
      reasonKo: "시세 비교 준비 전",
    };
  }
  // Explicit boolean override from upstream sim stress
  if (typeof input?.payoutFeasible === "boolean") {
    return {
      opportunityId,
      payoutFeasible: input.payoutFeasible,
      ...(input.payoutFeasible
        ? {}
        : { reasonKo: String(input.reasonKo || "지급 가능 조건 미달") }),
    };
  }
  return { opportunityId, payoutFeasible: true };
}

/**
 * Aggregate published-opportunity feasibility → score in [0,1]
 * @param {Array<{ payoutFeasible: boolean }>} items
 */
function scoreFromFeasibility(items) {
  const list = Array.isArray(items) ? items : [];
  if (list.length === 0) return 1;
  let ok = 0;
  for (const it of list) {
    if (it?.payoutFeasible === true) ok += 1;
  }
  return ok / list.length;
}

module.exports = {
  evaluatePayoutFeasibility,
  scoreFromFeasibility,
};
