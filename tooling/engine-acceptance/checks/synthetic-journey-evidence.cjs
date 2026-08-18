/**
 * QA2 — seed + RNG + clock_as_of + request_sequence evidence
 * seed 단독 금지 · live destructive HTTP 0 (합성 sanitized 시퀀스)
 */
"use strict";

const crypto = require("node:crypto");
const {
  RNG_VERSION,
  createSeededRng,
  seedFromString,
} = require("../lib/seeded-rng.cjs");

const STEP_TO_HTTP = {
  signup: { method: "POST", path: "/api/v1/auth/signup" },
  profile: { method: "GET", path: "/api/v1/me/profile" },
  feed: { method: "GET", path: "/api/v1/opportunities/feed" },
  participate: { method: "POST", path: "/api/v1/opportunities/:id/participate" },
  "execute-tick*": { method: "POST", path: "/api/v1/trades/execute-tick" },
  peotteok: { method: "POST", path: "/api/v1/me/peotteok/chat" },
  save: { method: "PUT", path: "/api/v1/me/preferences" },
  reconnect: { method: "GET", path: "/api/v1/me/home-read" },
  mutate: { method: "PATCH", path: "/api/v1/me/profile" },
  "delete-account": { method: "POST", path: "/api/v1/me/delete-account" },
  timeout: { method: "SYNTH", path: "(timeout-after-participate)" },
  "retry-same-idempotency-key": {
    method: "POST",
    path: "/api/v1/opportunities/:id/participate",
    note: "same Idempotency-Key",
  },
  "userA-action": { method: "GET", path: "/api/v1/me/home-read", actor: "A" },
  "userB-interleave": { method: "GET", path: "/api/v1/wallet/buckets", actor: "B" },
  "token-cross": {
    method: "GET",
    path: "/api/v1/wallet/buckets",
    actor: "A-token-on-B",
    expect: "deny",
  },
  "object-id-swap": {
    method: "GET",
    path: "/api/v1/inbox/:objectId",
    actor: "B-with-A-objectId",
    expect: "deny",
  },
  "userA-auth": { method: "POST", path: "/api/v1/auth/login", actor: "A" },
  "userB-auth": { method: "POST", path: "/api/v1/auth/login", actor: "B" },
  "use-A-token-on-B-resource": {
    method: "GET",
    path: "/api/v1/me/home-money-read",
    actor: "A-token",
    expect: "session-bound-only",
  },
  "expect-deny": { method: "ASSERT", path: "(expect-deny-or-empty)" },
  "userA-object": { method: "GET", path: "/api/v1/inbox/:id", actor: "A" },
  "userB-swap-object-id": {
    method: "GET",
    path: "/api/v1/inbox/:idA",
    actor: "B",
    expect: "deny",
  },
  "same-key": { method: "POST", path: "/api/v1/ledger/journals", note: "idempotencyKey" },
  "conflicting-payload": {
    method: "POST",
    path: "/api/v1/ledger/journals",
    note: "same key different payload",
  },
  "expect-explicit-reject": { method: "ASSERT", path: "(409 IDEMPOTENCY_KEY_CONFLICT)" },
};

function buildRequestSequence(steps, rng) {
  const seq = [];
  let i = 0;
  for (const step of steps) {
    const tmpl = STEP_TO_HTTP[step] || {
      method: "SYNTH",
      path: `(unmapped-step:${step})`,
    };
    const nonce = Math.floor(rng() * 1e9);
    seq.push({
      seq: i,
      step,
      method: tmpl.method,
      path: tmpl.path,
      actor: tmpl.actor || null,
      expect: tmpl.expect || null,
      note: tmpl.note || null,
      sanitized: {
        authorization: "[REDACTED]",
        idempotencyKey: tmpl.note ? `qa-synth-key-${nonce}` : null,
        body: null,
      },
    });
    i += 1;
  }
  return seq;
}

/**
 * @param {object[]} resolvedMappings coverage-mapping resolved
 * @param {{ baseline_id: string, mode: 'tiny'|'full', measuredAt: string, synthetic_ns: string }} opts
 */
function runSyntheticJourneyEvidence(resolvedMappings, opts) {
  const findings = [];
  const list = Array.isArray(resolvedMappings) ? resolvedMappings : [];
  let selected = list;

  if (opts.mode === "tiny") {
    // 로컬 tiny smoke: Dirty 우선 소수만 (KPI 목표치 아님)
    const dirty = list.filter((m) => m.journey_kind === "dirty");
    const happy = list.filter((m) => m.journey_kind === "happy");
    selected = [...dirty.slice(0, 3), ...happy.slice(0, 1)];
    if (selected.length < 1) {
      findings.push("tiny smoke selected 0 mappings");
    }
  }

  const cases = [];
  for (const m of selected) {
    const seedMaterial = [
      opts.baseline_id,
      m.coverage_id,
      m.persona_id,
      m.journey_id,
      m.invariant_id,
      m.attack_face || "",
      opts.synthetic_ns,
    ].join("|");
    const seed = seedFromString(seedMaterial);
    const rng = createSeededRng(seed);
    const clock_as_of = opts.measuredAt;
    const request_sequence = buildRequestSequence(m.steps, rng);

    if (!request_sequence.length) {
      findings.push(`${m.coverage_id}: empty request_sequence`);
    }

    const caseEv = {
      coverage_id: m.coverage_id,
      persona_id: m.persona_id,
      journey_id: m.journey_id,
      invariant_id: m.invariant_id,
      attack_face: m.attack_face,
      seed,
      rng_version: RNG_VERSION,
      clock_as_of,
      clock_source: "wall_clock_iso",
      request_sequence,
      baseline_id: opts.baseline_id,
      model_identifier: null,
      configuration_fingerprint: crypto
        .createHash("sha256")
        .update(`${seedMaterial}|${RNG_VERSION}`)
        .digest("hex")
        .slice(0, 32),
      live_http: false,
      product_mutation: 0,
    };

    // seed 단독 금지 — 필수 동반 필드
    for (const k of ["seed", "rng_version", "clock_as_of", "request_sequence"]) {
      if (caseEv[k] === undefined || caseEv[k] === null) {
        findings.push(`${m.coverage_id}: missing evidence field ${k}`);
      }
    }
    cases.push(caseEv);
  }

  return {
    check_id: "QA2_SYNTHETIC_JOURNEY_EVIDENCE",
    status: findings.length ? "FAIL" : "PASS",
    mode: opts.mode,
    selectedCount: cases.length,
    mappingPoolCount: list.length,
    kpi_note: "selectedCount is not a KPI — observational only",
    evidence_required_fields: ["seed", "rng_version", "clock_as_of", "request_sequence"],
    findings,
    cases,
  };
}

module.exports = { runSyntheticJourneyEvidence, buildRequestSequence, STEP_TO_HTTP };
