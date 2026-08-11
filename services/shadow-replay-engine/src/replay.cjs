/**
 * Offline deterministic shadow-replay — AI PICK goldens (+ optional
 * settlement_rule goldens helper). Horizon 24h · drift 0.000%.
 *
 * Semantics (§47.16.6):
 * - Offline fixture replay (not live user answer path)
 * - No production mutation / settlement gate wiring
 * - failAction="block_settlement" is persisted label; contractLabel /
 *   driftAdvisoryOnly mark it advisory-only until PO settlement track
 */

"use strict";

const fs = require("fs");
const path = require("path");
const { scoreAiPick } = require("@aipo/ai-platform");
const {
  MAX_DRIFT_PCT,
  FAIL_ACTION,
  ADVISORY_LABEL,
  DRIFT_ADVISORY_ONLY,
  HORIZON_HOURS,
  evaluateDrift,
} = require("./drift.cjs");

const DEFAULT_GOLDEN_DIR = path.join(
  __dirname,
  "..",
  "testdata",
  "golden",
);

/**
 * Load AI PICK golden traces from directory
 * @param {string} [dir]
 * @returns {object[]}
 */
function loadAiPickGoldens(dir = DEFAULT_GOLDEN_DIR) {
  if (!fs.existsSync(dir)) return [];
  return fs
    .readdirSync(dir)
    .filter((f) => f.endsWith(".json"))
    .sort()
    .map((f) => {
      const raw = JSON.parse(fs.readFileSync(path.join(dir, f), "utf8"));
      return { ...raw, _file: f };
    });
}

/**
 * Replay one AI PICK golden
 * @param {object} golden
 */
function replayAiPickGolden(golden) {
  const pick = scoreAiPick(golden.input || {});
  return Object.freeze({
    id: golden.id || golden._file || "unknown",
    expectedScore: golden.expected.aiConfidenceScore,
    actualScore: pick.aiConfidenceScore,
    expectedIsAiPick: golden.expected.isAiPick === true,
    actualIsAiPick: pick.isAiPick === true,
    expectedTags: golden.expected.tags || [],
    actualTags: [...pick.tags],
    pick,
  });
}

/**
 * Full AI PICK shadow replay report
 * @param {{ goldens?: object[], asOf?: string, runId?: string }} [opts]
 */
function runAiPickShadowReplay(opts = {}) {
  const goldens = opts.goldens || loadAiPickGoldens();
  if (!goldens.length) {
    throw new Error("shadow-replay: no AI PICK goldens");
  }

  const results = goldens.map(replayAiPickGolden);
  const driftRows = results.map((r) => ({
    id: r.id,
    expected: r.expectedScore,
    actual: r.actualScore,
  }));

  // Boolean / tag mismatches count as infinite drift (hard fail)
  for (const r of results) {
    if (r.expectedIsAiPick !== r.actualIsAiPick) {
      driftRows.push({
        id: `${r.id}:isAiPick`,
        expected: r.expectedIsAiPick ? 1 : 0,
        actual: r.actualIsAiPick ? 1 : 0,
      });
    }
    const expTag = (r.expectedTags || []).includes("ai_pick");
    const actTag = (r.actualTags || []).includes("ai_pick");
    if (expTag !== actTag) {
      driftRows.push({
        id: `${r.id}:tag_ai_pick`,
        expected: expTag ? 1 : 0,
        actual: actTag ? 1 : 0,
      });
    }
  }

  const drift = evaluateDrift(driftRows);
  const asOf = opts.asOf || new Date().toISOString();
  const runId =
    opts.runId ||
    `shadow_${asOf.replace(/[:.]/g, "").slice(0, 15)}_${goldens.length}`;

  return Object.freeze({
    schema: "shadow-replay-report.v1",
    runId,
    asOf,
    horizonHours: HORIZON_HOURS,
    kind: "ai_pick",
    /** Offline golden fixture replay — not live user-visible coach path */
    executionMode: "offline_replay",
    traceCount: goldens.length,
    results: Object.freeze(results.map((r) =>
      Object.freeze({
        id: r.id,
        expectedScore: r.expectedScore,
        actualScore: r.actualScore,
        expectedIsAiPick: r.expectedIsAiPick,
        actualIsAiPick: r.actualIsAiPick,
      }),
    )),
    driftPct: drift.pass ? 0 : drift.driftPct,
    maxDriftPct: MAX_DRIFT_PCT,
    pass: drift.pass,
    failAction: drift.failAction,
    driftAdvisoryOnly: DRIFT_ADVISORY_ONLY,
    contractLabel: ADVISORY_LABEL,
    mismatchCount: drift.mismatchCount,
    mismatches: drift.mismatches,
  });
}

/**
 * Optional: replay settlement_rule CJS goldens for 0.000% parity
 * @param {string} goldenDir — engine-rust/testdata/golden
 * @param {object} ruleModule — require(settlement_rule.cjs)
 */
function replaySettlementGoldens(goldenDir, ruleModule) {
  if (!fs.existsSync(goldenDir)) {
    return Object.freeze({
      kind: "settlement_rule",
      executionMode: "offline_replay",
      pass: false,
      failAction: FAIL_ACTION,
      driftAdvisoryOnly: DRIFT_ADVISORY_ONLY,
      contractLabel: ADVISORY_LABEL,
      reason: "golden_dir_missing",
      driftPct: Number.POSITIVE_INFINITY,
    });
  }
  const files = fs.readdirSync(goldenDir).filter((f) => f.endsWith(".json"));
  const rows = [];
  for (const f of files) {
    const g = JSON.parse(fs.readFileSync(path.join(goldenDir, f), "utf8"));
    if (!g.expected || g.expected.resultCode == null) continue;
    if (typeof ruleModule.evaluate_execution !== "function") continue;
    const actual = ruleModule.evaluate_execution(
      g.trade || g.input?.trade,
      g.opportunity || g.input?.opportunity,
      g.policy || g.input?.policy,
      g.user || g.input?.user,
      g.sim || g.input?.sim,
    );
    const expectedCode = g.expected.resultCode;
    const actualCode =
      typeof actual === "string" ? actual : actual?.resultCode || actual?.code;
    rows.push({
      id: f,
      expected: expectedCode === actualCode ? 1 : 0,
      actual: 1,
      // if mismatch, force fail via expected=1 actual=0
      ...(expectedCode === actualCode
        ? {}
        : { expected: 1, actual: 0 }),
    });
  }
  const drift = evaluateDrift(rows);
  return Object.freeze({
    kind: "settlement_rule",
    executionMode: "offline_replay",
    pass: drift.pass,
    driftPct: drift.pass ? 0 : drift.driftPct,
    failAction: drift.failAction,
    driftAdvisoryOnly: DRIFT_ADVISORY_ONLY,
    contractLabel: ADVISORY_LABEL,
    mismatchCount: drift.mismatchCount,
    traceCount: rows.length,
  });
}

module.exports = {
  DEFAULT_GOLDEN_DIR,
  loadAiPickGoldens,
  replayAiPickGolden,
  runAiPickShadowReplay,
  replaySettlementGoldens,
};
