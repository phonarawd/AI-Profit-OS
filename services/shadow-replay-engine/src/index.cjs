/**
 * @aipo/shadow-replay-engine — 24h replay · drift 0.000%
 * CI: verify:shadow-replay-drift
 */

"use strict";

const {
  MAX_DRIFT_PCT,
  FAIL_ACTION,
  ADVISORY_LABEL,
  DRIFT_ADVISORY_ONLY,
  HORIZON_HOURS,
  driftPct,
  evaluateDrift,
} = require("./drift.cjs");
const {
  DEFAULT_GOLDEN_DIR,
  loadAiPickGoldens,
  replayAiPickGolden,
  runAiPickShadowReplay,
  replaySettlementGoldens,
} = require("./replay.cjs");

module.exports = {
  MAX_DRIFT_PCT,
  FAIL_ACTION,
  ADVISORY_LABEL,
  DRIFT_ADVISORY_ONLY,
  HORIZON_HOURS,
  driftPct,
  evaluateDrift,
  DEFAULT_GOLDEN_DIR,
  loadAiPickGoldens,
  replayAiPickGolden,
  runAiPickShadowReplay,
  replaySettlementGoldens,
};
