/**
 * QA-4 — multi-day lifecycle + KST clock scenarios
 *
 * Clock 주입 가능 시 KST 경계·월말·연말·+30d·+365d 실행.
 * 불가 시 시나리오마다 BLOCKED_NO_CLOCK_HOOK (mock PASS 금지).
 * critical INV-TIME-01 BLOCKED → ACCEPTED 불가 (ENGINE_QA_INCOMPLETE).
 */
"use strict";

const { probeClockHook } = require("../lib/clock-hook.cjs");
const { buildRichFailureEvidence } = require("../lib/rich-failure-evidence.cjs");
const { probeQa4ClockHarness } = require("../lib/qa4-clock-evidence.cjs");

/** Asia/Seoul fixed offset +09:00 (DST 없음) */
const KST_OFFSET_MS = 9 * 60 * 60 * 1000;

/**
 * @param {number} y
 * @param {number} m 1-12
 * @param {number} d
 * @param {number} hh
 * @param {number} mm
 * @param {number} ss
 * @param {number} [ms]
 */
function kstLocalToUtcIso(y, m, d, hh = 0, mm = 0, ss = 0, ms = 0) {
  const utcMs = Date.UTC(y, m - 1, d, hh, mm, ss, ms) - KST_OFFSET_MS;
  return new Date(utcMs).toISOString();
}

function addDaysUtcIso(iso, days) {
  const t = Date.parse(iso);
  return new Date(t + days * 24 * 60 * 60 * 1000).toISOString();
}

/**
 * 시나리오 정의 (관측 · KPI 숫자 금지)
 * @returns {Array<{
 *   scenario_id: string,
 *   invariant_id: string,
 *   journey_id: string,
 *   persona_id: string,
 *   title: string,
 *   clock_as_of: string,
 *   kst_label: string,
 *   kind: string,
 * }>}
 */
function buildTimeScenarios(opts = {}) {
  const mode = opts.mode === "full" ? "full" : "tiny";
  const anchor = kstLocalToUtcIso(2026, 3, 15, 12, 0, 0); // 정오 KST

  /** @type {typeof buildTimeScenarios extends Function ? any[] : any[]} */
  const all = [
    {
      scenario_id: "TIME-KST-DAY-BOUNDARY",
      invariant_id: "INV-TIME-01",
      journey_id: "J-TIME-MULTIDAY-01",
      persona_id: "KR-06",
      title: "KST 일 경계 (00:00 Asia/Seoul)",
      clock_as_of: kstLocalToUtcIso(2026, 3, 15, 0, 0, 0),
      kst_label: "2026-03-15T00:00:00+09:00",
      kind: "kst_day_boundary",
    },
    {
      scenario_id: "TIME-KST-MONTH-END",
      invariant_id: "INV-TIME-01",
      journey_id: "J-TIME-MULTIDAY-01",
      persona_id: "KR-06",
      title: "KST 월말 경계",
      clock_as_of: kstLocalToUtcIso(2026, 1, 31, 23, 59, 59),
      kst_label: "2026-01-31T23:59:59+09:00",
      kind: "kst_month_end",
    },
    {
      scenario_id: "TIME-KST-YEAR-END",
      invariant_id: "INV-TIME-01",
      journey_id: "J-TIME-MULTIDAY-01",
      persona_id: "KR-06",
      title: "KST 연말 경계",
      clock_as_of: kstLocalToUtcIso(2026, 12, 31, 23, 59, 59),
      kst_label: "2026-12-31T23:59:59+09:00",
      kind: "kst_year_end",
    },
    {
      scenario_id: "TIME-PLUS-30D",
      invariant_id: "INV-TIME-01",
      journey_id: "J-TIME-MULTIDAY-01",
      persona_id: "KR-06",
      title: "앵커 +30일 상태 진실",
      clock_as_of: addDaysUtcIso(anchor, 30),
      kst_label: "+30d from 2026-03-15T12:00:00+09:00",
      kind: "plus_30d",
    },
    {
      scenario_id: "TIME-PLUS-365D",
      invariant_id: "INV-TIME-01",
      journey_id: "J-TIME-MULTIDAY-01",
      persona_id: "KR-06",
      title: "앵커 +365일 상태 진실",
      clock_as_of: addDaysUtcIso(anchor, 365),
      kst_label: "+365d from 2026-03-15T12:00:00+09:00",
      kind: "plus_365d",
    },
    {
      scenario_id: "TIME-MULTI-DAY-LIFECYCLE",
      invariant_id: "INV-LIFECYCLE-01",
      journey_id: "J-TIME-MULTIDAY-01",
      persona_id: "KR-05",
      title: "다일 lifecycle (participate → +N일 → settle truth)",
      clock_as_of: addDaysUtcIso(anchor, 3),
      kst_label: "multi-day lifecycle +3d",
      kind: "multi_day_lifecycle",
    },
  ];

  // tiny = 대표 3 · full = 전수 (케이스 수 ≠ KPI)
  if (mode === "tiny") {
    return all.filter((s) =>
      [
        "TIME-KST-DAY-BOUNDARY",
        "TIME-PLUS-30D",
        "TIME-MULTI-DAY-LIFECYCLE",
      ].includes(s.scenario_id),
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
function runStatefulTimeLifecycle(opts) {
  const mode = opts.mode === "full" ? "full" : "tiny";
  const measuredAt = opts.measuredAt || new Date().toISOString();
  const seed = opts.seed ?? 20260812;
  const probe = probeClockHook();
  const scenariosDef = buildTimeScenarios({ mode });

  // run-qa4-clock.cjs (in-process booted Nest + isolated Postgres) may have
  // just produced fresh, non-canonical real-execution evidence for all
  // three canonical scenarios in this same job. Absence/staleness changes
  // nothing below (fixture never promoted to runtime PASS).
  const harnessProbe = probeQa4ClockHarness();
  const harnessData = harnessProbe.available ? harnessProbe.data : null;
  const harnessScenarioById = new Map(
    harnessData ? harnessData.scenarios.map((s) => [s.scenario_id, s]) : [],
  );

  /** @type {any[]} */
  const scenarios = [];
  let blocked = 0;
  let passed = 0;
  let failed = 0;

  for (const def of scenariosDef) {
    const dynamic = harnessScenarioById.get(def.scenario_id);
    if (dynamic && (dynamic.status === "PASS" || dynamic.status === "FAIL")) {
      if (dynamic.status === "PASS") passed += 1;
      else failed += 1;
      scenarios.push({
        ...def,
        status: dynamic.status,
        blocked_code: null,
        findings:
          dynamic.status === "PASS"
            ? [
                "Real execution via run-qa4-clock.cjs (in-process booted Nest + isolated Postgres, real domain services) — not a static/fixture result.",
              ]
            : dynamic.findings || [],
        rich_evidence: buildRichFailureEvidence({
          seed,
          suite_id: "QA4",
          invariant_id: def.invariant_id,
          clock_as_of: harnessData.measuredAt || measuredAt,
          baseline_id: opts.baseline_id,
          mode,
          request_sequence: [
            { step: "probe_clock_hook", result: "present", adapter: probe.adapter_rel },
            { step: "execute_scenario", result: "real_execution", source: "run-qa4-clock.cjs" },
          ],
          configuration_fingerprint: {
            suite: "QA4",
            mode,
            clock_hook_available: true,
            adapter_rel: probe.adapter_rel,
            dynamic: true,
          },
          sanitized_response: dynamic,
          error_message: dynamic.status === "FAIL" ? (dynamic.findings || []).join(" | ") : null,
        }),
      });
      continue;
    }

    if (!probe.available) {
      blocked += 1;
      const rich_evidence = buildRichFailureEvidence({
        seed,
        suite_id: "QA4",
        invariant_id: def.invariant_id,
        clock_as_of: def.clock_as_of,
        baseline_id: opts.baseline_id,
        mode,
        request_sequence: [
          {
            step: "probe_clock_hook",
            result: "absent",
            blocked_code: "BLOCKED_NO_CLOCK_HOOK",
          },
          {
            step: "scenario_planned",
            scenario_id: def.scenario_id,
            clock_as_of: def.clock_as_of,
            kst_label: def.kst_label,
            executed: false,
          },
        ],
        configuration_fingerprint: {
          suite: "QA4",
          mode,
          clock_hook_available: false,
        },
        sanitized_request: {
          scenario_id: def.scenario_id,
          kind: def.kind,
          kst_label: def.kst_label,
        },
        sanitized_response: {
          status: "BLOCKED",
          blocked_code: "BLOCKED_NO_CLOCK_HOOK",
          mock_pass_forbidden: true,
        },
      });

      scenarios.push({
        ...def,
        status: "BLOCKED",
        blocked_code: "BLOCKED_NO_CLOCK_HOOK",
        findings: [
          "Clock injection hook absent — scenario not executed (no mock PASS).",
          ...(probe.findings || []),
        ],
        rich_evidence,
      });
      continue;
    }

    // Hook 존재 시에도 제품 주입 어댑터가 없으면 실행 불가 — 현재는 probe.available만 허용.
    // 제품 mutation 0: 어댑터 실연동은 hook 모듈이 harness adapter를 제공할 때만.
    failed += 1;
    scenarios.push({
      ...def,
      status: "FAIL",
      blocked_code: null,
      findings: [
        "Clock hook module present but harness multi-day executor not wired in this slice — record as FAIL (not laundry PASS).",
      ],
      rich_evidence: buildRichFailureEvidence({
        seed,
        clock_as_of: def.clock_as_of,
        baseline_id: opts.baseline_id,
        request_sequence: [
          { step: "probe_clock_hook", result: "present", adapter: probe.adapter_rel },
          { step: "execute_scenario", result: "not_wired" },
        ],
        configuration_fingerprint: {
          suite: "QA4",
          mode,
          clock_hook_available: true,
          adapter_rel: probe.adapter_rel,
        },
      }),
    });
  }

  const criticalDetails = [];
  const timeScenarios = scenarios.filter((s) => s.invariant_id === "INV-TIME-01");
  const lifecycleScenarios = scenarios.filter(
    (s) => s.invariant_id === "INV-LIFECYCLE-01",
  );

  const summarizeInv = (invariant_id, list, critical) => {
    const hasBlocked = list.some((s) => s.status === "BLOCKED");
    const hasFail = list.some((s) => s.status === "FAIL");
    let status = "PASS";
    let blocked_code = null;
    if (hasFail) status = "FAIL";
    else if (hasBlocked) {
      status = "BLOCKED";
      blocked_code = "BLOCKED_NO_CLOCK_HOOK";
    }
    criticalDetails.push({
      invariant_id,
      critical,
      status,
      blocked_code,
      scenario_ids: list.map((s) => s.scenario_id),
    });
    return status;
  };

  summarizeInv("INV-TIME-01", timeScenarios, true);
  if (lifecycleScenarios.length) {
    summarizeInv("INV-LIFECYCLE-01", lifecycleScenarios, true);
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

  // suite observational status: BLOCKED (hook 부재) | FAIL | PASS
  let status = "PASS";
  if (failed > 0) status = "FAIL";
  else if (blocked > 0) status = "BLOCKED";

  return {
    check_id: "QA4_STATEFUL_TIME_LIFECYCLE",
    status,
    mode,
    measuredAt,
    seed,
    clock_hook: {
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
    scenarioCount: scenarios.length,
    passed,
    failed,
    blocked,
    scenarios,
    critical_invariant,
    mock_pass_forbidden: true,
    notes: [
      "KST = Asia/Seoul fixed +09:00.",
      "BLOCKED ≠ defect · critical BLOCKED → ENGINE_QA_INCOMPLETE.",
      "Product mutation 0 — no clock hook invented in services/**.",
    ],
  };
}

module.exports = {
  runStatefulTimeLifecycle,
  buildTimeScenarios,
  kstLocalToUtcIso,
  addDaysUtcIso,
};
