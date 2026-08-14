/**
 * PTF-00C P0-C/P0-D/§9/§10 — provider/marketplace resilience pure logic.
 *
 * Deterministic circuit-breaker + health-status derivation from durable
 * heartbeat evidence (Nest persists the row; this module only computes the
 * next state). No timers/setTimeout/Math.random — every transition is driven
 * by a real heartbeat event + an injected `nowMs`, same discipline as
 * settlement_rule.cjs. "eBay down != Peotteok down": a BLOCKED provider must
 * only ever gate NEW auto-publish, never mutate settled money.
 *
 * CI: verify:provider-health
 */
"use strict";

/** Persisted transition states. HALF_OPEN is a read-time DISPLAY label only
 * (see deriveDisplayCircuitState) — every heartbeat tick already IS the
 * probe attempt, so there is no separate "half-open window" to persist. */
const CIRCUIT_STATES = Object.freeze(["CLOSED", "OPEN", "HALF_OPEN"]);
const HEALTH_STATUSES = Object.freeze(["HEALTHY", "DEGRADED", "STALE", "BLOCKED"]);
/** §9 — must stay renderable through the existing admin tint contract. */
const LEGACY_TINTS = Object.freeze(["green", "yellow", "red", "unknown"]);

/** Consecutive failed ticks (CLOSED) before tripping OPEN. */
const DEFAULT_FAILURE_THRESHOLD = 3;
/** OPEN must cool down this long before the next tick counts as a probe. */
const DEFAULT_COOLDOWN_MS = 5 * 60 * 1000;
/** No successful evidence within this window → STALE (heartbeat itself missing/silent). */
const DEFAULT_STALE_AFTER_MS = 30 * 60 * 1000;

/**
 * @typedef {object} CircuitState
 * @property {'CLOSED'|'OPEN'} state persisted transition state (never HALF_OPEN — see above)
 * @property {number} consecutiveFailures
 * @property {number|null} openedAtMs
 */

/** @returns {CircuitState} */
function initialCircuitState() {
  return { state: "CLOSED", consecutiveFailures: 0, openedAtMs: null };
}

/**
 * One heartbeat tick → next persisted circuit state. Pure; caller persists.
 * @param {{
 *   prev?: CircuitState | null,
 *   tickSuccess: boolean,
 *   nowMs: number,
 *   failureThreshold?: number,
 *   cooldownMs?: number,
 * }} input
 * @returns {CircuitState}
 */
function nextCircuitState(input) {
  const failureThreshold = input.failureThreshold ?? DEFAULT_FAILURE_THRESHOLD;
  const cooldownMs = input.cooldownMs ?? DEFAULT_COOLDOWN_MS;
  const prev = input.prev || initialCircuitState();

  if (prev.state === "OPEN") {
    const openedAtMs = prev.openedAtMs ?? input.nowMs;
    const elapsed = input.nowMs - openedAtMs;
    if (elapsed < cooldownMs) {
      // Still cooling down — this tick's own result does not resolve the
      // breaker (the worker attempted anyway; bounded retry keeps it cheap).
      return { state: "OPEN", consecutiveFailures: prev.consecutiveFailures, openedAtMs };
    }
    // Cooldown elapsed — this tick's outcome IS the HALF_OPEN probe.
    if (input.tickSuccess) {
      return initialCircuitState();
    }
    return { state: "OPEN", consecutiveFailures: prev.consecutiveFailures + 1, openedAtMs: input.nowMs };
  }

  // CLOSED
  if (input.tickSuccess) {
    return initialCircuitState();
  }
  const consecutiveFailures = prev.consecutiveFailures + 1;
  if (consecutiveFailures >= failureThreshold) {
    return { state: "OPEN", consecutiveFailures, openedAtMs: input.nowMs };
  }
  return { state: "CLOSED", consecutiveFailures, openedAtMs: null };
}

/**
 * Read-time-only label. OPEN whose cooldown has already elapsed displays as
 * HALF_OPEN ("next attempt will probe recovery") without inventing a
 * separate persisted state or a background timer.
 * @param {{ state: 'CLOSED'|'OPEN', openedAtMs: number|null, nowMs: number, cooldownMs?: number }} input
 * @returns {'CLOSED'|'OPEN'|'HALF_OPEN'}
 */
function deriveDisplayCircuitState(input) {
  if (input.state !== "OPEN") return input.state;
  const cooldownMs = input.cooldownMs ?? DEFAULT_COOLDOWN_MS;
  const openedAtMs = input.openedAtMs ?? input.nowMs;
  return input.nowMs - openedAtMs >= cooldownMs ? "HALF_OPEN" : "OPEN";
}

/**
 * Derive the unambiguous HEALTHY/DEGRADED/STALE/BLOCKED status from durable
 * evidence only (never from an in-process counter that resets on restart).
 * @param {{
 *   displayCircuitState: 'CLOSED'|'OPEN'|'HALF_OPEN',
 *   lastSuccessAtMs: number|null,
 *   nowMs: number,
 *   staleAfterMs?: number,
 *   lastTickFailureCount?: number,
 * }} input
 * @returns {'HEALTHY'|'DEGRADED'|'STALE'|'BLOCKED'}
 */
function deriveHealthStatus(input) {
  if (input.displayCircuitState === "OPEN") return "BLOCKED";

  const staleAfterMs = input.staleAfterMs ?? DEFAULT_STALE_AFTER_MS;
  const noEvidenceYet = input.lastSuccessAtMs == null;
  const evidenceStale =
    !noEvidenceYet && input.nowMs - /** @type {number} */ (input.lastSuccessAtMs) > staleAfterMs;
  if (noEvidenceYet || evidenceStale) return "STALE";

  if (input.displayCircuitState === "HALF_OPEN") return "DEGRADED";
  if ((input.lastTickFailureCount ?? 0) > 0) return "DEGRADED";
  return "HEALTHY";
}

/**
 * §9 — compat mapping onto the existing green/yellow/red/unknown tint used
 * by AdaptersAdminService/admin UI. A partial failure must never render as
 * fully green (brief §8) — DEGRADED always tints yellow, never green.
 * @param {'HEALTHY'|'DEGRADED'|'STALE'|'BLOCKED'|null|undefined} status
 * @returns {'green'|'yellow'|'red'|'unknown'}
 */
function healthStatusToLegacyTint(status) {
  switch (status) {
    case "HEALTHY":
      return "green";
    case "DEGRADED":
      return "yellow";
    case "STALE":
    case "BLOCKED":
      return "red";
    default:
      return "unknown";
  }
}

/**
 * "Worst wins" combinator for legacy tints (matches the existing
 * AdaptersAdminService.applyKpiToHealth precedent: ingest red wins).
 * @param {Array<'green'|'yellow'|'red'|'unknown'>} tints
 * @returns {'green'|'yellow'|'red'|'unknown'}
 */
function worstTint(tints) {
  const rank = { red: 3, yellow: 2, unknown: 1, green: 0 };
  let worst = "green";
  for (const t of tints) {
    if ((rank[t] ?? 0) > (rank[worst] ?? 0)) worst = t;
  }
  return worst;
}

module.exports = {
  CIRCUIT_STATES,
  HEALTH_STATUSES,
  LEGACY_TINTS,
  DEFAULT_FAILURE_THRESHOLD,
  DEFAULT_COOLDOWN_MS,
  DEFAULT_STALE_AFTER_MS,
  initialCircuitState,
  nextCircuitState,
  deriveDisplayCircuitState,
  deriveHealthStatus,
  healthStatusToLegacyTint,
  worstTint,
};
