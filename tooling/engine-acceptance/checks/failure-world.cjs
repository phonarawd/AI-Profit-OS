/**
 * QA-5 — Failure World (두 축)
 *
 * 축1: fault introduced → expected degradation/fallback (예: AI 429)
 * 축2: recovery → post-recovery invariant scan (ledger/idempotency/user state)
 *
 * hook 없으면 BLOCKED_NO_FAULT_HOOK (mock PASS 금지).
 * critical INV-FEED-AI-01 / INV-LEDGER-01 BLOCKED → ACCEPTED 불가.
 */
"use strict";

const { probeFaultHook } = require("../lib/fault-hook.cjs");
const { buildRichFailureEvidence } = require("../lib/rich-failure-evidence.cjs");
const { probeQa5FaultHarness } = require("../lib/qa5-fault-evidence.cjs");

/**
 * Maps to the matching canonical scenario_id ONLY when run-qa5-fault.cjs
 * (real booted Nest + isolated Postgres + LLM fault server) just produced
 * fresh evidence in this same job. Every other scenario is left untouched
 * by this function - nothing unexecuted is ever promoted to PASS.
 * @param {string} scenarioId
 * @param {any} harnessData
 */
function dynamicOutcomeFor(scenarioId, harnessData) {
  if (!harnessData) return null;
  if (scenarioId === "FAULT-AI-429-DEGRADE") {
    const a = harnessData.axis1_429_degrade;
    if (!a) return null;
    return {
      status: a.verdict === "PASS" ? "PASS" : "FAIL",
      findings: a.verdict === "PASS" ? [] : ["real AI-429 degrade proof FAIL: " + JSON.stringify(a)],
      rich: a,
    };
  }
  if (scenarioId === "FAULT-RECOVERY-LEDGER-SCAN") {
    const a = harnessData.axis2_post_recovery_ledger_scan;
    if (!a) return null;
    return {
      status: a.verdict === "PASS" ? "PASS" : "FAIL",
      findings: a.verdict === "PASS" ? [] : ["real post-recovery ledger scan FAIL: " + JSON.stringify(a)],
      rich: a,
    };
  }
  return null;
}

/**
 * @param {{ mode?: "tiny"|"full" }} opts
 */
function buildFaultScenarios(opts = {}) {
  const mode = opts.mode === "full" ? "full" : "tiny";

  /** @type {any[]} */
  const all = [
    // —— 축1: expected degradation / fallback ——
    {
      scenario_id: "FAULT-AI-429-DEGRADE",
      axis: 1,
      axis_label: "expected_degradation_fallback",
      invariant_id: "INV-FEED-AI-01",
      journey_id: "J-FAULT-DEGRADE-01",
      persona_id: "KR-10",
      title: "AI 429 → HTTP/응답 계약 degradation · ledger 비침범",
      fault: { kind: "ai_http", status: 429, target: "peotteok_ai" },
      expected: {
        degradation: true,
        ledger_untouched: true,
        mock_pass_forbidden: true,
      },
      kind: "ai_429_degrade",
    },
    {
      scenario_id: "FAULT-AI-TIMEOUT-FALLBACK",
      axis: 1,
      axis_label: "expected_degradation_fallback",
      invariant_id: "INV-FEED-AI-01",
      journey_id: "J-FAULT-DEGRADE-01",
      persona_id: "KR-10",
      title: "AI timeout → fail-safe fallback · ledger 비침범",
      fault: { kind: "ai_timeout", ms: 1, target: "peotteok_ai" },
      expected: {
        degradation: true,
        fallback_contract: true,
        ledger_untouched: true,
      },
      kind: "ai_timeout_fallback",
    },
    {
      scenario_id: "FAULT-UPSTREAM-5XX-DEGRADE",
      axis: 1,
      axis_label: "expected_degradation_fallback",
      invariant_id: "INV-FEED-AI-01",
      journey_id: "J-FAULT-DEGRADE-01",
      persona_id: "KR-10",
      title: "upstream 5xx → expected degradation 계약",
      fault: { kind: "upstream_http", status: 503, target: "feed_upstream" },
      expected: { degradation: true, ledger_untouched: true },
      kind: "upstream_5xx_degrade",
    },
    // —— 축2: post-recovery invariant scan ——
    {
      scenario_id: "FAULT-RECOVERY-LEDGER-SCAN",
      axis: 2,
      axis_label: "post_recovery_invariant",
      invariant_id: "INV-LEDGER-01",
      journey_id: "J-FAULT-RECOVERY-01",
      persona_id: "KR-03",
      title: "fault clear 후 ledger/bucket invariant scan",
      fault: { kind: "transient_db_blip", then: "clear" },
      expected: { post_recovery_scan: ["INV-LEDGER-01"] },
      kind: "recovery_ledger",
    },
    {
      scenario_id: "FAULT-RECOVERY-IDEMPOTENCY-SCAN",
      axis: 2,
      axis_label: "post_recovery_invariant",
      invariant_id: "INV-IDEMPOTENCY-01",
      journey_id: "J-FAULT-RECOVERY-01",
      persona_id: "KR-09",
      title: "fault clear 후 idempotency invariant scan",
      fault: { kind: "request_drop", then: "clear" },
      expected: { post_recovery_scan: ["INV-IDEMPOTENCY-01"] },
      kind: "recovery_idempotency",
    },
    {
      scenario_id: "FAULT-RECOVERY-USER-STATE",
      axis: 2,
      axis_label: "post_recovery_invariant",
      invariant_id: "INV-LEDGER-01",
      journey_id: "J-FAULT-RECOVERY-01",
      persona_id: "KR-03",
      title: "fault clear 후 user state / money truth scan",
      fault: { kind: "partial_write", then: "clear" },
      expected: { post_recovery_scan: ["INV-LEDGER-01", "user_state"] },
      kind: "recovery_user_state",
    },
  ];

  if (mode === "tiny") {
    return all.filter((s) =>
      ["FAULT-AI-429-DEGRADE", "FAULT-RECOVERY-LEDGER-SCAN"].includes(
        s.scenario_id,
      ),
    );
  }
  return all;
}

/**
 * @param {{
 *   mode?: "tiny"|"full",
 *   baseline_id: string,
 *   measuredAt: string,
 *   seed?: number,
 * }} opts
 */
function runFailureWorld(opts) {
  const mode = opts.mode === "full" ? "full" : "tiny";
  const measuredAt = opts.measuredAt || new Date().toISOString();
  const seed = opts.seed ?? 20260812;
  const probe = probeFaultHook();
  const scenariosDef = buildFaultScenarios({ mode });

  const harnessProbe = probeQa5FaultHarness();
  const harnessData = harnessProbe.available ? harnessProbe.data : null;

  /** @type {any[]} */
  const scenarios = [];
  let blocked = 0;
  let passed = 0;
  let failed = 0;

  for (const def of scenariosDef) {
    const dynamic = dynamicOutcomeFor(def.scenario_id, harnessData);
    if (dynamic) {
      if (dynamic.status === "PASS") passed += 1;
      else failed += 1;
      scenarios.push({
        ...def,
        status: dynamic.status,
        blocked_code: null,
        findings: dynamic.status === "PASS" ? ["Real execution via run-qa5-fault.cjs (isolated CI Postgres + booted Nest + LLM fault server)."] : dynamic.findings,
        rich_evidence: buildRichFailureEvidence({
          seed,
          suite_id: "QA5",
          invariant_id: def.invariant_id,
          clock_as_of: harnessData.measuredAt || measuredAt,
          baseline_id: opts.baseline_id,
          mode,
          request_sequence: [
            { step: "probe_fault_hook", result: "present", adapter: probe.adapter_rel },
            { step: "execute_scenario", result: "real_execution", axis: def.axis, source: "run-qa5-fault.cjs" },
          ],
          configuration_fingerprint: { suite: "QA5", mode, fault_hook_available: true, adapter_rel: probe.adapter_rel, axis: def.axis, dynamic: true },
          sanitized_response: dynamic.rich,
          error_message: dynamic.status === "FAIL" ? dynamic.findings.join(" | ") : null,
        }),
      });
      continue;
    }

    if (!probe.available) {
      blocked += 1;
      const rich_evidence = buildRichFailureEvidence({
        seed,
        suite_id: "QA5",
        invariant_id: def.invariant_id,
        clock_as_of: measuredAt,
        baseline_id: opts.baseline_id,
        mode,
        request_sequence: [
          {
            step: "probe_fault_hook",
            result: "absent",
            blocked_code: "BLOCKED_NO_FAULT_HOOK",
          },
          {
            step: "scenario_planned",
            scenario_id: def.scenario_id,
            axis: def.axis,
            axis_label: def.axis_label,
            fault: def.fault,
            executed: false,
          },
        ],
        configuration_fingerprint: {
          suite: "QA5",
          mode,
          fault_hook_available: false,
          axis: def.axis,
        },
        sanitized_request: {
          scenario_id: def.scenario_id,
          kind: def.kind,
          fault: def.fault,
          expected: def.expected,
        },
        sanitized_response: {
          status: "BLOCKED",
          blocked_code: "BLOCKED_NO_FAULT_HOOK",
          mock_pass_forbidden: true,
        },
      });

      scenarios.push({
        ...def,
        status: "BLOCKED",
        blocked_code: "BLOCKED_NO_FAULT_HOOK",
        findings: [
          "Fault injection hook absent — scenario not executed (no mock PASS).",
          ...(probe.findings || []),
        ],
        rich_evidence,
      });
      continue;
    }

    // Hook 존재 시에도 harness executor 미배선이면 FAIL (세탁 PASS 금지)
    failed += 1;
    scenarios.push({
      ...def,
      status: "FAIL",
      blocked_code: null,
      findings: [
        "Fault hook module present but harness Failure World executor not wired in this slice — record as FAIL (not laundry PASS).",
      ],
      rich_evidence: buildRichFailureEvidence({
        seed,
        suite_id: "QA5",
        invariant_id: def.invariant_id,
        clock_as_of: measuredAt,
        baseline_id: opts.baseline_id,
        request_sequence: [
          {
            step: "probe_fault_hook",
            result: "present",
            adapter: probe.adapter_rel,
          },
          { step: "execute_scenario", result: "not_wired", axis: def.axis },
        ],
        configuration_fingerprint: {
          suite: "QA5",
          mode,
          fault_hook_available: true,
          adapter_rel: probe.adapter_rel,
          axis: def.axis,
        },
      }),
    });
  }

  const axis1 = scenarios.filter((s) => s.axis === 1);
  const axis2 = scenarios.filter((s) => s.axis === 2);

  /** @type {any[]} */
  const criticalDetails = [];

  const summarizeInv = (invariant_id, list, critical) => {
    if (!list.length) return null;
    const hasBlocked = list.some((s) => s.status === "BLOCKED");
    const hasFail = list.some((s) => s.status === "FAIL");
    let status = "PASS";
    let blocked_code = null;
    if (hasFail) status = "FAIL";
    else if (hasBlocked) {
      status = "BLOCKED";
      blocked_code = "BLOCKED_NO_FAULT_HOOK";
    }
    const detail = {
      invariant_id,
      critical,
      status,
      blocked_code,
      scenario_ids: list.map((s) => s.scenario_id),
    };
    criticalDetails.push(detail);
    return status;
  };

  const feedAi = scenarios.filter((s) => s.invariant_id === "INV-FEED-AI-01");
  const ledger = scenarios.filter((s) => s.invariant_id === "INV-LEDGER-01");
  const idem = scenarios.filter((s) => s.invariant_id === "INV-IDEMPOTENCY-01");

  summarizeInv("INV-FEED-AI-01", feedAi, true);
  summarizeInv("INV-LEDGER-01", ledger, true);
  if (idem.length) {
    // coverage maps COV-001 to QA1..3; recovery scan is observational for QA5
    summarizeInv("INV-IDEMPOTENCY-01", idem, true);
  }

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
  else if (blocked > 0) status = "BLOCKED";

  const axes = {
    axis1_expected_degradation_fallback: {
      scenario_count: axis1.length,
      blocked: axis1.filter((s) => s.status === "BLOCKED").length,
      failed: axis1.filter((s) => s.status === "FAIL").length,
      passed: axis1.filter((s) => s.status === "PASS").length,
      status: axis1.some((s) => s.status === "FAIL")
        ? "FAIL"
        : axis1.some((s) => s.status === "BLOCKED")
          ? "BLOCKED"
          : "PASS",
    },
    axis2_post_recovery_invariant: {
      scenario_count: axis2.length,
      blocked: axis2.filter((s) => s.status === "BLOCKED").length,
      failed: axis2.filter((s) => s.status === "FAIL").length,
      passed: axis2.filter((s) => s.status === "PASS").length,
      status: axis2.some((s) => s.status === "FAIL")
        ? "FAIL"
        : axis2.some((s) => s.status === "BLOCKED")
          ? "BLOCKED"
          : "PASS",
    },
  };

  return {
    check_id: "QA5_FAILURE_WORLD",
    status,
    mode,
    measuredAt,
    seed,
    fault_hook: {
      available: probe.available,
      blocked_code: probe.blocked_code,
      probed_paths: probe.probed_paths,
      findings: probe.findings,
      env_hooks_present: probe.env_hooks_present,
      adapter_rel: probe.adapter_rel,
    },
    harness_probe: {
      available: harnessProbe.available,
      probed_path: harnessProbe.probed_path,
      reason: harnessProbe.reason || null,
    },
    axes,
    scenarioCount: scenarios.length,
    passed,
    failed,
    blocked,
    scenarios,
    critical_invariant,
    mock_pass_forbidden: true,
    notes: [
      "Axis1 = fault → expected degradation/fallback (no ledger corruption).",
      "Axis2 = recovery → post-recovery invariant scan.",
      "BLOCKED ≠ defect · critical BLOCKED → ENGINE_QA_INCOMPLETE.",
      "Product mutation 0 — no fault hook invented in services/**.",
    ],
  };
}

module.exports = {
  runFailureWorld,
  buildFaultScenarios,
  dynamicOutcomeFor,
};
