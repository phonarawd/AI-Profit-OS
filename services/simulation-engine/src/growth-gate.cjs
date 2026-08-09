/**
 * Engine §51.4 — Growth ON gate
 * admin.growth.enabled requires latest simulation PASS ≤24h + platform_reserve is_set
 */

"use strict";

const { GATE_THRESHOLDS } = require("./gates.cjs");

/**
 * @param {{
 *   latest?: {
 *     overallPass: boolean,
 *     asOf: string|Date,
 *   }|null,
 *   reserveIsSet: boolean,
 *   now?: string|Date|number,
 * }} input
 */
function evaluateGrowthEnableGate(input) {
  const nowMs = toMs(input?.now ?? Date.now());
  const maxAgeMs = GATE_THRESHOLDS.growthPassMaxAgeHours * 3600 * 1000;
  const reasons = [];

  if (input?.reserveIsSet !== true) {
    reasons.push("platform_reserve_unset");
  }

  const latest = input?.latest;
  if (!latest) {
    reasons.push("simulation_missing");
  } else {
    if (latest.overallPass !== true) {
      reasons.push("simulation_not_pass");
    }
    const asOfMs = toMs(latest.asOf);
    if (!Number.isFinite(asOfMs)) {
      reasons.push("simulation_asof_invalid");
    } else if (nowMs - asOfMs > maxAgeMs) {
      reasons.push("simulation_stale");
    }
  }

  return {
    allowed: reasons.length === 0,
    reasons,
    maxAgeHours: GATE_THRESHOLDS.growthPassMaxAgeHours,
    requires: ["latest_simulation_pass_le_24h", "platform_reserve_is_set"],
  };
}

function toMs(v) {
  if (typeof v === "number") return v;
  if (v instanceof Date) return v.getTime();
  const t = Date.parse(String(v));
  return Number.isFinite(t) ? t : NaN;
}

module.exports = {
  evaluateGrowthEnableGate,
};
