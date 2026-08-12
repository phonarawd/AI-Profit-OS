/**
 * QA2 — personas × journeys × coverage 해석 검증
 * KPI 숫자(케이스 목표치)로 PASS/FAIL 금지
 */
"use strict";

const { readJson } = require("../lib/hash-scope.cjs");

function runCoverageMapping(suiteId = "QA2") {
  const findings = [];
  const personas = readJson("governance/engine-acceptance/personas.v1.json");
  const journeys = readJson("governance/engine-acceptance/journeys.v1.json");
  const coverage = readJson("governance/engine-acceptance/coverage.v1.json");

  if (coverage.kpi_forbidden !== true) {
    findings.push("coverage.kpi_forbidden must be true (케이스 개수 KPI 금지)");
  }
  for (const forbidden of ["kpi_case_count", "case_count_sla", "target_cases", "kpi_target"]) {
    if (coverage[forbidden] !== undefined) {
      findings.push(`coverage must not define KPI field: ${forbidden}`);
    }
  }

  const personaIds = new Set((personas.personas || []).map((p) => p.id));
  const journeyById = new Map((journeys.journeys || []).map((j) => [j.id, j]));
  const mappings = (coverage.mappings || []).filter((m) =>
    (m.suite_ids || []).includes(suiteId),
  );

  if (mappings.length < 1) {
    findings.push(`no coverage mappings for suite ${suiteId}`);
  }

  const resolved = [];
  for (const m of mappings) {
    if (!personaIds.has(m.persona_id)) {
      findings.push(`${m.id}: unknown persona_id ${m.persona_id}`);
    }
    const journey = journeyById.get(m.journey_id);
    if (!journey) {
      findings.push(`${m.id}: unknown journey_id ${m.journey_id}`);
    }
    if (!m.invariant_id) {
      findings.push(`${m.id}: invariant_id required`);
    }
    if (m.critical !== true && m.critical !== false) {
      findings.push(`${m.id}: critical must be boolean`);
    }
    resolved.push({
      coverage_id: m.id,
      persona_id: m.persona_id,
      journey_id: m.journey_id,
      invariant_id: m.invariant_id,
      critical: m.critical === true,
      attack_face: m.attack_face || null,
      journey_kind: journey ? journey.kind : null,
      steps: journey ? journey.steps || [] : [],
    });
  }

  // isolation 공격면 최소 집합 (interleave / token_cross / object_id_swap)
  const isolationFaces = new Set(
    resolved
      .filter((r) => r.invariant_id === "INV-ISOLATION-01")
      .map((r) => r.attack_face)
      .filter(Boolean),
  );
  for (const face of ["interleave", "token_cross", "object_id_swap"]) {
    if (!isolationFaces.has(face)) {
      findings.push(`QA2 INV-ISOLATION-01 missing attack_face mapping: ${face}`);
    }
  }

  return {
    check_id: "QA2_COVERAGE_MAPPING",
    status: findings.length ? "FAIL" : "PASS",
    suite_id: suiteId,
    mappingCount: resolved.length,
    kpi_forbidden: coverage.kpi_forbidden === true,
    findings,
    resolved,
  };
}

module.exports = { runCoverageMapping };
