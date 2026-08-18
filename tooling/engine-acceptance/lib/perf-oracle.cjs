/**
 * QA-6 perf oracle probe — 제품 SLO/contract에서만 수치 허용.
 * 부재 시 UNSPECIFIED_PERF_BUDGET / BLOCKED_MISSING_ORACLE (창작 금지).
 */
"use strict";

const fs = require("node:fs");
const path = require("node:path");
const { ROOT, readJson } = require("./hash-scope.cjs");

const BUDGET_REL = "governance/engine-acceptance/perf-budget.v1.json";

/**
 * @returns {{
 *   available: boolean,
 *   blocked_code: string|null,
 *   budget_status: string,
 *   numeric_invention_forbidden: boolean,
 *   thresholds_by_tag: Record<string, any>,
 *   scenario_mix: any[],
 *   threshold_mechanism: any,
 *   probed_paths: string[],
 *   findings: string[],
 *   specified_tag_count: number,
 *   unspecified_tag_count: number,
 * }}
 */
function probePerfOracle() {
  const probed_paths = [];
  /** @type {string[]} */
  const findings = [];
  let budget = null;

  const budgetAbs = path.join(ROOT, BUDGET_REL);
  probed_paths.push(BUDGET_REL);
  if (fs.existsSync(budgetAbs)) {
    try {
      budget = readJson(BUDGET_REL);
    } catch (e) {
      findings.push(`perf-budget.v1.json unreadable: ${e.message}`);
    }
  } else {
    findings.push("perf-budget.v1.json missing");
  }

  const extraRoots = (budget && budget.product_slo_probe_paths) || [
    "governance/slo",
    "services/api-nest/docs/slo",
    "services/api-nest/slo",
    "docs/slo",
  ];
  for (const rel of extraRoots) {
    if (rel === BUDGET_REL) continue;
    probed_paths.push(rel);
    const abs = path.join(ROOT, rel);
    if (!fs.existsSync(abs)) {
      findings.push(`no product SLO path: ${rel}`);
    }
  }

  if (!budget) {
    return {
      available: false,
      blocked_code: "BLOCKED_MISSING_ORACLE",
      budget_status: "UNSPECIFIED_PERF_BUDGET",
      numeric_invention_forbidden: true,
      thresholds_by_tag: {},
      scenario_mix: [],
      threshold_mechanism: null,
      probed_paths,
      findings,
      specified_tag_count: 0,
      unspecified_tag_count: 0,
    };
  }

  const thresholds = budget.thresholds_by_tag || {};
  let specified = 0;
  let unspecified = 0;
  for (const [tag, t] of Object.entries(thresholds)) {
    const hasNum =
      typeof t.p95_ms === "number" || typeof t.error_rate === "number";
    const hasSource = Boolean(t.source);
    if (hasNum && hasSource && t.status !== "UNSPECIFIED_PERF_BUDGET") {
      specified += 1;
    } else {
      unspecified += 1;
      if (hasNum && !hasSource) {
        findings.push(
          `tag=${tag} has numeric threshold without product source — invention risk`,
        );
      }
    }
  }

  const mechanismLocked =
    budget.threshold_mechanism && budget.threshold_mechanism.locked === true;
  if (!mechanismLocked) {
    findings.push("threshold_mechanism.locked must be true");
  }

  const allUnspecified =
    specified === 0 &&
    (unspecified > 0 ||
      budget.status === "UNSPECIFIED_PERF_BUDGET" ||
      Object.keys(thresholds).length === 0);

  if (allUnspecified) {
    findings.push(
      "no product SLO/contract numeric budgets found — recording UNSPECIFIED_PERF_BUDGET (no invented p95/error_rate)",
    );
    return {
      available: false,
      blocked_code: "BLOCKED_MISSING_ORACLE",
      budget_status: "UNSPECIFIED_PERF_BUDGET",
      numeric_invention_forbidden: budget.numeric_invention_forbidden !== false,
      thresholds_by_tag: thresholds,
      scenario_mix: budget.scenario_mix || [],
      threshold_mechanism: budget.threshold_mechanism || null,
      probed_paths,
      findings,
      specified_tag_count: specified,
      unspecified_tag_count: unspecified,
      ci_only_heavy: budget.ci_only_heavy === true,
    };
  }

  return {
    available: true,
    blocked_code: null,
    budget_status: "SPECIFIED",
    numeric_invention_forbidden: budget.numeric_invention_forbidden !== false,
    thresholds_by_tag: thresholds,
    scenario_mix: budget.scenario_mix || [],
    threshold_mechanism: budget.threshold_mechanism || null,
    probed_paths,
    findings,
    specified_tag_count: specified,
    unspecified_tag_count: unspecified,
    ci_only_heavy: budget.ci_only_heavy === true,
  };
}

module.exports = {
  probePerfOracle,
  BUDGET_REL,
};
