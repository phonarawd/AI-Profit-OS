/**
 * QA-6 — Performance World
 *
 * - k6 scenario mix + tag별 threshold **메커니즘** 잠금
 * - 수치 SLO 없으면 UNSPECIFIED_PERF_BUDGET (p95/error_rate 창작 금지)
 * - heavy k6 = CI only · local tiny = mechanism smoke
 * - critical INV-PERF-01 + oracle 부재 → ACCEPTED 불가
 */
"use strict";

const fs = require("node:fs");
const path = require("node:path");
const { ROOT } = require("../lib/hash-scope.cjs");
const { probePerfOracle } = require("../lib/perf-oracle.cjs");
const { buildRichFailureEvidence } = require("../lib/rich-failure-evidence.cjs");

const K6_SCRIPT_REL = "tooling/engine-acceptance/k6/scenario-mix.js";

/**
 * @param {{ mode?: "tiny"|"full" }} opts
 */
function buildPerfScenarios(opts = {}) {
  const mode = opts.mode === "full" ? "full" : "tiny";
  const oracle = opts.oracle;
  const mix = (oracle && oracle.scenario_mix) || [];

  /** @type {any[]} */
  const all = mix.map((m) => ({
    scenario_id: m.scenario_id,
    tag: m.tag,
    weight: m.weight,
    invariant_id: m.invariant_id || "INV-PERF-01",
    journey_id: m.journey_id || "J-PERF-MIX-01",
    persona_id: m.persona_id || null,
    title: m.title || m.scenario_id,
    kind: "k6_tagged_workload",
  }));

  if (mode === "tiny") {
    return all.slice(0, 2);
  }
  return all;
}

/**
 * @param {{
 *   mode?: "tiny"|"full",
 *   baseline_id: string,
 *   measuredAt: string,
 *   seed?: number,
 *   allow_local_k6?: boolean,
 * }} opts
 */
function runPerformanceWorld(opts) {
  const mode = opts.mode === "full" ? "full" : "tiny";
  const measuredAt = opts.measuredAt || new Date().toISOString();
  const seed = opts.seed ?? 20260812;
  const oracle = probePerfOracle();
  const scenariosDef = buildPerfScenarios({ mode, oracle });

  const k6ScriptAbs = path.join(ROOT, K6_SCRIPT_REL);
  const k6_script_present = fs.existsSync(k6ScriptAbs);

  /** @type {any[]} */
  const scenarios = [];
  let blocked = 0;
  let passed = 0;
  let failed = 0;
  let unspecified = 0;

  const mechanism = oracle.threshold_mechanism || {};
  const mechanism_ok =
    mechanism.locked === true &&
    mechanism.engine === "k6" &&
    mechanism.binding === "tag";

  for (const def of scenariosDef) {
    const tagBudget = (oracle.thresholds_by_tag || {})[def.tag] || {
      p95_ms: null,
      error_rate: null,
      source: null,
      status: "UNSPECIFIED_PERF_BUDGET",
    };

    const invented =
      (typeof tagBudget.p95_ms === "number" ||
        typeof tagBudget.error_rate === "number") &&
      !tagBudget.source;

    if (invented) {
      failed += 1;
      scenarios.push({
        ...def,
        status: "FAIL",
        blocked_code: null,
        budget_status: "INVENTED_NUMERIC_FORBIDDEN",
        threshold: tagBudget,
        findings: [
          "Numeric p95/error_rate without product SLO source — invention forbidden.",
        ],
        rich_evidence: buildRichFailureEvidence({
          seed,
          suite_id: "QA6",
          invariant_id: def.invariant_id,
          clock_as_of: measuredAt,
          baseline_id: opts.baseline_id,
          mode,
          request_sequence: [
            { step: "probe_perf_oracle", result: "invention_detected", tag: def.tag },
          ],
          configuration_fingerprint: {
            suite: "QA6",
            mode,
            tag: def.tag,
            invented: true,
          },
          sanitized_request: { scenario_id: def.scenario_id, tag: def.tag },
          sanitized_response: {
            status: "FAIL",
            reason: "numeric_invention_forbidden",
          },
        }),
      });
      continue;
    }

    if (
      !oracle.available ||
      tagBudget.status === "UNSPECIFIED_PERF_BUDGET" ||
      oracle.budget_status === "UNSPECIFIED_PERF_BUDGET"
    ) {
      unspecified += 1;
      blocked += 1;
      scenarios.push({
        ...def,
        status: "BLOCKED",
        blocked_code: "BLOCKED_MISSING_ORACLE",
        budget_status: "UNSPECIFIED_PERF_BUDGET",
        threshold: {
          p95_ms: null,
          error_rate: null,
          source: null,
          status: "UNSPECIFIED_PERF_BUDGET",
        },
        findings: [
          "No product SLO/contract numeric budget — recorded UNSPECIFIED_PERF_BUDGET (no invented thresholds).",
          ...(oracle.findings || []).slice(0, 3),
        ],
        rich_evidence: buildRichFailureEvidence({
          seed,
          suite_id: "QA6",
          invariant_id: def.invariant_id,
          clock_as_of: measuredAt,
          baseline_id: opts.baseline_id,
          mode,
          request_sequence: [
            {
              step: "probe_perf_oracle",
              result: "unspecified",
              blocked_code: "BLOCKED_MISSING_ORACLE",
              budget_status: "UNSPECIFIED_PERF_BUDGET",
            },
            {
              step: "scenario_planned",
              scenario_id: def.scenario_id,
              tag: def.tag,
              weight: def.weight,
              k6_executed: false,
              reason: "UNSPECIFIED_PERF_BUDGET",
            },
          ],
          configuration_fingerprint: {
            suite: "QA6",
            mode,
            tag: def.tag,
            ci_only_heavy: true,
            k6_script: K6_SCRIPT_REL,
          },
          sanitized_request: {
            scenario_id: def.scenario_id,
            tag: def.tag,
            weight: def.weight,
          },
          sanitized_response: {
            status: "BLOCKED",
            blocked_code: "BLOCKED_MISSING_ORACLE",
            budget_status: "UNSPECIFIED_PERF_BUDGET",
            mock_pass_forbidden: true,
          },
        }),
      });
      continue;
    }

    // Budget specified — heavy k6 is CI-only
    if (mode !== "full" && !opts.allow_local_k6) {
      blocked += 1;
      scenarios.push({
        ...def,
        status: "BLOCKED",
        blocked_code: "BLOCKED_ENV_CAPABILITY",
        budget_status: "SPECIFIED",
        threshold: tagBudget,
        findings: [
          "Heavy k6 execution is CI-only — local tiny records mechanism + budget binding without run.",
        ],
        rich_evidence: buildRichFailureEvidence({
          seed,
          suite_id: "QA6",
          invariant_id: def.invariant_id,
          clock_as_of: measuredAt,
          baseline_id: opts.baseline_id,
          mode,
          request_sequence: [
            { step: "probe_perf_oracle", result: "specified", tag: def.tag },
            {
              step: "k6_deferred",
              reason: "ci_only_heavy",
              mode,
            },
          ],
          configuration_fingerprint: {
            suite: "QA6",
            mode,
            tag: def.tag,
            ci_only_heavy: true,
          },
        }),
      });
      continue;
    }

    // Full CI path with specified budget: harness executor not wired to live target → FAIL (not laundry PASS)
    failed += 1;
    scenarios.push({
      ...def,
      status: "FAIL",
      blocked_code: null,
      budget_status: "SPECIFIED",
      threshold: tagBudget,
      findings: [
        "Product SLO present but live k6 executor against acceptance target not wired in this slice — record FAIL (not laundry PASS).",
      ],
      rich_evidence: buildRichFailureEvidence({
        seed,
        suite_id: "QA6",
        invariant_id: def.invariant_id,
        clock_as_of: measuredAt,
        baseline_id: opts.baseline_id,
        mode,
        request_sequence: [
          { step: "probe_perf_oracle", result: "specified", tag: def.tag },
          { step: "execute_k6", result: "not_wired", script: K6_SCRIPT_REL },
        ],
        configuration_fingerprint: {
          suite: "QA6",
          mode,
          tag: def.tag,
          k6_script_present,
        },
      }),
    });
  }

  const criticalDetails = [
    {
      invariant_id: "INV-PERF-01",
      critical: true,
      status:
        failed > 0
          ? "FAIL"
          : unspecified > 0 || blocked > 0
            ? "BLOCKED"
            : scenarios.length
              ? "PASS"
              : "UNCOVERED",
      blocked_code:
        unspecified > 0
          ? "BLOCKED_MISSING_ORACLE"
          : blocked > 0
            ? "BLOCKED_ENV_CAPABILITY"
            : null,
      budget_status: oracle.budget_status,
      scenario_ids: scenarios.map((s) => s.scenario_id),
    },
  ];

  const critical_invariant = {
    blocked: criticalDetails.filter((d) => d.critical && d.status === "BLOCKED")
      .length,
    skipped: criticalDetails.filter((d) => d.critical && d.status === "SKIPPED")
      .length,
    uncovered: criticalDetails.filter(
      (d) => d.critical && d.status === "UNCOVERED",
    ).length,
    failed: criticalDetails.filter((d) => d.critical && d.status === "FAIL")
      .length,
    details: criticalDetails,
  };

  let status = "PASS";
  if (failed > 0) status = "FAIL";
  else if (unspecified > 0) status = "UNSPECIFIED_PERF_BUDGET";
  else if (blocked > 0) status = "BLOCKED";

  const weightSum = scenariosDef.reduce((a, s) => a + (s.weight || 0), 0);

  return {
    check_id: "QA6_PERFORMANCE_WORLD",
    status,
    mode,
    measuredAt,
    seed,
    perf_oracle: {
      available: oracle.available,
      blocked_code: oracle.blocked_code,
      budget_status: oracle.budget_status,
      numeric_invention_forbidden: oracle.numeric_invention_forbidden,
      specified_tag_count: oracle.specified_tag_count,
      unspecified_tag_count: oracle.unspecified_tag_count,
      probed_paths: oracle.probed_paths,
      findings: oracle.findings,
      ci_only_heavy: oracle.ci_only_heavy !== false,
    },
    threshold_mechanism: {
      locked: mechanism_ok,
      engine: mechanism.engine || "k6",
      binding: mechanism.binding || "tag",
      metrics: mechanism.metrics || ["http_req_duration", "http_req_failed"],
      k6_script_rel: K6_SCRIPT_REL,
      k6_script_present,
    },
    scenario_mix: {
      scenario_count: scenarios.length,
      weight_sum: weightSum,
      tags: scenarios.map((s) => s.tag),
    },
    scenarioCount: scenarios.length,
    passed,
    failed,
    blocked,
    unspecified,
    scenarios,
    critical_invariant,
    mock_pass_forbidden: true,
    numeric_invention_forbidden: true,
    ci_only_heavy: true,
    notes: [
      "Scenario mix + tag threshold mechanism locked.",
      "UNSPECIFIED_PERF_BUDGET when no product SLO — do not invent p95/error_rate.",
      "Heavy k6 = CI only · aggregator if: always() retains evidence.",
      "critical INV-PERF-01 BLOCKED/UNSPECIFIED → ENGINE_QA_INCOMPLETE.",
    ],
  };
}

module.exports = {
  runPerformanceWorld,
  buildPerfScenarios,
  K6_SCRIPT_REL,
};
