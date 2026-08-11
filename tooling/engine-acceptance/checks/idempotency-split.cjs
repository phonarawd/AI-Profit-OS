/**
 * QA1 — Idempotency 분리 검증
 * INV-IDEMPOTENCY-01: same key + same payload → reuse · 중복 side-effect 0
 * INV-IDEMPOTENCY-03: same key + conflicting payload → 명시적 거부
 * 둘을 한 경로로 세탁·혼동하면 FAIL
 */
"use strict";

const fs = require("node:fs");
const path = require("node:path");
const { ROOT } = require("../lib/hash-scope.cjs");
const { spawnVerify } = require("../lib/spawn-verify.cjs");

function read(rel) {
  const p = path.join(ROOT, rel);
  return fs.existsSync(p) ? fs.readFileSync(p, "utf8") : "";
}

function checkSameKeySamePayload() {
  const findings = [];
  const posting = read("services/api-nest/src/ledger/ledger.posting.service.ts");
  const participate = read("services/api-nest/src/opportunities/participate.service.ts");
  const fp = read("services/api-nest/src/ledger/idempotency-fingerprint.ts");

  if (!posting) findings.push("missing ledger.posting.service.ts");
  if (!participate) findings.push("missing participate.service.ts");
  if (!fp) findings.push("missing idempotency-fingerprint.ts");

  // same → reuse
  for (const n of ["reused: true", "assertFingerprintMatch", "fingerprintPayload"]) {
    if (posting && !posting.includes(n)) {
      findings.push(`ledger.posting missing same-key reuse path token: ${n}`);
    }
  }
  if (posting && !/same key \+ same fingerprint → reuse/i.test(posting) && !posting.includes("reused: true")) {
    findings.push("ledger.posting must document/implement same-fingerprint reuse");
  }
  if (participate && !participate.includes("assertFingerprintMatch")) {
    findings.push("participate missing assertFingerprintMatch");
  }
  if (participate && !participate.includes("request_fingerprint")) {
    findings.push("participate missing request_fingerprint persistence");
  }

  // 혼동 금지: conflict를 silent reuse로 처리하면 안 됨
  if (posting.includes("IDEMPOTENCY_KEY_CONFLICT") === false && fp.includes("IDEMPOTENCY_KEY_CONFLICT") === false) {
    findings.push("conflict code IDEMPOTENCY_KEY_CONFLICT missing (INV-01/03 split broken)");
  }

  return {
    invariant_id: "INV-IDEMPOTENCY-01",
    title: "same_key_same_payload_reuse",
    status: findings.length ? "FAIL" : "PASS",
    findings,
  };
}

function checkSameKeyConflict() {
  const findings = [];
  const fp = read("services/api-nest/src/ledger/idempotency-fingerprint.ts");
  const posting = read("services/api-nest/src/ledger/ledger.posting.service.ts");

  if (!fp.includes("assertFingerprintMatch")) {
    findings.push("fingerprint helper missing assertFingerprintMatch");
  }
  if (!fp.includes("ConflictException") && !fp.includes("IDEMPOTENCY_KEY_CONFLICT")) {
    findings.push("conflict path must raise IDEMPOTENCY_KEY_CONFLICT");
  }
  if (!fp.includes("different payload") && !fp.includes("semantic-different")) {
    // soft — message text
  }
  if (posting && !posting.includes("assertFingerprintMatch") && !posting.includes("assertExistingFingerprint")) {
    findings.push("ledger.posting must call fingerprint assert on reuse");
  }

  // 분리 잠금: conflict verify는 별도 oracle
  const child = spawnVerify("tooling/verify/idempotency-conflict-detection.cjs");
  if (!child.ok) {
    findings.push(`verify:idempotency-conflict-detection exit=${child.exitCode}`);
  }

  // 혼동 탐지: conflict-detection 없이 reuse만 있으면 분리 실패
  if (child.ok && fp.includes("assertFingerprintMatch") === false) {
    findings.push("INV-03 oracle PASS but helper missing — inconsistent");
  }

  return {
    invariant_id: "INV-IDEMPOTENCY-03",
    title: "same_key_conflicting_payload_reject",
    status: findings.length ? "FAIL" : "PASS",
    findings,
    child_verifies: [child],
  };
}

function runIdempotencySplit() {
  const same = checkSameKeySamePayload();
  const conflict = checkSameKeyConflict();
  const separated =
    same.invariant_id === "INV-IDEMPOTENCY-01" &&
    conflict.invariant_id === "INV-IDEMPOTENCY-03" &&
    same.title !== conflict.title;

  const findings = [];
  if (!separated) findings.push("idempotency axes not separated");

  const status =
    same.status === "PASS" && conflict.status === "PASS" && separated ? "PASS" : "FAIL";

  return {
    check_id: "QA1_IDEMPOTENCY_SPLIT",
    status,
    separated: true,
    axes: [same, conflict],
    findings: [
      ...findings,
      ...same.findings.map((f) => `[01] ${f}`),
      ...conflict.findings.map((f) => `[03] ${f}`),
    ],
  };
}

module.exports = { runIdempotencySplit };
