/**
 * QA2 — Dirty Path 비중 > Happy Path (매핑 개수 비교 · KPI 목표치 금지)
 */
"use strict";

function runDirtyPathBias(resolvedMappings) {
  const findings = [];
  const list = Array.isArray(resolvedMappings) ? resolvedMappings : [];
  let dirty = 0;
  let happy = 0;
  for (const m of list) {
    if (m.journey_kind === "dirty") dirty += 1;
    else if (m.journey_kind === "happy") happy += 1;
    else findings.push(`${m.coverage_id}: journey_kind missing/unknown`);
  }

  if (!(dirty > happy)) {
    findings.push(
      `Dirty Path bias required: dirty(${dirty}) must be > happy(${happy}) for QA2 mappings`,
    );
  }

  return {
    check_id: "QA2_DIRTY_PATH_BIAS",
    status: findings.length ? "FAIL" : "PASS",
    dirty,
    happy,
    rule: "dirty > happy",
    kpi_note: "counts are observational bias only — not a KPI/SLA target",
    findings,
  };
}

module.exports = { runDirtyPathBias };
