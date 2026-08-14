/**
 * QA8 dynamic adversarial evidence reader — harness only · 제품 mutation 0.
 *
 * `run-qa8-adversarial.cjs`는 실제 booted Nest + isolated Postgres로 admin
 * boundary / operator spoofing / user isolation / privacy-delete adversarial
 * case를 실행하고 `qa8-adversarial.v1.json`을 남긴다. 이 모듈은 그 파일이
 * (같은 CI job 안에서) 신선하게 존재할 때만 canonical QA8의
 * SEC-DYNAMIC-ADVERSARIAL-01 시나리오가 그 결과를 소비하게 한다.
 *
 * fixture 결과를 runtime result처럼 쓰지 않는다: harness가 안 돌았으면
 * BLOCKED_ENV_CAPABILITY 그대로 — 이 모듈은 evidence 존재+신선도만 검증한다.
 */
"use strict";

const fs = require("node:fs");
const path = require("node:path");
const { ROOT } = require("./hash-scope.cjs");

const DEFAULT_MAX_AGE_MS = 6 * 60 * 60 * 1000; // 6h — same-CI-job freshness window

function harnessOutDir() {
  return (
    process.env.AIPO_QA_HARNESS_OUT || path.join(ROOT, "_tmp_qa_harness", "qa8-adversarial")
  );
}

function relFromRoot(abs) {
  return path.relative(ROOT, abs).split(path.sep).join("/");
}

/**
 * @param {{ maxAgeMs?: number, dir?: string }} [opts]
 */
function probeQa8AdversarialHarness(opts = {}) {
  const dir = opts.dir || harnessOutDir();
  const file = path.join(dir, "qa8-adversarial.v1.json");
  const probed_path = relFromRoot(file);

  if (!fs.existsSync(file)) {
    return { available: false, reason: "no_harness_evidence_file", probed_path };
  }

  let data;
  try {
    data = JSON.parse(fs.readFileSync(file, "utf8"));
  } catch (e) {
    return {
      available: false,
      reason: `harness_evidence_unreadable: ${e.message}`,
      probed_path,
    };
  }

  if (data.schema !== "harness.qa8-adversarial.v1") {
    return { available: false, reason: "harness_evidence_schema_mismatch", probed_path };
  }
  if (data.non_canonical !== true || data.does_not_replace_qa8_result !== true) {
    return { available: false, reason: "harness_evidence_missing_non_canonical_markers", probed_path };
  }

  const maxAgeMs = opts.maxAgeMs || DEFAULT_MAX_AGE_MS;
  const measuredAtMs = Date.parse(data.measuredAt || "");
  const ageMs = Number.isFinite(measuredAtMs) ? Date.now() - measuredAtMs : Infinity;
  if (!(ageMs <= maxAgeMs)) {
    return {
      available: false,
      reason: `harness_evidence_stale age_ms=${ageMs}`,
      probed_path,
      stale: true,
    };
  }

  if (data.harness_status !== "PASS") {
    return {
      available: false,
      reason: `harness_status=${data.harness_status} (not a validation failure)`,
      probed_path,
      harness_failed: true,
      data,
    };
  }

  return { available: true, probed_path, age_ms: ageMs, data };
}

module.exports = { probeQa8AdversarialHarness, harnessOutDir, DEFAULT_MAX_AGE_MS };
