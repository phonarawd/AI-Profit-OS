/**
 * REL-406 — 9 kill-switch IDs. Server enforce SSOT.
 * UI must not invent IDs. money_circuit / push / growth stay on existing owners.
 */
"use strict";

const KILL_SWITCH_IDS = Object.freeze([
  "GLOBAL_OPPORTUNITY_PAUSE",
  "GLOBAL_MATCH_PAUSE",
  "GLOBAL_WITHDRAW_PAUSE",
  "GLOBAL_DEPOSIT_PAUSE",
  "GLOBAL_SETTLEMENT_PAUSE",
  "GLOBAL_MONEY_CIRCUIT",
  "GLOBAL_PUSH_PAUSE",
  "GLOBAL_GROWTH_PAUSE",
  "GLOBAL_SOURCE_INGEST_PAUSE",
]);

const EXISTING_OWNER_SWITCHES = Object.freeze({
  GLOBAL_MONEY_CIRCUIT: "MoneyCircuitService",
  GLOBAL_PUSH_PAUSE: "PushKillService",
  GLOBAL_GROWTH_PAUSE: "growth_control",
});

/**
 * Fail-closed for unknown switch IDs.
 * Known switch: ON blocks, OFF allows, missing state is not ON (default not blocking).
 */
function evaluateKillSwitch(id, engaged) {
  if (!KILL_SWITCH_IDS.includes(id)) {
    return { allowed: false, reason: "UNKNOWN_SWITCH", failClosed: true };
  }
  if (engaged === true) {
    return { allowed: false, reason: id, failClosed: true };
  }
  if (engaged === false) {
    return { allowed: true, reason: null, failClosed: false };
  }
  return { allowed: true, reason: "STATE_UNSET", failClosed: false };
}

function isKillSwitchId(id) {
  return KILL_SWITCH_IDS.includes(id);
}

module.exports = {
  KILL_SWITCH_IDS,
  EXISTING_OWNER_SWITCHES,
  evaluateKillSwitch,
  isKillSwitchId,
};
