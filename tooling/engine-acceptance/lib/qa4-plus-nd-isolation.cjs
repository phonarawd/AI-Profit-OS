/**
 * TIME-PLUS-30D / TIME-PLUS-365D fixture isolation — harness only.
 *
 * DayPulseService.platformSafeStopToday is platform-scoped
 * (`created_at >= kstDayStart`, no user filter). A leftover plus-Nd
 * `safe_stop` row that shares the next scenario's "today" window leaves
 * that window together with the new fixture, so
 * plusCount === anchorCount - 1 fails (Formal 32605594769: anchor=2,
 * plus365d=0 vs expected 1).
 *
 * Oracle is unchanged: exactly one extra today-row must leave.
 */
"use strict";

const PLUS_ND_IDEM_PREFIXES = Object.freeze(["qa4-plus30d-", "qa4-plus365d-"]);

/** Place +365d "today" strictly after leftover wall-clock `now()` rows. */
const PLUS_365D_WINDOW_ISOLATION_DAYS = 400;

function plusNdFixtureIdemLikePatterns() {
  return PLUS_ND_IDEM_PREFIXES.map((p) => `${p}%`);
}

/** INV-TIME-01 long-distance: exactly one extra today-row leaves the window. */
function plusNdLeavesExactlyOne(anchorCount, plusCount) {
  return (
    Number.isFinite(anchorCount) &&
    Number.isFinite(plusCount) &&
    plusCount === anchorCount - 1
  );
}

function leftoverVisibleInWindow(leftoverCreatedAtMs, clockMs, kstDayStartMs) {
  return leftoverCreatedAtMs >= kstDayStartMs(clockMs);
}

/**
 * Leftover contaminates plus-Nd when it is "today" at the anchor and not
 * "today" after the advance — the same transition the scenario's own row
 * is supposed to be the unique proof of.
 */
function leftoverContaminatesPlusNdWindow(opts) {
  const { leftoverCreatedAtMs, anchorMs, plusMs, kstDayStartMs } = opts;
  const atAnchor = leftoverVisibleInWindow(leftoverCreatedAtMs, anchorMs, kstDayStartMs);
  const atPlus = leftoverVisibleInWindow(leftoverCreatedAtMs, plusMs, kstDayStartMs);
  return atAnchor && !atPlus;
}

function isolatedPlus365dAnchorMs(nowMs, addDaysMs) {
  return addDaysMs(nowMs, PLUS_365D_WINDOW_ISOLATION_DAYS);
}

module.exports = {
  PLUS_ND_IDEM_PREFIXES,
  PLUS_365D_WINDOW_ISOLATION_DAYS,
  plusNdFixtureIdemLikePatterns,
  plusNdLeavesExactlyOne,
  leftoverContaminatesPlusNdWindow,
  isolatedPlus365dAnchorMs,
};
