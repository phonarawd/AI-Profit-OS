/**
 * verify:engine-acceptance — QA-0..QA-8 scope (full ACCEPTED 판정 금지)
 *
 * 검증:
 * 1) Acceptance Contract L1~L6 산출물 실재
 * 2) severity-policy 선고정 문서
 * 3) protected-scope hash 규칙 deterministic
 * 4) baseline Dual Dirty + required fields · valid↔protected_scope_clean
 * 5) kill-switch가 tiny smoke / QA1..QA8보다 먼저 작동
 * 6) evidence-manifest · REPORT · verdict ≠ ENGINE_ACCEPTED_FOR_UI
 * 7) QA-1..QA-6 COMPLETE 유지 — 단 ENGINE_ACCEPTANCE_REBASE_V1 pending rerun이면 STALE 허용
 * 8) QA-3: fast-check properties · CI fail-fast:false · concurrency
 * 9) QA-4: multi-day + KST · BLOCKED_NO_CLOCK_HOOK 정식 · critical → ACCEPTED 불가
 * 10) QA-5: Failure World 축1/축2 · BLOCKED_NO_FAULT_HOOK · always() aggregator
 * 11) QA-6: k6 scenario mix + threshold 메커니즘 · UNSPECIFIED_PERF_BUDGET ·
 *     CI only heavy · aggregator 증거 · product mutation 0
 * 12) QA-7: formal Actions evidence · qa7-result.v1.json · next=QA8
 * 13) QA-8: ASVS 5.0.0 subset · qa8-result.v1.json · admin-boundary/privacy
 *     defects recorded (not repaired) · next=QA9 · ENGINE_ACCEPTED_FOR_UI 발급 금지
 */
"use strict";

const fs = require("node:fs");
const path = require("node:path");
const {
  evaluateKillSwitch,
} = require("../engine-acceptance/kill-switch.cjs");
const { runTinySmoke } = require("../engine-acceptance/tiny-smoke.cjs");
const {
  ROOT,
  readJson,
  buildManifest,
  dualDirty,
  hashPathList,
  git,
} = require("../engine-acceptance/lib/hash-scope.cjs");

const {
  DECISION_ID,
  LEDGER_REL,
  loadLedger,
  verifyGovernanceAgainstBaseline,
  assertRunnersForbidSilentWorkflowSync,
} = require("../engine-acceptance/lib/workflow-amendment.cjs");
const { run: selftestWorkflowAmendment } = require("../engine-acceptance/selftest-workflow-amendment.cjs");
const {
  DECISION_ID: REBASE_DECISION_ID,
  LEDGER_REL: REBASE_LEDGER_REL,
  loadRebaseLedger,
  isPendingRerun,
  isCurrentEpochPreQa7Checkpoint,
  verifyCurrentEpochPreQa7Checkpoint,
  verifyPendingRerunEpoch,
  verifyRebaseLedgerAgainstBaseline,
  assertNoInPlaceHashRewrite,
  findBridgingAmendment,
  CURRENT_EPOCH_REBASE_SNAPSHOT,
} = require("../engine-acceptance/lib/product-rebase.cjs");
const { run: selftestProductRebase } = require("../engine-acceptance/selftest-product-rebase.cjs");
const { loadEvalDataset } = require("../engine-acceptance/lib/qa7-dataset.cjs");

const fails = [];
function fail(msg) {
  fails.push(msg);
}

function gitShowHead(rel) {
  try {
    return git(`git show HEAD:${rel}`).replace(/\r\n/g, "\n").trim();
  } catch {
    return null;
  }
}

function liveFileText(rel) {
  const abs = path.join(ROOT, rel);
  if (!fs.existsSync(abs)) return null;
  return fs.readFileSync(abs, "utf8").replace(/\r\n/g, "\n").trim();
}

/**
 * CI QA6 job runs run-qa6.cjs then verify. run-qa6 rewrites evidence/REPORT
 * in the runner workspace only. Committed QA7 publication must still be
 * required when the working tree matches HEAD.
 */
function isEphemeralQa6Rewrite(evidenceObj, qa7File) {
  // Scoped to an ACTUAL QA6 rewrite (qa_phase set by run-qa6.cjs itself) —
  // without this, any earlier suite's rewrite that also resets QA7 to
  // NOT_STARTED (e.g. a real QA4/QA5/QA8 CI-heavy rerun) would be
  // misclassified as "QA6" just because it shares the same QA7-reset
  // symptom, and would then be checked against QA6-specific expectations
  // (qa_phase=QA-6, next=QA7_AI_EVAL) that do not apply to it.
  if (evidenceObj.qa_phase !== "QA-6") return false;
  if (
    !qa7File ||
    qa7File.formal_actions_evidence !== true ||
    qa7File.completion_status !== "COMPLETE"
  ) {
    return false;
  }
  const qa7 = (evidenceObj.suites || []).find((s) => s.suite_id === "QA7");
  if (qa7 && qa7.completion_status === "COMPLETE") return false;
  const rel = `${GOV}/evidence-manifest.v1.json`;
  const head = gitShowHead(rel);
  const live = liveFileText(rel);
  if (head == null || live == null) return false;
  return head !== live;
}

/**
 * QA8's own CI matrix job runs run-qa8.cjs then verify:engine-acceptance in
 * the same isolated job workspace. run-qa8.cjs's evidence.suites mapping
 * PRESERVES any suite entry it does not own (unlike run-qa6.cjs's generic
 * fallthrough, which resets unknown entries to NOT_STARTED) - but it always
 * hardcodes evidence.qa_phase="QA-8" / evidence.next="QA9_ACCEPTANCE_REPORT"
 * and regenerates ENGINE_ACCEPTANCE_REPORT.md in the QA8-era shape, because
 * it predates QA9 and has no knowledge of it. Detect this generically (any
 * QA<N> runner that predates a later-committed QA9) by comparing live vs the
 * last real commit: if HEAD already reached qa_phase=QA-9 but the just
 * rewritten live copy regressed, this is that ephemeral rewrite, not real
 * drift - qa9-result.v1.json itself (never touched by run-qa8.cjs) still
 * proves QA9 COMPLETE.
 */
function isEphemeralPreQa9Rewrite(evidenceObj, qa9File) {
  if (!qa9File || qa9File.completion_status !== "COMPLETE") return false;
  if (evidenceObj.qa_phase === "QA-9") return false;
  const rel = `${GOV}/evidence-manifest.v1.json`;
  const head = gitShowHead(rel);
  const live = liveFileText(rel);
  if (head == null || live == null || head === live) return false;
  let headObj = null;
  try {
    headObj = JSON.parse(head);
  } catch {
    return false;
  }
  return headObj.qa_phase === "QA-9";
}

function peekGovJson(name) {
  try {
    return readJson(`${GOV}/${name}`);
  } catch {
    return null;
  }
}

function buildPreQa7CheckpointCtx(baselineObj, evidenceObj, rebaseObj, defectsObj, scopeObj) {
  let amend = null;
  try {
    amend = readJson(`${GOV}/workflow-amendments.v1.json`);
  } catch {
    amend = null;
  }
  const liveWf =
    scopeObj && scopeObj.aggregateHashes && scopeObj.aggregateHashes.acceptance_workflow_hash
      ? hashPathList(scopeObj.aggregateHashes.acceptance_workflow_hash, scopeObj)
      : null;
  const qa7Rel = `${GOV}/qa7-result.v1.json`;
  const qa8Rel = `${GOV}/qa8-result.v1.json`;
  const qa9Rel = `${GOV}/qa9-result.v1.json`;
  let dirtyAll = [];
  if (scopeObj) {
    try {
      dirtyAll = dualDirty(scopeObj).dirtyPathsAll || [];
    } catch {
      dirtyAll = [];
    }
  }
  return {
    baseline: baselineObj,
    evidence: evidenceObj,
    rebaseLedger: rebaseObj,
    amendmentLedger: amend,
    defects: defectsObj,
    results: {
      QA1: peekGovJson("qa1-result.v1.json"),
      QA2: peekGovJson("qa2-result.v1.json"),
      QA3: peekGovJson("qa3-result.v1.json"),
      QA4: peekGovJson("qa4-result.v1.json"),
      QA5: peekGovJson("qa5-result.v1.json"),
      QA6: peekGovJson("qa6-result.v1.json"),
      QA7: peekGovJson("qa7-result.v1.json"),
      QA8: peekGovJson("qa8-result.v1.json"),
      QA9: peekGovJson("qa9-result.v1.json"),
    },
    liveWorkflowHash: liveWf,
    headQa7Bytes: gitShowHead(qa7Rel),
    liveQa7Bytes: liveFileText(qa7Rel),
    qa7ResultDirty: dirtyAll.includes(qa7Rel),
    headQa8Bytes: gitShowHead(qa8Rel),
    liveQa8Bytes: liveFileText(qa8Rel),
    qa8ResultDirty: dirtyAll.includes(qa8Rel),
    headQa9Bytes: gitShowHead(qa9Rel),
    liveQa9Bytes: liveFileText(qa9Rel),
    qa9ResultDirty: dirtyAll.includes(qa9Rel),
  };
}

function isCurrentEpochPostQa7PreQa8Checkpoint(evidenceObj) {
  return Boolean(
    evidenceObj &&
      evidenceObj.qa_phase === "QA-7" &&
      evidenceObj.next === "QA8_SECURITY_PRIVACY",
  );
}

function verifyCurrentEpochPostQa7PreQa8Checkpoint(
  evidenceObj,
  baselineObj,
  qa7File,
  defectsObj,
  failFn,
) {
  const suites = (evidenceObj && evidenceObj.suites) || [];
  const qa7 = suites.find((s) => s.suite_id === "QA7");
  const qa8 = suites.find((s) => s.suite_id === "QA8");
  const qa9 = suites.find((s) => s.suite_id === "QA9");
  const epoch = evidenceObj && evidenceObj.current_epoch;
  const p0 = (defectsObj && defectsObj.counts && defectsObj.counts.P0) || 0;
  const p1 = (defectsObj && defectsObj.counts && defectsObj.counts.P1) || 0;

  if (!baselineObj || baselineObj.valid !== true) {
    failFn("post-QA7 checkpoint requires baseline.valid=true");
  }
  if (!evidenceObj || evidenceObj.qa_phase !== "QA-7") {
    failFn("post-QA7 checkpoint requires evidence.qa_phase=QA-7");
  }
  if (!evidenceObj || evidenceObj.next !== "QA8_SECURITY_PRIVACY") {
    failFn("post-QA7 checkpoint requires evidence.next=QA8_SECURITY_PRIVACY");
  }
  if (!evidenceObj || evidenceObj.verdict !== "ENGINE_QA_INCOMPLETE") {
    failFn("post-QA7 checkpoint requires verdict=ENGINE_QA_INCOMPLETE");
  }
  if (!evidenceObj || evidenceObj.evidence_integrity !== "VALID") {
    failFn("post-QA7 checkpoint requires evidence_integrity=VALID");
  }
  if (p0 !== 0 || p1 !== 0) {
    failFn(`post-QA7 checkpoint publisher requires defects.P0/P1=0/0 (got ${p0}/${p1})`);
  }
  if (
    evidenceObj &&
    evidenceObj.engine_accepted_for_ui != null &&
    evidenceObj.engine_accepted_for_ui !== "NOT_ISSUED"
  ) {
    failFn("post-QA7 checkpoint must not issue ENGINE_ACCEPTED_FOR_UI");
  }
  if (
    evidenceObj &&
    evidenceObj.ui_ux_entry_gate != null &&
    evidenceObj.ui_ux_entry_gate !== "CLOSED"
  ) {
    failFn("post-QA7 checkpoint UI gate must remain CLOSED");
  }

  if (!qa7 || qa7.completion_status !== "COMPLETE") {
    failFn("post-QA7 checkpoint requires QA7 COMPLETE");
  } else {
    if (!qa7.run_id || !qa7.checksum) {
      failFn("post-QA7 checkpoint QA7 requires run_id + checksum");
    }
    if (qa7.formal_actions_evidence !== true) {
      failFn("post-QA7 checkpoint QA7 requires formal_actions_evidence=true");
    }
    if (baselineObj && qa7.baseline_id !== baselineObj.id) {
      failFn("post-QA7 checkpoint QA7 baseline_id must match current baseline");
    }
  }

  if (!qa7File) {
    failFn("post-QA7 checkpoint requires qa7-result.v1.json");
  } else {
    if (
      qa7File.completion_status !== "COMPLETE" ||
      qa7File.qa7_completion_status !== "COMPLETE"
    ) {
      failFn("post-QA7 checkpoint qa7-result completion fields must be COMPLETE");
    }
    if (
      qa7File.formal_actions_evidence !== true ||
      qa7File.local_validation_only !== false
    ) {
      failFn("post-QA7 checkpoint qa7-result must be formal Actions evidence");
    }
    if (qa7File.suite_status !== "PASS") {
      failFn("post-QA7 checkpoint qa7-result.suite_status must be PASS");
    }
    if (baselineObj && qa7File.baseline_id !== baselineObj.id) {
      failFn("post-QA7 checkpoint qa7-result baseline_id must match current baseline");
    }
    if (qa7 && String(qa7.run_id) !== String(qa7File.run_id)) {
      failFn("post-QA7 checkpoint QA7 run_id must match qa7-result");
    }
    if (qa7 && qa7.checksum !== qa7File.checksum) {
      failFn("post-QA7 checkpoint QA7 checksum must match qa7-result");
    }
  }

  if (!qa8 || qa8.completion_status !== "NOT_STARTED") {
    failFn("post-QA7 checkpoint requires current QA8 NOT_STARTED");
  } else {
    if (baselineObj && qa8.baseline_id !== baselineObj.id) {
      failFn("post-QA7 checkpoint QA8 baseline_id must match current baseline");
    }
    if (qa8.run_id !== null || qa8.checksum !== null) {
      failFn("post-QA7 checkpoint QA8 run_id/checksum must remain null");
    }
  }

  if (!qa9 || qa9.completion_status !== "NOT_STARTED") {
    failFn("post-QA7 checkpoint requires current QA9 NOT_STARTED");
  } else {
    if (baselineObj && qa9.baseline_id !== baselineObj.id) {
      failFn("post-QA7 checkpoint QA9 baseline_id must match current baseline");
    }
    if (qa9.run_id !== null || qa9.checksum !== null) {
      failFn("post-QA7 checkpoint QA9 run_id/checksum must remain null");
    }
    if (qa9.current_epoch_authoritative !== false) {
      failFn("post-QA7 checkpoint QA9 must remain non-authoritative for current epoch");
    }
  }

  if (!epoch) {
    failFn("post-QA7 checkpoint requires current_epoch rebase snapshot");
  } else {
    for (const [key, expected] of Object.entries(CURRENT_EPOCH_REBASE_SNAPSHOT)) {
      if (epoch[key] !== expected) {
        failFn(
          `post-QA7 checkpoint current_epoch.${key} must remain rebase snapshot ${expected}`,
        );
      }
    }
  }
  if (!evidenceObj.kill_switch || evidenceObj.kill_switch.verified_before_qa7 !== true) {
    failFn("post-QA7 checkpoint requires kill_switch.verified_before_qa7=true");
  }
}

function isCurrentEpochPostQa8PreQa9Checkpoint(evidenceObj) {
  return Boolean(
    evidenceObj &&
      evidenceObj.qa_phase === "QA-8" &&
      evidenceObj.next === "QA9_ACCEPTANCE_REPORT",
  );
}

function verifyCurrentEpochPostQa8PreQa9Checkpoint(
  evidenceObj,
  baselineObj,
  qa7File,
  qa8File,
  defectsObj,
  failFn,
) {
  const suites = (evidenceObj && evidenceObj.suites) || [];
  const qa7 = suites.find((x) => x.suite_id === "QA7");
  const qa8 = suites.find((x) => x.suite_id === "QA8");
  const qa9 = suites.find((x) => x.suite_id === "QA9");
  const epoch = evidenceObj && evidenceObj.current_epoch;
  const p0 = (defectsObj && defectsObj.counts && defectsObj.counts.P0) || 0;
  const p1 = (defectsObj && defectsObj.counts && defectsObj.counts.P1) || 0;
  const expectedVerdict = p0 + p1 > 0 ? "ENGINE_NOT_ACCEPTED" : "ENGINE_QA_INCOMPLETE";

  if (!baselineObj || baselineObj.valid !== true) failFn("post-QA8 checkpoint requires baseline.valid=true");
  if (!evidenceObj || evidenceObj.qa_phase !== "QA-8") failFn("post-QA8 checkpoint requires evidence.qa_phase=QA-8");
  if (!evidenceObj || evidenceObj.next !== "QA9_ACCEPTANCE_REPORT") failFn("post-QA8 checkpoint requires next=QA9_ACCEPTANCE_REPORT");
  if (!evidenceObj || evidenceObj.verdict !== expectedVerdict) {
    failFn(`post-QA8 checkpoint verdict must be ${expectedVerdict} for P0/P1=${p0}/${p1}`);
  }
  if (!evidenceObj || evidenceObj.evidence_integrity !== "VALID") failFn("post-QA8 checkpoint requires evidence_integrity=VALID");
  if (evidenceObj && evidenceObj.engine_accepted_for_ui != null && evidenceObj.engine_accepted_for_ui !== "NOT_ISSUED") {
    failFn("post-QA8 checkpoint must not issue ENGINE_ACCEPTED_FOR_UI");
  }
  if (evidenceObj && evidenceObj.ui_ux_entry_gate != null && evidenceObj.ui_ux_entry_gate !== "CLOSED") {
    failFn("post-QA8 checkpoint UI gate must remain CLOSED");
  }

  if (!qa7 || qa7.completion_status !== "COMPLETE" || !qa7.run_id || !qa7.checksum || qa7.formal_actions_evidence !== true) {
    failFn("post-QA8 checkpoint requires current formal QA7 COMPLETE");
  } else {
    if (baselineObj && qa7.baseline_id !== baselineObj.id) failFn("post-QA8 QA7 baseline mismatch");
    if (!qa7File || qa7File.baseline_id !== baselineObj.id || String(qa7.run_id) !== String(qa7File.run_id) || qa7.checksum !== qa7File.checksum) {
      failFn("post-QA8 QA7 slot must bind current qa7-result");
    }
  }

  if (!qa8 || qa8.completion_status !== "COMPLETE" || !qa8.run_id || !qa8.checksum) {
    failFn("post-QA8 checkpoint requires QA8 COMPLETE with run_id + checksum");
  } else {
    if (qa8.mode !== "full") failFn("post-QA8 checkpoint requires QA8 mode=full");
    if (baselineObj && qa8.baseline_id !== baselineObj.id) failFn("post-QA8 QA8 baseline mismatch");
  }
  if (!qa8File) {
    failFn("post-QA8 checkpoint requires qa8-result.v1.json");
  } else {
    if (
      qa8File.completion_status !== "COMPLETE" ||
      qa8File.next !== "QA9_ACCEPTANCE_REPORT" ||
      qa8File.mode !== "full" ||
      qa8File.asvs_version !== "5.0.0" ||
      qa8File.product_mutation !== 0
    ) {
      failFn("post-QA8 qa8-result formal shape invalid");
    }
    if (baselineObj && qa8File.baseline_id !== baselineObj.id) failFn("post-QA8 qa8-result baseline mismatch");
    if (qa8 && (String(qa8.run_id) !== String(qa8File.run_id) || qa8.checksum !== qa8File.checksum)) {
      failFn("post-QA8 QA8 slot must bind current qa8-result");
    }
    const ci=(evidenceObj && evidenceObj.critical_invariant)||{};
    const qci=qa8File.critical_invariant_cumulative||{};
    for (const key of ["blocked","skipped","uncovered"]) {
      if ((ci[key]||0)!==(qci[key]||0)) failFn(`post-QA8 critical_invariant.${key} must match qa8 cumulative`);
    }
  }

  if (!qa9 || qa9.completion_status !== "NOT_STARTED" || qa9.run_id !== null || qa9.checksum !== null) {
    failFn("post-QA8 checkpoint requires QA9 NOT_STARTED with null run_id/checksum");
  } else {
    if (baselineObj && qa9.baseline_id !== baselineObj.id) failFn("post-QA8 QA9 baseline mismatch");
    if (qa9.current_epoch_authoritative !== false) failFn("post-QA8 QA9 must remain non-authoritative");
  }

  if (!epoch) {
    failFn("post-QA8 checkpoint requires current_epoch snapshot");
  } else {
    for (const [key, expected] of Object.entries(CURRENT_EPOCH_REBASE_SNAPSHOT)) {
      if (epoch[key] !== expected) failFn(`post-QA8 current_epoch.${key} must remain ${expected}`);
    }
  }
  if (!evidenceObj.kill_switch || evidenceObj.kill_switch.verified_before_qa7 !== true) failFn("post-QA8 requires kill_switch.verified_before_qa7=true");
  if (!evidenceObj.kill_switch || evidenceObj.kill_switch.verified_before_qa8 !== true) failFn("post-QA8 requires kill_switch.verified_before_qa8=true");
}

function assertCurrentEpochPostQa8PreQa9Report(reportText, failFn) {
  for (const line of ["QA7 = COMPLETE","QA8 = COMPLETE","NEXT = QA9_ACCEPTANCE_REPORT","PRODUCT MUTATION = 0"]) {
    if (!reportText.includes(line)) failFn(`REPORT must declare ${line}`);
  }
  if (!reportText.includes("ASVS") || !reportText.includes("5.0.0")) failFn("REPORT must cite ASVS 5.0.0");
  if (!reportText.includes("ENGINE_NOT_ACCEPTED") && !reportText.includes("ENGINE_QA_INCOMPLETE")) {
    failFn("REPORT must state a non-accepted QA8 verdict");
  }
  const notIssued =
    /ENGINE_ACCEPTED_FOR_UI\s*=\s*NOT_ISSUED/i.test(reportText) ||
    /ENGINE_ACCEPTED_FOR_UI[`'*\s]+not issued/i.test(reportText);
  if (!notIssued) failFn("REPORT must declare ENGINE_ACCEPTED_FOR_UI = NOT_ISSUED after QA8");
  const banner=/```text([\s\S]*?)```/.exec(reportText);
  if (banner && /^QA9\s*=\s*COMPLETE\s*$/m.test(banner[1])) failFn("REPORT must not claim QA9 COMPLETE before aggregation");
}

function assertCurrentEpochPostQa7PreQa8Report(reportText, failFn) {
  for (const line of [
    "QA6 = COMPLETE",
    "QA7 = COMPLETE",
    "QA8 = NOT_STARTED",
    "NEXT = QA8_SECURITY_PRIVACY",
  ]) {
    if (!reportText.includes(line)) failFn(`REPORT must declare ${line}`);
  }
  if (!reportText.includes("ENGINE_QA_INCOMPLETE")) {
    failFn("REPORT must declare ENGINE_QA_INCOMPLETE after QA7");
  }
  const notIssued =
    /ENGINE_ACCEPTED_FOR_UI\s*=\s*NOT_ISSUED/i.test(reportText) ||
    /ENGINE_ACCEPTED_FOR_UI[`'*\s]+not issued/i.test(reportText);
  if (!notIssued) {
    failFn("REPORT must declare ENGINE_ACCEPTED_FOR_UI = NOT_ISSUED after QA7");
  }
  const banner = /```text([\s\S]*?)```/.exec(reportText);
  const bannerText = banner ? banner[1] : "";
  if (
    /^QA8\s*=\s*COMPLETE\s*$/m.test(bannerText) ||
    /^QA9\s*=\s*COMPLETE\s*$/m.test(bannerText)
  ) {
    failFn("REPORT must not claim QA8/QA9 COMPLETE before current-epoch QA8 runs");
  }
  if (
    /UI_UX_ENTRY_GATE\s*=\s*OPEN/i.test(reportText) ||
    /03 UI = OPEN/.test(bannerText)
  ) {
    failFn("REPORT must not claim current UI gate OPEN after QA7");
  }
}

function assertCurrentEpochPreQa7Report(reportText, failFn) {
  if (!reportText.includes("QA6 = COMPLETE")) {
    failFn("REPORT must declare QA6 = COMPLETE");
  }
  if (!reportText.includes("QA7_AI_EVAL")) {
    failFn("REPORT must declare NEXT = QA7_AI_EVAL");
  }
  if (!reportText.includes("ENGINE_QA_INCOMPLETE")) {
    failFn("REPORT must declare ENGINE_QA_INCOMPLETE");
  }
  const notIssued =
    /ENGINE_ACCEPTED_FOR_UI\s*=\s*NOT_ISSUED/i.test(reportText) ||
    /ENGINE_ACCEPTED_FOR_UI[`'*\s]+not issued/i.test(reportText);
  if (!notIssued) {
    failFn("REPORT must declare ENGINE_ACCEPTED_FOR_UI = NOT_ISSUED");
  }
  const banner = /```text([\s\S]*?)```/.exec(reportText);
  const bannerText = banner ? banner[1] : "";
  for (const id of ["QA7", "QA8", "QA9"]) {
    if (new RegExp(`^${id}\\s*=\\s*COMPLETE\\s*$`, "m").test(bannerText)) {
      failFn(`REPORT must not claim current ${id} = COMPLETE`);
    }
  }
  if (/UI_UX_ENTRY_GATE\s*=\s*OPEN/i.test(reportText) || /03 UI = OPEN/.test(bannerText)) {
    failFn("REPORT must not claim current UI gate OPEN");
  }
}

const GOV = "governance/engine-acceptance";
/** acceptance-contract.v1.md §L1 — mandatory_suite.QA1..QA8 (QA9 itself is the aggregator, not a formula input). */
const MANDATORY_SUITE_IDS = ["QA1", "QA2", "QA3", "QA4", "QA5", "QA6", "QA7", "QA8"];
const REQUIRED_FILES = [
  `${GOV}/acceptance-contract.v1.md`,
  `${GOV}/severity-policy.v1.md`,
  `${GOV}/invariants.v1.md`,
  `${GOV}/protected-scope.v1.json`,
  `${GOV}/baseline.v1.json`,
  `${GOV}/workflow-amendments.v1.json`,
  `${GOV}/product-rebases.v1.json`,
  `${GOV}/personas.v1.json`,
  `${GOV}/journeys.v1.json`,
  `${GOV}/coverage.v1.json`,
  `${GOV}/defects.v1.json`,
  `${GOV}/evidence-manifest.v1.json`,
  `${GOV}/ENGINE_ACCEPTANCE_REPORT.md`,
  `${GOV}/qa1-result.v1.json`,
  `${GOV}/qa2-result.v1.json`,
  `${GOV}/qa3-result.v1.json`,
  `${GOV}/qa4-result.v1.json`,
  `${GOV}/qa5-result.v1.json`,
  `${GOV}/qa6-result.v1.json`,
  `${GOV}/qa7-result.v1.json`,
  `${GOV}/qa8-result.v1.json`,
  `${GOV}/qa9-result.v1.json`,
  `${GOV}/perf-budget.v1.json`,
  `${GOV}/asvs-mapping.v1.json`,
  "tooling/engine-acceptance/kill-switch.cjs",
  "tooling/engine-acceptance/tiny-smoke.cjs",
  "tooling/engine-acceptance/freeze-baseline.cjs",
  "tooling/engine-acceptance/amend-acceptance-workflow-hash.cjs",
  "tooling/engine-acceptance/selftest-workflow-amendment.cjs",
  "tooling/engine-acceptance/lib/workflow-amendment.cjs",
  "tooling/engine-acceptance/rebase-acceptance-baseline.cjs",
  "tooling/engine-acceptance/selftest-product-rebase.cjs",
  "tooling/engine-acceptance/lib/product-rebase.cjs",
  "tooling/engine-acceptance/run-qa1.cjs",
  "tooling/engine-acceptance/run-qa2.cjs",
  "tooling/engine-acceptance/run-qa3.cjs",
  "tooling/engine-acceptance/run-qa4.cjs",
  "tooling/engine-acceptance/run-qa5.cjs",
  "tooling/engine-acceptance/run-qa6.cjs",
  "tooling/engine-acceptance/run-qa7.cjs",
  "tooling/engine-acceptance/publish-qa7-formal.cjs",
  "tooling/engine-acceptance/run-qa8.cjs",
  "tooling/engine-acceptance/run-qa9.cjs",
  "tooling/engine-acceptance/checks/security-privacy-world.cjs",
  "tooling/engine-acceptance/checks/schemas-routes-contract.cjs",
  "tooling/engine-acceptance/checks/db-consistency.cjs",
  "tooling/engine-acceptance/checks/idempotency-split.cjs",
  "tooling/engine-acceptance/checks/coverage-mapping.cjs",
  "tooling/engine-acceptance/checks/dirty-path-bias.cjs",
  "tooling/engine-acceptance/checks/user-isolation-surfaces.cjs",
  "tooling/engine-acceptance/checks/synthetic-journey-evidence.cjs",
  "tooling/engine-acceptance/checks/fast-check-properties.cjs",
  "tooling/engine-acceptance/checks/stateful-time-lifecycle.cjs",
  "tooling/engine-acceptance/checks/failure-world.cjs",
  "tooling/engine-acceptance/checks/performance-world.cjs",
  "tooling/engine-acceptance/k6/scenario-mix.js",
  "tooling/engine-acceptance/k6/route-catalog.cjs",
  "tooling/engine-acceptance/lib/synthetic-identity.cjs",
  "tooling/engine-acceptance/harness/ci-postgres.cjs",
  "tooling/engine-acceptance/harness/ci-nest-boot.cjs",
  "tooling/engine-acceptance/harness/llm-fault-server.cjs",
  "tooling/engine-acceptance/harness/db-fault.cjs",
  "tooling/engine-acceptance/harness/fault-orchestrator.cjs",
  "tooling/engine-acceptance/run-qa5-fault.cjs",
  "tooling/engine-acceptance/run-qa6-measure.cjs",
  "tooling/engine-acceptance/run-qa8-adversarial.cjs",
  "tooling/engine-acceptance/qa8/admin-route-inventory.cjs",
  "tooling/engine-acceptance/qa8/adversarial-cases.cjs",
  "tooling/engine-acceptance/selftest-pre-rebase-harness.cjs",
  "tooling/engine-acceptance/lib/seeded-rng.cjs",
  "tooling/engine-acceptance/lib/fingerprint-oracle.cjs",
  "tooling/engine-acceptance/lib/rich-failure-evidence.cjs",
  "tooling/engine-acceptance/lib/clock-hook.cjs",
  "tooling/engine-acceptance/lib/fault-hook.cjs",
  "tooling/engine-acceptance/lib/perf-oracle.cjs",
  ".github/workflows/engine-acceptance.yml",
];

for (const rel of REQUIRED_FILES) {
  if (!fs.existsSync(path.join(ROOT, rel))) fail(`missing ${rel}`);
}

// --- severity / contract text locks ---
const sev = fs.readFileSync(path.join(ROOT, `${GOV}/severity-policy.v1.md`), "utf8");
for (const token of ["**P0**", "**P1**", "**P2**", "**P3**", "재조정 금지"]) {
  if (!sev.includes(token)) fail(`severity-policy missing lock token: ${token}`);
}

const contract = fs.readFileSync(
  path.join(ROOT, `${GOV}/acceptance-contract.v1.md`),
  "utf8",
);
for (const token of [
  "ENGINE_ACCEPTED_FOR_UI",
  "ENGINE_NOT_ACCEPTED",
  "ENGINE_QA_INCOMPLETE",
  "working_tree_clean",
  "protected_scope_clean",
  "BLOCKED_NO_CLOCK_HOOK",
  "BLOCKED_NO_FAULT_HOOK",
  "fail-fast: false",
  "kill-switch",
  "POST_QA0_CONTROLLED_WORKFLOW_AMENDMENT_V1",
  "CONTROLLED_AMENDMENT_ONLY",
  "workflow-amendments.v1.json",
  "ENGINE_ACCEPTANCE_REBASE_V1",
  "product-rebases.v1.json",
  "baseline washing",
]) {
  if (!contract.includes(token)) fail(`acceptance-contract missing: ${token}`);
}

// --- fast-check dependency present ---
try {
  require.resolve("fast-check");
} catch {
  fail("fast-check must be installed (QA3 generative fuzz)");
}

// --- protected scope ---
let scope;
try {
  scope = readJson(`${GOV}/protected-scope.v1.json`);
} catch {
  fail("protected-scope.v1.json invalid JSON");
}

if (scope) {
  if (scope.schema !== "governance.engine-acceptance.protected-scope.v1") {
    fail("protected-scope.schema mismatch");
  }
  if (scope.hashAlgorithm !== "sha256") fail("hashAlgorithm must be sha256");
  if (scope.pathSeparator !== "/") fail("pathSeparator must be /");
  if (!Array.isArray(scope.roots) || scope.roots.length < 1) fail("roots required");
  if (!scope.normalization || scope.normalization.lineEndings !== "lf") {
    fail("normalization.lineEndings must be lf");
  }
}

// --- baseline (frozen at QA-0 — do not advance qa_phase) ---
let baseline;
try {
  baseline = readJson(`${GOV}/baseline.v1.json`);
} catch {
  fail("baseline.v1.json invalid JSON");
}

if (baseline && scope) {
  const required = [
    "id",
    "commit_sha",
    "tree_sha",
    "working_tree_clean",
    "protected_scope_clean",
    "lockfile_hash",
    "schema_migration_hash",
    "prompt_hash",
    "eval_dataset_hash",
    "acceptance_workflow_hash",
    "node_version",
    "package_manager_version",
    "protected_scope_manifest",
    "valid",
    "qa_phase",
    "next",
  ];
  for (const k of required) {
    if (baseline[k] === undefined || baseline[k] === null) fail(`baseline missing ${k}`);
  }
  if (!/^[0-9a-f]{40}$/i.test(baseline.commit_sha || "")) {
    fail("baseline.commit_sha must be 40-char hex");
  }
  if (!/^[0-9a-f]{40}$/i.test(baseline.tree_sha || "")) {
    fail("baseline.tree_sha must be 40-char hex");
  }
  if (baseline.qa_phase !== "QA-0") {
    fail("baseline.qa_phase must remain QA-0 (freeze point)");
  }
  if (typeof baseline.working_tree_clean !== "boolean") {
    fail("working_tree_clean must be boolean");
  }
  if (typeof baseline.protected_scope_clean !== "boolean") {
    fail("protected_scope_clean must be boolean");
  }
  if (baseline.valid !== true && baseline.valid !== false) {
    fail("baseline.valid must be boolean");
  }
  if (baseline.valid !== baseline.protected_scope_clean) {
    fail("baseline.valid must equal protected_scope_clean (no laundry via working_tree)");
  }
  if (
    baseline.working_tree_clean === false &&
    baseline.protected_scope_clean === true &&
    baseline.valid !== true
  ) {
    fail("unrelated dirty must not invalidate protected-clean baseline");
  }

  const liveDirty = dualDirty(scope);
  if (baseline.protected_scope_clean !== liveDirty.protected_scope_clean) {
    fail(
      `baseline.protected_scope_clean stale (baseline=${baseline.protected_scope_clean} live=${liveDirty.protected_scope_clean})`,
    );
  }
  const liveManifest = buildManifest(scope);
  if (
    !baseline.protected_scope_manifest ||
    baseline.protected_scope_manifest.aggregate !== liveManifest.aggregate
  ) {
    fail("protected_scope_manifest.aggregate drift vs live hash");
  }
  if (baseline.protected_scope_manifest.pathCount !== liveManifest.pathCount) {
    fail("protected_scope_manifest.pathCount drift");
  }

  for (const [key, paths] of Object.entries(scope.aggregateHashes || {})) {
    const live = hashPathList(paths, scope);
    if (baseline[key] !== live) {
      fail(`baseline.${key} drift`);
    }
  }

  if (!String(baseline.package_manager_version || "").startsWith("pnpm@10.14")) {
    fail(`package_manager_version must be pnpm@10.14.x (got ${baseline.package_manager_version})`);
  }
  if (!String(baseline.node_version || "").startsWith("v22.")) {
    fail(`node_version must be v22.x (got ${baseline.node_version})`);
  }

  if (baseline.valid !== true) {
    fail("requires baseline.valid=true (protected scope must be clean)");
  }
}

// --- personas / journeys / coverage governance ---
let personas;
let journeys;
let coverage;
try {
  personas = readJson(`${GOV}/personas.v1.json`);
  journeys = readJson(`${GOV}/journeys.v1.json`);
  coverage = readJson(`${GOV}/coverage.v1.json`);
} catch {
  fail("personas/journeys/coverage JSON invalid");
}
if (personas && !(personas.personas || []).some((p) => p.id === "KR-11")) {
  fail("personas must include KR-11 (concurrency/isolation)");
}
if (journeys) {
  const kinds = (journeys.journeys || []).map((j) => j.kind);
  if (!kinds.includes("dirty") || !kinds.includes("happy")) {
    fail("journeys must include dirty and happy kinds");
  }
}
if (coverage) {
  if (coverage.kpi_forbidden !== true) {
    fail("coverage.kpi_forbidden must be true");
  }
  for (const k of ["kpi_case_count", "case_count_sla", "target_cases", "kpi_target"]) {
    if (coverage[k] !== undefined) fail(`coverage KPI field forbidden: ${k}`);
  }
  const qa2Maps = (coverage.mappings || []).filter((m) =>
    (m.suite_ids || []).includes("QA2"),
  );
  const faces = new Set(
    qa2Maps
      .filter((m) => m.invariant_id === "INV-ISOLATION-01")
      .map((m) => m.attack_face)
      .filter(Boolean),
  );
  for (const f of ["interleave", "token_cross", "object_id_swap"]) {
    if (!faces.has(f)) fail(`coverage QA2 isolation missing attack_face: ${f}`);
  }
  const qa3Maps = (coverage.mappings || []).filter((m) =>
    (m.suite_ids || []).includes("QA3"),
  );
  if (qa3Maps.length < 1) fail("coverage must include at least one QA3 mapping");
  const qa3Invs = new Set(qa3Maps.map((m) => m.invariant_id));
  for (const inv of [
    "INV-IDEMPOTENCY-01",
    "INV-IDEMPOTENCY-03",
    "INV-LIFECYCLE-01",
    "INV-ISOLATION-01",
  ]) {
    if (!qa3Invs.has(inv)) fail(`coverage QA3 missing invariant mapping: ${inv}`);
  }
  const qa4Maps = (coverage.mappings || []).filter((m) =>
    (m.suite_ids || []).includes("QA4"),
  );
  if (qa4Maps.length < 1) fail("coverage must include at least one QA4 mapping");
  const qa4Invs = new Set(qa4Maps.map((m) => m.invariant_id));
  if (!qa4Invs.has("INV-TIME-01")) {
    fail("coverage QA4 missing INV-TIME-01 mapping");
  }
  const timeMap = qa4Maps.find((m) => m.invariant_id === "INV-TIME-01");
  if (!timeMap || timeMap.critical !== true) {
    fail("coverage INV-TIME-01 must be critical for QA4");
  }
  if (timeMap.blocked_code_if_no_hook !== "BLOCKED_NO_CLOCK_HOOK") {
    fail("coverage INV-TIME-01 must declare blocked_code_if_no_hook=BLOCKED_NO_CLOCK_HOOK");
  }
}
if (journeys && !(journeys.journeys || []).some((j) => j.id === "J-TIME-MULTIDAY-01")) {
  fail("journeys must include J-TIME-MULTIDAY-01 for QA4");
}
if (journeys && !(journeys.journeys || []).some((j) => j.id === "J-FAULT-DEGRADE-01")) {
  fail("journeys must include J-FAULT-DEGRADE-01 for QA5 axis1");
}
if (journeys && !(journeys.journeys || []).some((j) => j.id === "J-FAULT-RECOVERY-01")) {
  fail("journeys must include J-FAULT-RECOVERY-01 for QA5 axis2");
}
if (journeys && !(journeys.journeys || []).some((j) => j.id === "J-PERF-MIX-01")) {
  fail("journeys must include J-PERF-MIX-01 for QA6 performance mix");
}
if (coverage) {
  const qa6Maps = (coverage.mappings || []).filter((m) =>
    (m.suite_ids || []).includes("QA6"),
  );
  if (qa6Maps.length < 1) fail("coverage must include at least one QA6 mapping");
  const perfMap = qa6Maps.find((m) => m.invariant_id === "INV-PERF-01");
  if (!perfMap || perfMap.critical !== true) {
    fail("coverage INV-PERF-01 must be critical for QA6");
  }
  if (perfMap.blocked_code_if_no_oracle !== "BLOCKED_MISSING_ORACLE") {
    fail("coverage INV-PERF-01 must declare blocked_code_if_no_oracle=BLOCKED_MISSING_ORACLE");
  }
  if (perfMap.budget_status_if_unspecified !== "UNSPECIFIED_PERF_BUDGET") {
    fail("coverage INV-PERF-01 must declare budget_status_if_unspecified=UNSPECIFIED_PERF_BUDGET");
  }
}

// --- defects schema ---
let defects;
try {
  defects = readJson(`${GOV}/defects.v1.json`);
} catch {
  fail("defects.v1.json invalid JSON");
}
if (defects) {
  for (const f of [
    "severity",
    "invariant_id",
    "suite_id",
    "persona_id",
    "journey_id",
    "seed",
    "trace_id",
    "baseline_id",
    "first_observed_at",
    "repro_status",
  ]) {
    if (!(defects.requiredLinkFields || []).includes(f)) {
      fail(`defects.requiredLinkFields missing ${f}`);
    }
  }
}

// --- rebase ledger + evidence ---
let rebaseLedger = null;
try {
  rebaseLedger = loadRebaseLedger(REBASE_LEDGER_REL);
} catch {
  fail("product-rebases.v1.json invalid JSON");
}

let evidence;
try {
  evidence = readJson(`${GOV}/evidence-manifest.v1.json`);
} catch {
  fail("evidence-manifest.v1.json invalid JSON");
}

let ephemeralQa6Rewrite = false;
let ephemeralPreQa9Rewrite = false;
let currentEpochPreQa7Checkpoint = false;
let currentEpochPostQa7PreQa8Checkpoint = false;
let currentEpochPostQa8PreQa9Checkpoint = false;
let preQa7CheckpointCtx = null;

const pendingRerun = isPendingRerun(baseline, evidence, rebaseLedger);
if (baseline && rebaseLedger) {
  verifyRebaseLedgerAgainstBaseline(baseline, rebaseLedger, evidence, fails);
}
if (baseline) {
  let amendmentForInPlace = null;
  try {
    amendmentForInPlace = readJson(`${GOV}/workflow-amendments.v1.json`);
  } catch {
    amendmentForInPlace = null;
  }
  if (amendmentForInPlace) {
    assertNoInPlaceHashRewrite(baseline, amendmentForInPlace, rebaseLedger, fails);
  }
}

if (evidence) {
  if (evidence.schema !== "governance.engine-acceptance.evidence-manifest.v1") {
    fail("evidence-manifest.schema mismatch");
  }
  if (!evidence.baseline_id) fail("evidence-manifest.baseline_id required");
  if (baseline && evidence.baseline_id !== baseline.id) {
    fail("evidence-manifest.baseline_id must match baseline.id");
  }
  // QA9 applies the acceptance-contract.v1.md §L1 formula and issues the
  // verdict. A precise, formula-based cross-check of evidence.verdict is
  // added further below (once the ephemeral-CI-rewrite flags are known) -
  // see "independently re-derive the L1 formula" - rather than the old
  // blanket "never ACCEPTED" rule this replaces.
  if (evidence.evidence_integrity !== "VALID") {
    fail("evidence_integrity must be VALID");
  }
  if (
    !evidence.artifact_policy ||
    !(evidence.artifact_policy.retention_days_min >= 90)
  ) {
    fail("evidence.artifact_policy.retention_days_min must be ≥90");
  }

  let qa7Peek = null;
  try {
    qa7Peek = readJson(`${GOV}/qa7-result.v1.json`);
  } catch {
    qa7Peek = null;
  }
  let qa9Peek = null;
  try {
    qa9Peek = readJson(`${GOV}/qa9-result.v1.json`);
  } catch {
    qa9Peek = null;
  }
  const ephemeralQa6RewriteNow =
    !pendingRerun && isEphemeralQa6Rewrite(evidence, qa7Peek);
  ephemeralQa6Rewrite = ephemeralQa6RewriteNow;
  const ephemeralPreQa9RewriteNow =
    !pendingRerun && !ephemeralQa6RewriteNow && isEphemeralPreQa9Rewrite(evidence, qa9Peek);
  ephemeralPreQa9Rewrite = ephemeralPreQa9RewriteNow;
  preQa7CheckpointCtx = buildPreQa7CheckpointCtx(
    baseline,
    evidence,
    rebaseLedger,
    defects,
    scope,
  );
  const currentEpochPreQa7CheckpointNow =
    !pendingRerun &&
    !ephemeralQa6RewriteNow &&
    !ephemeralPreQa9RewriteNow &&
    isCurrentEpochPreQa7Checkpoint(preQa7CheckpointCtx);
  currentEpochPreQa7Checkpoint = currentEpochPreQa7CheckpointNow;
  const currentEpochPostQa7PreQa8CheckpointNow =
    !pendingRerun &&
    !ephemeralQa6RewriteNow &&
    !ephemeralPreQa9RewriteNow &&
    !currentEpochPreQa7CheckpointNow &&
    isCurrentEpochPostQa7PreQa8Checkpoint(evidence);
  currentEpochPostQa7PreQa8Checkpoint = currentEpochPostQa7PreQa8CheckpointNow;
  const currentEpochPostQa8PreQa9CheckpointNow =
    !pendingRerun &&
    !ephemeralQa6RewriteNow &&
    !ephemeralPreQa9RewriteNow &&
    !currentEpochPreQa7CheckpointNow &&
    !currentEpochPostQa7PreQa8CheckpointNow &&
    isCurrentEpochPostQa8PreQa9Checkpoint(evidence);
  currentEpochPostQa8PreQa9Checkpoint = currentEpochPostQa8PreQa9CheckpointNow;

  // Independently re-derive the L1 formula and require evidence.verdict to
  // match exactly - stronger than (and a superset of) a blanket "never
  // ACCEPTED" rule: it also catches an incorrectly-optimistic NOT_ACCEPTED/
  // INCOMPLETE claim. Skipped during ephemeralQa6RewriteNow: run-qa6.cjs's
  // own in-memory verdict decision only considers QA1-5's on-disk defects at
  // the moment it runs (it merges LATER suites' defects into the written
  // defects.v1.json for preservation, but does not re-derive its own verdict
  // from that merge) - a pre-existing characteristic of that already-CI-green
  // suite, not something QA9 changes. qa9-result.v1.json's own formula_inputs
  // (checked separately below) still gets the fully-correct cross-suite
  // cross-check regardless.
  if (defects && !pendingRerun && !ephemeralQa6RewriteNow && !ephemeralPreQa9RewriteNow) {
    const p0p1 = (defects.counts && defects.counts.P0 ? defects.counts.P0 : 0) +
      (defects.counts && defects.counts.P1 ? defects.counts.P1 : 0);
    if (p0p1 > 0 && evidence.verdict !== "ENGINE_NOT_ACCEPTED") {
      fail(
        `evidence.verdict must be ENGINE_NOT_ACCEPTED while defects.P0+P1=${p0p1} > 0 (got ${evidence.verdict})`,
      );
    }
    if (p0p1 === 0 && evidence.verdict === "ENGINE_ACCEPTED_FOR_UI") {
      const ci = evidence.critical_invariant || {};
      const criticalClean =
        (ci.blocked || 0) === 0 && (ci.skipped || 0) === 0 && (ci.uncovered || 0) === 0;
      const mandatoryComplete = MANDATORY_SUITE_IDS.every((id) => {
        const s = (evidence.suites || []).find((x) => x.suite_id === id);
        return s && s.completion_status === "COMPLETE";
      });
      if (!criticalClean || !mandatoryComplete || evidence.evidence_integrity !== "VALID") {
        fail(
          "evidence.verdict=ENGINE_ACCEPTED_FOR_UI but formula conditions are not all met " +
            "(critical_invariant clean / mandatory_suite.QA1..QA8 complete / evidence_integrity VALID)",
        );
      }
      if (!baseline || baseline.valid !== true) {
        fail("evidence.verdict=ENGINE_ACCEPTED_FOR_UI requires baseline.valid=true");
      }
    }
  }
  // ENGINE_ACCEPTED_FOR_UI is never legal to see mid-rewrite or before QA9 -
  // this part of the guard stays unconditional regardless of ephemeral state.
  if (
    evidence.verdict === "ENGINE_ACCEPTED_FOR_UI" &&
    (
      pendingRerun ||
      ephemeralQa6RewriteNow ||
      currentEpochPreQa7CheckpointNow ||
      currentEpochPostQa7PreQa8CheckpointNow ||
      currentEpochPostQa8PreQa9CheckpointNow
    )
  ) {
    fail(
      "must not issue ENGINE_ACCEPTED_FOR_UI before current-epoch QA9 aggregation",
    );
  }

  if (pendingRerun) {
    verifyPendingRerunEpoch(baseline, evidence, rebaseLedger, fails);
  } else {
    if (ephemeralQa6RewriteNow) {
      if (evidence.qa_phase !== "QA-6") {
        fail("ephemeral QA6 rewrite must keep evidence-manifest.qa_phase QA-6");
      }
      if (evidence.next !== "QA7_AI_EVAL") {
        fail("ephemeral QA6 rewrite must keep evidence-manifest.next QA7_AI_EVAL");
      }
    } else if (ephemeralPreQa9RewriteNow) {
      // run-qa8.cjs (the only other runner besides run-qa6.cjs that rewrites
      // evidence-manifest in a CI matrix job) predates QA9 and always
      // hardcodes these two values - qa9-result.v1.json + evidence.suites[QA9]
      // (preserved by run-qa8.cjs's passthrough map) are checked below instead.
      if (evidence.qa_phase !== "QA-8") {
        fail("ephemeral pre-QA9 rewrite must keep evidence-manifest.qa_phase QA-8");
      }
      if (evidence.next !== "QA9_ACCEPTANCE_REPORT") {
        fail("ephemeral pre-QA9 rewrite must keep evidence-manifest.next QA9_ACCEPTANCE_REPORT");
      }
    } else if (currentEpochPreQa7CheckpointNow) {
      verifyCurrentEpochPreQa7Checkpoint(preQa7CheckpointCtx, fails);
    } else if (currentEpochPostQa7PreQa8CheckpointNow) {
      verifyCurrentEpochPostQa7PreQa8Checkpoint(
        evidence,
        baseline,
        qa7Peek,
        defects,
        fail,
      );
    } else if (currentEpochPostQa8PreQa9CheckpointNow) {
      verifyCurrentEpochPostQa8PreQa9Checkpoint(
        evidence,
        baseline,
        qa7Peek,
        peekGovJson("qa8-result.v1.json"),
        defects,
        fail,
      );
    } else {
      if (evidence.qa_phase !== "QA-9") {
        fail("evidence-manifest.qa_phase must be QA-9 after qa9-acceptance-report completion");
      }
      if (
        !["03_blocked_fix_round", "03_blocked_incomplete", "03_ui_entry_unlocked"].includes(
          evidence.next,
        )
      ) {
        fail(
          "evidence-manifest.next must be one of 03_blocked_fix_round|03_blocked_incomplete|03_ui_entry_unlocked after QA9",
        );
      }
    }
    if (!evidence.kill_switch || evidence.kill_switch.verified_before_qa3 !== true) {
      fail("evidence.kill_switch.verified_before_qa3 must be true");
    }
    if (!evidence.kill_switch || evidence.kill_switch.verified_before_qa4 !== true) {
      fail("evidence.kill_switch.verified_before_qa4 must be true");
    }
    if (!evidence.kill_switch || evidence.kill_switch.verified_before_qa5 !== true) {
      fail("evidence.kill_switch.verified_before_qa5 must be true");
    }
    if (!evidence.kill_switch || evidence.kill_switch.verified_before_qa6 !== true) {
      fail("evidence.kill_switch.verified_before_qa6 must be true");
    }

    const qa0 = (evidence.suites || []).find((s) => s.suite_id === "QA0");
    const qa1 = (evidence.suites || []).find((s) => s.suite_id === "QA1");
    const qa2 = (evidence.suites || []).find((s) => s.suite_id === "QA2");
    const qa3 = (evidence.suites || []).find((s) => s.suite_id === "QA3");
    const qa4 = (evidence.suites || []).find((s) => s.suite_id === "QA4");
    const qa5 = (evidence.suites || []).find((s) => s.suite_id === "QA5");
    const qa6 = (evidence.suites || []).find((s) => s.suite_id === "QA6");
    if (!qa0 || qa0.completion_status !== "COMPLETE") {
      fail("QA0 suite must remain COMPLETE");
    }
    if (!qa1 || qa1.completion_status !== "COMPLETE") {
      fail("QA1 suite must remain COMPLETE");
    }
    if (!qa1.run_id || !qa1.checksum) {
      fail("QA1 suite must have run_id + checksum");
    }
    if (!qa2 || qa2.completion_status !== "COMPLETE") {
      fail("QA2 suite must remain COMPLETE");
    }
    if (!qa2.run_id || !qa2.checksum) {
      fail("QA2 suite must have run_id + checksum");
    }
    if (!qa3 || qa3.completion_status !== "COMPLETE") {
      fail("QA3 suite must remain COMPLETE");
    }
    if (!qa3.run_id || !qa3.checksum) {
      fail("QA3 suite must have run_id + checksum");
    }
    if (!qa4 || qa4.completion_status !== "COMPLETE") {
      fail("QA4 suite must remain COMPLETE");
    }
    if (!qa4.run_id || !qa4.checksum) {
      fail("QA4 suite must have run_id + checksum");
    }
    if (!qa5 || qa5.completion_status !== "COMPLETE") {
      fail("QA5 suite must remain COMPLETE");
    }
    if (!qa5.run_id || !qa5.checksum) {
      fail("QA5 suite must have run_id + checksum");
    }
    if (!qa6 || qa6.completion_status !== "COMPLETE") {
      fail("QA6 suite must be COMPLETE");
    }
    if (!qa6.run_id || !qa6.checksum) {
      fail("QA6 suite must have run_id + checksum");
    }
    const qa7 = (evidence.suites || []).find((s) => s.suite_id === "QA7");
    const qa8 = (evidence.suites || []).find((s) => s.suite_id === "QA8");
    if (ephemeralQa6RewriteNow) {
      if (!qa7Peek || qa7Peek.formal_actions_evidence !== true) {
        fail("ephemeral QA6 rewrite must keep qa7-result formal_actions_evidence");
      }
    } else if (ephemeralPreQa9RewriteNow) {
      // A real CI-heavy chain (QA4 -> QA5 -> QA6 -> [QA7] -> QA8, each
      // consuming the prior suite's on-disk result) legitimately resets QA7
      // (and QA9) to NOT_STARTED via QA6's generic suite-list fallthrough
      // before QA8 ever gets a chance to run - unlike an ISOLATED QA8-only
      // rerun from a fresh checkout (the scenario this tolerance branch was
      // originally written for, where QA7 stays untouched). QA8 itself,
      // being the suite that just ran, must still be genuinely COMPLETE;
      // QA7/QA9 are only validated WHEN present+complete, never required.
      if (qa7 && qa7.completion_status === "COMPLETE") {
        if (!qa7.run_id || !qa7.checksum) {
          fail("QA7 suite must have run_id + checksum");
        }
        if (qa7.formal_actions_evidence !== true) {
          fail("QA7 suite.formal_actions_evidence must be true");
        }
      }
      if (!qa8 || qa8.completion_status !== "COMPLETE") {
        fail("QA8 suite must be COMPLETE");
      } else {
        if (!qa8.run_id || !qa8.checksum) {
          fail("QA8 suite must have run_id + checksum");
        }
        if (qa8.asvs_version !== "5.0.0") {
          fail("QA8 suite.asvs_version must be 5.0.0");
        }
      }
      if (!evidence.kill_switch || evidence.kill_switch.verified_before_qa8 !== true) {
        fail("evidence.kill_switch.verified_before_qa8 must be true");
      }
    } else if (currentEpochPreQa7CheckpointNow) {
      // Current-epoch pre-QA7 checkpoint: QA7/QA8/QA9 are not current COMPLETE.
      // Predecessor preservation is enforced by verifyCurrentEpochPreQa7Checkpoint.
    } else if (currentEpochPostQa7PreQa8CheckpointNow) {
      if (!qa7 || qa7.completion_status !== "COMPLETE") {
        fail("post-QA7 checkpoint requires QA7 COMPLETE");
      } else {
        if (!qa7.run_id || !qa7.checksum) {
          fail("post-QA7 checkpoint QA7 requires run_id + checksum");
        }
        if (qa7.formal_actions_evidence !== true) {
          fail("post-QA7 checkpoint QA7 requires formal_actions_evidence=true");
        }
      }
      if (!qa8 || qa8.completion_status !== "NOT_STARTED") {
        fail("post-QA7 checkpoint requires QA8 NOT_STARTED");
      } else if (qa8.run_id !== null || qa8.checksum !== null) {
        fail("post-QA7 checkpoint QA8 run_id/checksum must remain null");
      }
      if (!evidence.kill_switch || evidence.kill_switch.verified_before_qa7 !== true) {
        fail("post-QA7 checkpoint requires evidence.kill_switch.verified_before_qa7=true");
      }
    } else if (currentEpochPostQa8PreQa9CheckpointNow) {
      if (!qa7 || qa7.completion_status !== "COMPLETE" || !qa7.run_id || !qa7.checksum) {
        fail("post-QA8 checkpoint requires QA7 COMPLETE with run_id + checksum");
      }
      if (!qa8 || qa8.completion_status !== "COMPLETE" || !qa8.run_id || !qa8.checksum || qa8.mode !== "full") {
        fail("post-QA8 checkpoint requires QA8 COMPLETE full with run_id + checksum");
      }
      const qa9 = (evidence.suites || []).find((x) => x.suite_id === "QA9");
      if (!qa9 || qa9.completion_status !== "NOT_STARTED" || qa9.run_id !== null || qa9.checksum !== null) {
        fail("post-QA8 checkpoint requires QA9 NOT_STARTED with null run_id/checksum");
      }
      if (!evidence.kill_switch || evidence.kill_switch.verified_before_qa7 !== true) {
        fail("post-QA8 checkpoint requires verified_before_qa7=true");
      }
      if (!evidence.kill_switch || evidence.kill_switch.verified_before_qa8 !== true) {
        fail("post-QA8 checkpoint requires verified_before_qa8=true");
      }
    } else {
      if (!qa7 || qa7.completion_status !== "COMPLETE") {
        fail("QA7 suite must be COMPLETE after formal Actions publication");
      } else {
        if (!qa7.run_id || !qa7.checksum) {
          fail("QA7 suite must have run_id + checksum");
        }
        if (qa7.formal_actions_evidence !== true) {
          fail("QA7 suite.formal_actions_evidence must be true");
        }
      }
      if (!qa8 || qa8.completion_status !== "COMPLETE") {
        fail("QA8 suite must be COMPLETE");
      } else {
        if (!qa8.run_id || !qa8.checksum) {
          fail("QA8 suite must have run_id + checksum");
        }
        if (qa8.asvs_version !== "5.0.0") {
          fail("QA8 suite.asvs_version must be 5.0.0");
        }
      }
      if (!evidence.kill_switch || evidence.kill_switch.verified_before_qa7 !== true) {
        fail("evidence.kill_switch.verified_before_qa7 must be true");
      }
      if (!evidence.kill_switch || evidence.kill_switch.verified_before_qa8 !== true) {
        fail("evidence.kill_switch.verified_before_qa8 must be true");
      }
      // QA9 suite entry: genuinely COMPLETE in both the clean branch and the
      // ephemeral-pre-QA9-rewrite branch (run-qa8.cjs's passthrough map
      // preserves any suite entry it does not own, including QA9's).
      const qa9 = (evidence.suites || []).find((s) => s.suite_id === "QA9");
      if (!qa9 || qa9.completion_status !== "COMPLETE") {
        fail("QA9 suite must be COMPLETE (final acceptance aggregation)");
      } else if (!qa9.run_id || !qa9.checksum) {
        fail("QA9 suite must have run_id + checksum");
      }
      if (!evidence.kill_switch || evidence.kill_switch.verified_before_qa9 !== true) {
        fail("evidence.kill_switch.verified_before_qa9 must be true");
      }
    }
    if (
      ephemeralQa6RewriteNow ||
      currentEpochPreQa7CheckpointNow ||
      currentEpochPostQa7PreQa8CheckpointNow
    ) {
      // run-qa6.cjs recomputes its own cumulative from QA5's on-disk result
      // only — it has no knowledge of QA8 in this ephemeral CI recompute.
      // The persisted pre-QA7 checkpoint also uses QA6 cumulative as current
      // critical truth and must not read predecessor QA8 cumulative.
      // Authoritative expected total = QA6's own self-computed cumulative
      // (critical_invariant_cumulative.blocked) — re-derived here rather
      // than a hardcoded literal, so real CI-heavy evidence that legitimately
      // drives QA4/QA5/QA6 to 0 is not mistaken for drift.
      let qa6Peek2 = null;
      try {
        qa6Peek2 = readJson(`${GOV}/qa6-result.v1.json`);
      } catch {
        qa6Peek2 = null;
      }
      const expectedQa6Blocked =
        qa6Peek2 && qa6Peek2.critical_invariant_cumulative
          ? qa6Peek2.critical_invariant_cumulative.blocked
          : null;
      if (expectedQa6Blocked === null) {
        fail("cannot re-derive expected critical_invariant.blocked (qa6-result.critical_invariant_cumulative missing)");
      } else if (!evidence.critical_invariant || evidence.critical_invariant.blocked !== expectedQa6Blocked) {
        fail(
          `ephemeral QA6 rewrite critical_invariant.blocked must equal qa6-result.critical_invariant_cumulative.blocked=${expectedQa6Blocked} (got ${evidence.critical_invariant && evidence.critical_invariant.blocked})`,
        );
      }
    } else {
      // Authoritative expected total = QA8's own self-computed cumulative
      // (QA4-QA6 blocked + QA8's new dynamic-pentest blocked) - read fresh
      // here rather than hardcoding a literal, so a real harness wiring that
      // legitimately drives some of these to 0 is not mistaken for drift.
      let qa8Peek2 = null;
      try {
        qa8Peek2 = readJson(`${GOV}/qa8-result.v1.json`);
      } catch {
        qa8Peek2 = null;
      }
      const expectedBlocked =
        qa8Peek2 && qa8Peek2.critical_invariant_cumulative
          ? qa8Peek2.critical_invariant_cumulative.blocked
          : null;
      if (expectedBlocked === null) {
        fail("cannot re-derive expected critical_invariant.blocked (qa8-result.critical_invariant_cumulative missing)");
      } else if (!evidence.critical_invariant || evidence.critical_invariant.blocked !== expectedBlocked) {
        fail(
          `critical_invariant.blocked must equal qa8-result.critical_invariant_cumulative.blocked=${expectedBlocked} after QA8 completion (got ${evidence.critical_invariant && evidence.critical_invariant.blocked})`,
        );
      }
    }
  }
}

let qa1Result;
try {
  qa1Result = readJson(`${GOV}/qa1-result.v1.json`);
} catch {
  fail("qa1-result.v1.json invalid JSON");
}
if (qa1Result) {
  if (qa1Result.suite_id !== "QA1") fail("qa1-result.suite_id must be QA1");
  if (!pendingRerun) {
    if (qa1Result.completion_status !== "COMPLETE") {
      fail("qa1-result.completion_status must be COMPLETE");
    }
  }
}

let qa2Result;
try {
  qa2Result = readJson(`${GOV}/qa2-result.v1.json`);
} catch {
  fail("qa2-result.v1.json invalid JSON");
}
if (qa2Result) {
  if (qa2Result.suite_id !== "QA2") fail("qa2-result.suite_id must be QA2");
  if (!pendingRerun) {
    if (qa2Result.completion_status !== "COMPLETE") {
      fail("qa2-result.completion_status must be COMPLETE");
    }
  }
}

let qa3Result;
try {
  qa3Result = readJson(`${GOV}/qa3-result.v1.json`);
} catch {
  fail("qa3-result.v1.json invalid JSON");
}
if (qa3Result) {
  if (qa3Result.schema !== "governance.engine-acceptance.qa3-result.v1") {
    fail("qa3-result.schema mismatch");
  }
  if (qa3Result.suite_id !== "QA3") fail("qa3-result.suite_id must be QA3");
  if (!pendingRerun) {
    if (qa3Result.completion_status !== "COMPLETE") {
      fail("qa3-result.completion_status must be COMPLETE");
    }
    if (baseline && qa3Result.baseline_id !== baseline.id) {
      fail("qa3-result.baseline_id must match baseline.id");
    }
  if (!qa3Result.kill_switch || qa3Result.kill_switch.verified_before_checks !== true) {
    fail("qa3-result must record kill_switch.verified_before_checks");
  }
  if (qa3Result.kpi_forbidden !== true) {
    fail("qa3-result.kpi_forbidden must be true");
  }
  if (qa3Result.product_mutation !== 0) {
    fail("qa3-result.product_mutation must be 0");
  }
  if (!["tiny", "full"].includes(qa3Result.mode)) {
    fail("qa3-result.mode must be tiny|full");
  }
  const checks = qa3Result.checks || {};
  if (!checks.fast_check) fail("qa3-result.checks.fast_check required");
  if (checks.fast_check) {
    const props = checks.fast_check.properties || [];
    if (props.length < 5) fail("qa3 fast-check must record ≥5 properties");
    for (const p of props) {
      if (!p.property_id || !p.invariant_id || !p.status) {
        fail("qa3 property result missing property_id/invariant_id/status");
      }
      if (p.status === "FAIL") {
        const ev = p.rich_evidence;
        if (!ev) fail(`qa3 FAIL ${p.property_id} missing rich_evidence`);
        else {
          for (const k of ["seed", "rng_version", "clock_as_of", "request_sequence", "baseline_id"]) {
            if (ev[k] === undefined || ev[k] === null) {
              fail(`qa3 rich_evidence missing ${k} for ${p.property_id}`);
            }
          }
          if (!Array.isArray(ev.request_sequence) || ev.request_sequence.length < 1) {
            fail(`qa3 rich_evidence.request_sequence empty for ${p.property_id}`);
          }
        }
        // defects must include this failure (수정0 · 기록만)
        const linked = (defects.defects || []).some(
          (d) => d.suite_id === "QA3" && d.trace_id === `qa3:${p.property_id}`,
        );
        if (!linked) {
          fail(`qa3 FAIL ${p.property_id} must be recorded in defects.v1.json`);
        }
      }
    }
  }
  if (qa3Result.ci) {
    if (qa3Result.ci.strategy_fail_fast !== false) {
      fail("qa3-result.ci.strategy_fail_fast must be false");
    }
    if (!String(qa3Result.ci.concurrency_group || "").includes("engine-acceptance")) {
      fail("qa3-result.ci.concurrency_group must reference engine-acceptance");
    }
  } else {
    fail("qa3-result.ci lock required");
  }
  if (evidence) {
    const qa3 = (evidence.suites || []).find((s) => s.suite_id === "QA3");
    if (qa3 && qa3.checksum !== qa3Result.checksum) {
      fail("evidence QA3.checksum must match qa3-result.checksum");
    }
  }
  }
}

let qa4Result;
try {
  qa4Result = readJson(`${GOV}/qa4-result.v1.json`);
} catch {
  fail("qa4-result.v1.json invalid JSON");
}
if (qa4Result) {
  if (qa4Result.schema !== "governance.engine-acceptance.qa4-result.v1") {
    fail("qa4-result.schema mismatch");
  }
  if (qa4Result.suite_id !== "QA4") fail("qa4-result.suite_id must be QA4");
  if (!pendingRerun) {
    if (qa4Result.completion_status !== "COMPLETE") {
      fail("qa4-result.completion_status must be COMPLETE");
    }
    if (baseline && qa4Result.baseline_id !== baseline.id) {
      fail("qa4-result.baseline_id must match baseline.id");
    }
  if (!qa4Result.kill_switch || qa4Result.kill_switch.verified_before_checks !== true) {
    fail("qa4-result must record kill_switch.verified_before_checks");
  }
  if (qa4Result.kpi_forbidden !== true) {
    fail("qa4-result.kpi_forbidden must be true");
  }
  if (qa4Result.product_mutation !== 0) {
    fail("qa4-result.product_mutation must be 0");
  }
  if (!["tiny", "full"].includes(qa4Result.mode)) {
    fail("qa4-result.mode must be tiny|full");
  }
  if (qa4Result.next !== "QA5_FAILURE_WORLD") {
    fail("qa4-result.next must be QA5_FAILURE_WORLD");
  }
  const checks4 = qa4Result.checks || {};
  if (!checks4.stateful_time) fail("qa4-result.checks.stateful_time required");
  if (checks4.stateful_time) {
    const st = checks4.stateful_time;
    if (!st.clock_hook) fail("qa4 stateful_time.clock_hook required");
    if (!Array.isArray(st.scenarios) || st.scenarios.length < 1) {
      fail("qa4 stateful_time.scenarios must be non-empty");
    }
    const kinds = new Set(st.scenarios.map((s) => s.kind));
    // tiny may omit some; require at least day boundary or plus_30d representation
    if (
      !kinds.has("kst_day_boundary") &&
      !kinds.has("plus_30d") &&
      !kinds.has("multi_day_lifecycle")
    ) {
      fail("qa4 scenarios must include KST/multi-day kinds");
    }
    if (st.clock_hook.available !== true) {
      if (st.clock_hook.blocked_code !== "BLOCKED_NO_CLOCK_HOOK") {
        fail("absent clock hook must set blocked_code=BLOCKED_NO_CLOCK_HOOK");
      }
      if (st.status !== "BLOCKED") {
        fail("absent clock hook must yield stateful_time.status=BLOCKED (no mock PASS)");
      }
      const blockedScenarios = st.scenarios.filter((s) => s.status === "BLOCKED");
      if (blockedScenarios.length < 1) {
        fail("absent clock hook must BLOCK at least one scenario");
      }
      for (const s of blockedScenarios) {
        if (s.blocked_code !== "BLOCKED_NO_CLOCK_HOOK") {
          fail(`scenario ${s.scenario_id} missing BLOCKED_NO_CLOCK_HOOK`);
        }
      }
      if (
        !qa4Result.critical_invariant ||
        !(qa4Result.critical_invariant.blocked > 0)
      ) {
        fail("critical INV-TIME-01 BLOCKED must set critical_invariant.blocked > 0");
      }
      if (qa4Result.verdict_contribution === "ENGINE_ACCEPTED_FOR_UI") {
        fail("critical BLOCKED must not contribute ENGINE_ACCEPTED_FOR_UI");
      }
      if (evidence && evidence.verdict === "ENGINE_ACCEPTED_FOR_UI") {
        fail("evidence verdict must not be ACCEPTED when critical clock hook BLOCKED");
      }
      if (
        !Array.isArray(qa4Result.blocked_codes_observed) ||
        !qa4Result.blocked_codes_observed.includes("BLOCKED_NO_CLOCK_HOOK")
      ) {
        fail("qa4-result.blocked_codes_observed must include BLOCKED_NO_CLOCK_HOOK");
      }
      // BLOCKED ≠ defect
      const bogus = (defects.defects || []).filter(
        (d) =>
          d.suite_id === "QA4" &&
          String(d.title || "").includes("BLOCKED_NO_CLOCK_HOOK") &&
          d.repro_status !== "blocked",
      );
      if (bogus.length) {
        fail("BLOCKED_NO_CLOCK_HOOK must not be laundered as ordinary defect FAIL");
      }
    }
  }
  if (qa4Result.ci) {
    if (qa4Result.ci.strategy_fail_fast !== false) {
      fail("qa4-result.ci.strategy_fail_fast must be false");
    }
    if (!String(qa4Result.ci.concurrency_group || "").includes("engine-acceptance")) {
      fail("qa4-result.ci.concurrency_group must reference engine-acceptance");
    }
  } else {
    fail("qa4-result.ci lock required");
  }
  if (evidence) {
    const qa4 = (evidence.suites || []).find((s) => s.suite_id === "QA4");
    if (qa4 && qa4.checksum !== qa4Result.checksum) {
      fail("evidence QA4.checksum must match qa4-result.checksum");
    }
  }
  }
}

let qa5Result;
try {
  qa5Result = readJson(`${GOV}/qa5-result.v1.json`);
} catch {
  fail("qa5-result.v1.json invalid JSON");
}
if (qa5Result) {
  if (qa5Result.schema !== "governance.engine-acceptance.qa5-result.v1") {
    fail("qa5-result.schema mismatch");
  }
  if (qa5Result.suite_id !== "QA5") fail("qa5-result.suite_id must be QA5");
  if (!pendingRerun) {
    if (qa5Result.completion_status !== "COMPLETE") {
      fail("qa5-result.completion_status must be COMPLETE");
    }
    if (baseline && qa5Result.baseline_id !== baseline.id) {
      fail("qa5-result.baseline_id must match baseline.id");
    }
  if (!qa5Result.kill_switch || qa5Result.kill_switch.verified_before_checks !== true) {
    fail("qa5-result must record kill_switch.verified_before_checks");
  }
  if (qa5Result.kpi_forbidden !== true) {
    fail("qa5-result.kpi_forbidden must be true");
  }
  if (qa5Result.product_mutation !== 0) {
    fail("qa5-result.product_mutation must be 0");
  }
  if (!["tiny", "full"].includes(qa5Result.mode)) {
    fail("qa5-result.mode must be tiny|full");
  }
  if (qa5Result.next !== "QA6_PERFORMANCE") {
    fail("qa5-result.next must be QA6_PERFORMANCE");
  }
  const checks5 = qa5Result.checks || {};
  if (!checks5.failure_world) fail("qa5-result.checks.failure_world required");
  if (checks5.failure_world) {
    const fw = checks5.failure_world;
    if (!fw.fault_hook) fail("qa5 failure_world.fault_hook required");
    if (!fw.axes) fail("qa5 failure_world.axes required");
    if (!fw.axes.axis1_expected_degradation_fallback) {
      fail("qa5 must record axis1_expected_degradation_fallback");
    }
    if (!fw.axes.axis2_post_recovery_invariant) {
      fail("qa5 must record axis2_post_recovery_invariant");
    }
    if (!Array.isArray(fw.scenarios) || fw.scenarios.length < 1) {
      fail("qa5 failure_world.scenarios must be non-empty");
    }
    const axesPresent = new Set(fw.scenarios.map((s) => s.axis));
    if (!axesPresent.has(1) || !axesPresent.has(2)) {
      fail("qa5 scenarios must cover both axis1 and axis2");
    }
    if (fw.fault_hook.available !== true) {
      if (fw.fault_hook.blocked_code !== "BLOCKED_NO_FAULT_HOOK") {
        fail("absent fault hook must set blocked_code=BLOCKED_NO_FAULT_HOOK");
      }
      if (fw.status !== "BLOCKED") {
        fail("absent fault hook must yield failure_world.status=BLOCKED (no mock PASS)");
      }
      const blockedScenarios = fw.scenarios.filter((s) => s.status === "BLOCKED");
      if (blockedScenarios.length < 1) {
        fail("absent fault hook must BLOCK at least one scenario");
      }
      for (const s of blockedScenarios) {
        if (s.blocked_code !== "BLOCKED_NO_FAULT_HOOK") {
          fail(`scenario ${s.scenario_id} missing BLOCKED_NO_FAULT_HOOK`);
        }
      }
      if (
        !qa5Result.critical_invariant ||
        !(qa5Result.critical_invariant.blocked > 0)
      ) {
        fail("critical fault-axis BLOCKED must set critical_invariant.blocked > 0");
      }
      if (qa5Result.verdict_contribution === "ENGINE_ACCEPTED_FOR_UI") {
        fail("critical BLOCKED must not contribute ENGINE_ACCEPTED_FOR_UI");
      }
      if (evidence && evidence.verdict === "ENGINE_ACCEPTED_FOR_UI") {
        fail("evidence verdict must not be ACCEPTED when critical fault hook BLOCKED");
      }
      if (
        !Array.isArray(qa5Result.blocked_codes_observed) ||
        !qa5Result.blocked_codes_observed.includes("BLOCKED_NO_FAULT_HOOK")
      ) {
        fail("qa5-result.blocked_codes_observed must include BLOCKED_NO_FAULT_HOOK");
      }
      const bogus = (defects.defects || []).filter(
        (d) =>
          d.suite_id === "QA5" &&
          String(d.title || "").includes("BLOCKED_NO_FAULT_HOOK") &&
          d.repro_status !== "blocked",
      );
      if (bogus.length) {
        fail("BLOCKED_NO_FAULT_HOOK must not be laundered as ordinary defect FAIL");
      }
    }
  }
  if (qa5Result.ci) {
    if (qa5Result.ci.strategy_fail_fast !== false) {
      fail("qa5-result.ci.strategy_fail_fast must be false");
    }
    if (!String(qa5Result.ci.concurrency_group || "").includes("engine-acceptance")) {
      fail("qa5-result.ci.concurrency_group must reference engine-acceptance");
    }
    if (qa5Result.ci.aggregator_if_always !== true) {
      fail("qa5-result.ci.aggregator_if_always must be true");
    }
    if (!(qa5Result.ci.artifact_retention_days >= 90)) {
      fail("qa5-result.ci.artifact_retention_days must be ≥90");
    }
  } else {
    fail("qa5-result.ci lock required");
  }
  if (evidence) {
    const qa5 = (evidence.suites || []).find((s) => s.suite_id === "QA5");
    if (qa5 && qa5.checksum !== qa5Result.checksum) {
      fail("evidence QA5.checksum must match qa5-result.checksum");
    }
    if (
      !evidence.critical_invariant ||
      typeof evidence.critical_invariant.blocked !== "number"
    ) {
      fail("evidence-manifest.critical_invariant.blocked required after QA5");
    }
  }
  }
}

// --- perf-budget mechanism lock ---
let perfBudget;
try {
  perfBudget = readJson(`${GOV}/perf-budget.v1.json`);
} catch {
  fail("perf-budget.v1.json invalid JSON");
}
if (perfBudget) {
  if (perfBudget.schema !== "governance.engine-acceptance.perf-budget.v1") {
    fail("perf-budget.schema mismatch");
  }
  if (perfBudget.numeric_invention_forbidden !== true) {
    fail("perf-budget.numeric_invention_forbidden must be true");
  }
  if (perfBudget.ci_only_heavy !== true) {
    fail("perf-budget.ci_only_heavy must be true");
  }
  if (!perfBudget.threshold_mechanism || perfBudget.threshold_mechanism.locked !== true) {
    fail("perf-budget.threshold_mechanism.locked must be true");
  }
  if (perfBudget.threshold_mechanism.engine !== "k6") {
    fail("perf-budget.threshold_mechanism.engine must be k6");
  }
  if (perfBudget.threshold_mechanism.binding !== "tag") {
    fail("perf-budget.threshold_mechanism.binding must be tag");
  }
  if (!Array.isArray(perfBudget.scenario_mix) || perfBudget.scenario_mix.length < 2) {
    fail("perf-budget.scenario_mix must have ≥2 scenarios");
  }
  if (perfBudget.status === "UNSPECIFIED_PERF_BUDGET") {
    for (const [tag, t] of Object.entries(perfBudget.thresholds_by_tag || {})) {
      if (typeof t.p95_ms === "number" || typeof t.error_rate === "number") {
        fail(`perf-budget tag=${tag} must not invent numeric thresholds while UNSPECIFIED`);
      }
    }
  } else {
    const requiredTags = ["feed_read", "participate", "wallet_read", "auth_profile"];
    for (const tag of requiredTags) {
      const t = (perfBudget.thresholds_by_tag || {})[tag];
      if (!t) {
        fail(`perf-budget specified V1 missing tag=${tag}`);
        continue;
      }
      if (typeof t.p95_ms !== "number" || typeof t.error_rate !== "number") {
        fail(`perf-budget tag=${tag} specified V1 requires numeric p95_ms and error_rate`);
      }
      if (!t.source || typeof t.source !== "string") {
        fail(`perf-budget tag=${tag} numeric threshold requires source (invention forbidden)`);
      }
      if (t.status === "UNSPECIFIED_PERF_BUDGET") {
        fail(`perf-budget tag=${tag} must not remain UNSPECIFIED while file status is specified`);
      }
    }
  }
}

let qa6Result;
try {
  qa6Result = readJson(`${GOV}/qa6-result.v1.json`);
} catch {
  fail("qa6-result.v1.json invalid JSON");
}
if (qa6Result) {
  if (qa6Result.schema !== "governance.engine-acceptance.qa6-result.v1") {
    fail("qa6-result.schema mismatch");
  }
  if (qa6Result.suite_id !== "QA6") fail("qa6-result.suite_id must be QA6");
  if (!pendingRerun) {
    if (qa6Result.completion_status !== "COMPLETE") {
      fail("qa6-result.completion_status must be COMPLETE");
    }
    if (baseline && qa6Result.baseline_id !== baseline.id) {
      fail("qa6-result.baseline_id must match baseline.id");
    }
  if (!qa6Result.kill_switch || qa6Result.kill_switch.verified_before_checks !== true) {
    fail("qa6-result must record kill_switch.verified_before_checks");
  }
  if (qa6Result.kpi_forbidden !== true) {
    fail("qa6-result.kpi_forbidden must be true");
  }
  if (qa6Result.numeric_invention_forbidden !== true) {
    fail("qa6-result.numeric_invention_forbidden must be true");
  }
  if (qa6Result.ci_only_heavy !== true) {
    fail("qa6-result.ci_only_heavy must be true");
  }
  if (qa6Result.product_mutation !== 0) {
    fail("qa6-result.product_mutation must be 0");
  }
  if (!["tiny", "full"].includes(qa6Result.mode)) {
    fail("qa6-result.mode must be tiny|full");
  }
  if (qa6Result.next !== "QA7_AI_EVAL") {
    fail("qa6-result.next must be QA7_AI_EVAL");
  }
  const checks6 = qa6Result.checks || {};
  if (!checks6.performance_world) fail("qa6-result.checks.performance_world required");
  if (checks6.performance_world) {
    const pw = checks6.performance_world;
    if (!pw.perf_oracle) fail("qa6 performance_world.perf_oracle required");
    if (!pw.threshold_mechanism) fail("qa6 performance_world.threshold_mechanism required");
    if (pw.threshold_mechanism.locked !== true) {
      fail("qa6 threshold_mechanism.locked must be true");
    }
    if (pw.threshold_mechanism.engine !== "k6") {
      fail("qa6 threshold_mechanism.engine must be k6");
    }
    if (pw.threshold_mechanism.binding !== "tag") {
      fail("qa6 threshold_mechanism.binding must be tag");
    }
    if (!pw.threshold_mechanism.k6_script_present) {
      fail("qa6 k6 scenario-mix.js must be present");
    }
    if (!Array.isArray(pw.scenarios) || pw.scenarios.length < 1) {
      fail("qa6 performance_world.scenarios must be non-empty");
    }
    if (
      pw.perf_oracle.budget_status === "UNSPECIFIED_PERF_BUDGET" ||
      pw.status === "UNSPECIFIED_PERF_BUDGET"
    ) {
      if (pw.perf_oracle.blocked_code !== "BLOCKED_MISSING_ORACLE") {
        fail("UNSPECIFIED budget must set blocked_code=BLOCKED_MISSING_ORACLE");
      }
      if (
        !qa6Result.critical_invariant ||
        !(qa6Result.critical_invariant.blocked > 0)
      ) {
        fail("critical INV-PERF-01 UNSPECIFIED must set critical_invariant.blocked > 0");
      }
      if (qa6Result.verdict_contribution === "ENGINE_ACCEPTED_FOR_UI") {
        fail("UNSPECIFIED_PERF_BUDGET must not contribute ENGINE_ACCEPTED_FOR_UI");
      }
      if (evidence && evidence.verdict === "ENGINE_ACCEPTED_FOR_UI") {
        fail("evidence verdict must not be ACCEPTED when UNSPECIFIED_PERF_BUDGET");
      }
      if (
        !Array.isArray(qa6Result.blocked_codes_observed) ||
        !qa6Result.blocked_codes_observed.includes("BLOCKED_MISSING_ORACLE")
      ) {
        fail("qa6-result.blocked_codes_observed must include BLOCKED_MISSING_ORACLE");
      }
      if (qa6Result.budget_status !== "UNSPECIFIED_PERF_BUDGET") {
        fail("qa6-result.budget_status must be UNSPECIFIED_PERF_BUDGET when oracle absent");
      }
      // no invented numbers on scenarios
      for (const s of pw.scenarios) {
        const th = s.threshold || {};
        if (typeof th.p95_ms === "number" || typeof th.error_rate === "number") {
          fail(`qa6 scenario ${s.scenario_id} invented numeric threshold while unspecified`);
        }
      }
      const bogus = (defects.defects || []).filter(
        (d) =>
          d.suite_id === "QA6" &&
          String(d.title || "").includes("UNSPECIFIED_PERF_BUDGET") &&
          d.repro_status !== "blocked",
      );
      if (bogus.length) {
        fail("UNSPECIFIED_PERF_BUDGET must not be laundered as ordinary defect FAIL");
      }
    }
  }
  if (qa6Result.ci) {
    if (qa6Result.ci.strategy_fail_fast !== false) {
      fail("qa6-result.ci.strategy_fail_fast must be false");
    }
    if (!String(qa6Result.ci.concurrency_group || "").includes("engine-acceptance")) {
      fail("qa6-result.ci.concurrency_group must reference engine-acceptance");
    }
    if (qa6Result.ci.aggregator_if_always !== true) {
      fail("qa6-result.ci.aggregator_if_always must be true");
    }
    if (!(qa6Result.ci.artifact_retention_days >= 90)) {
      fail("qa6-result.ci.artifact_retention_days must be ≥90");
    }
    if (qa6Result.ci.heavy_k6 !== "ci_only") {
      fail("qa6-result.ci.heavy_k6 must be ci_only");
    }
  } else {
    fail("qa6-result.ci lock required");
  }
  if (evidence) {
    const qa6 = (evidence.suites || []).find((s) => s.suite_id === "QA6");
    if (qa6 && qa6.checksum !== qa6Result.checksum) {
      fail("evidence QA6.checksum must match qa6-result.checksum");
    }
    if (
      !evidence.critical_invariant ||
      typeof evidence.critical_invariant.blocked !== "number"
    ) {
      fail("evidence-manifest.critical_invariant.blocked required after QA6");
    }
  }
  }
}

let qa7Result;
try {
  qa7Result = readJson(`${GOV}/qa7-result.v1.json`);
} catch {
  fail("qa7-result.v1.json invalid JSON");
}
if (qa7Result && !pendingRerun && !currentEpochPreQa7Checkpoint) {
  if (qa7Result.schema !== "governance.engine-acceptance.qa7-result.v1") {
    fail("qa7-result.schema mismatch");
  }
  if (qa7Result.suite_id !== "QA7") fail("qa7-result.suite_id must be QA7");
  if (qa7Result.completion_status !== "COMPLETE") {
    fail("qa7-result.completion_status must be COMPLETE");
  }
  if (qa7Result.qa7_completion_status !== "COMPLETE") {
    fail("qa7-result.qa7_completion_status must be COMPLETE");
  }
  if (qa7Result.formal_actions_evidence !== true) {
    fail("qa7-result.formal_actions_evidence must be true");
  }
  if (qa7Result.local_validation_only !== false) {
    fail("qa7-result.local_validation_only must be false");
  }
  if (qa7Result.engine_accepted_for_ui !== "NOT_ISSUED") {
    fail("qa7-result must not issue ENGINE_ACCEPTED_FOR_UI");
  }
  if (qa7Result.ui_ux_entry_gate !== "CLOSED") {
    fail("qa7-result.ui_ux_entry_gate must be CLOSED");
  }
  if (qa7Result.next !== "QA8_SECURITY_PRIVACY") {
    fail("qa7-result.next must be QA8_SECURITY_PRIVACY");
  }
  if (qa7Result.verdict_contribution === "ENGINE_ACCEPTED_FOR_UI") {
    fail("qa7-result must not contribute ENGINE_ACCEPTED_FOR_UI");
  }
  if (!/^[0-9]+$/.test(String(qa7Result.run_id || ""))) {
    fail("qa7-result.run_id must be numeric GitHub Actions run id");
  }
  if (!qa7Result.actions || qa7Result.actions.run_id !== qa7Result.run_id) {
    fail("qa7-result.actions.run_id must match run_id");
  }
  if (qa7Result.actions.workflow !== "engine-acceptance") {
    fail("qa7-result.actions.workflow must be engine-acceptance");
  }
  if (qa7Result.actions.event !== "workflow_dispatch") {
    fail("qa7-result.actions.event must be workflow_dispatch");
  }
  if (qa7Result.actions.qa_phase !== "qa7") {
    fail("qa7-result.actions.qa_phase must be qa7");
  }
  if (qa7Result.actions.conclusion !== "success") {
    fail("qa7-result.actions.conclusion must be success");
  }
  if (baseline && qa7Result.baseline_id !== baseline.id) {
    fail("qa7-result.baseline_id must match current baseline.id");
  }
  const c = qa7Result.counts || {};
  const qa7Expected = loadEvalDataset({}).count;
  if (c.total !== qa7Expected || c.pass !== qa7Expected || c.fail !== 0 || c.blocked !== 0) {
    fail(`qa7-result.counts must be ${qa7Expected}/${qa7Expected}/0/0 (live eval dataset)`);
  }
  if (qa7Result.suite_status !== "PASS") fail("qa7-result.suite_status must be PASS");
  if (qa7Result.trace_id_provenance !== "RUNTIME") {
    fail("qa7-result.trace_id_provenance must be RUNTIME");
  }
  if (qa7Result.no_expectation_leakage !== true) {
    fail("qa7-result.no_expectation_leakage must be true");
  }
  if (qa7Result.no_fake_trace !== true) fail("qa7-result.no_fake_trace must be true");
  if (qa7Result.secret_exposure !== "NONE") {
    fail("qa7-result.secret_exposure must be NONE");
  }
  if (qa7Result.eval_mutation !== 0) fail("qa7-result.eval_mutation must be 0");
  if (qa7Result.grader_mutation !== 0) fail("qa7-result.grader_mutation must be 0");
  if (qa7Result.product_mutation !== 0) fail("qa7-result.product_mutation must be 0");
  if (!qa7Result.artifact || qa7Result.artifact.name !== "engine-acceptance-QA7-raw-traces") {
    fail("qa7-result.artifact.name must be engine-acceptance-QA7-raw-traces");
  }
  if (qa7Result.artifact.retention_days !== 90) {
    fail("qa7-result.artifact.retention_days must be 90");
  }
  if (qa7Result.artifact.raw_in_repo !== false) {
    fail("qa7-result must not store raw traces in repo");
  }
  if (!qa7Result.deterministic_grader || qa7Result.deterministic_grader.sole_oracle !== true) {
    fail("qa7-result deterministic grader must be sole oracle");
  }
  if (!qa7Result.quality_grader || qa7Result.quality_grader.status !== "NOT_USED") {
    fail("qa7-result quality grader must be NOT_USED");
  }
  if (qa7Result.quality_grader.sole_oracle !== false) {
    fail("qa7-result quality grader must not be sole oracle");
  }
  const obs = qa7Result.observations || [];
  if (obs.length !== qa7Expected) {
    fail(`qa7-result.observations must have ${qa7Expected} cases (live eval dataset)`);
  }
  const seenTid = new Set();
  const expectKeys = [
    "expectLane",
    "expectTools",
    "expectToolsExact",
    "expectToolsAny",
    "expectPath",
    "expectAnswerPath",
    "expectFacts",
    "expectScope",
    "expectGuard",
  ];
  const uuidRe =
    /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  for (const o of obs) {
    if (o.status !== "PASS") fail(`qa7 observation ${o.case_id} must remain PASS`);
    if (o.canonical_trace !== true) fail(`qa7 observation ${o.case_id} must be canonical`);
    if (o.fixture_only === true) fail(`qa7 observation ${o.case_id} fixture_only forbidden`);
    if (o.trace_id_provenance !== "RUNTIME") {
      fail(`qa7 observation ${o.case_id} provenance must be RUNTIME`);
    }
    if (!uuidRe.test(String(o.trace_id || ""))) {
      fail(`qa7 observation ${o.case_id} must have runtime UUID trace_id`);
    }
    if (String(o.trace_id).startsWith("qa7:")) {
      fail(`qa7 observation ${o.case_id} tooling qa7: id forbidden`);
    }
    if (seenTid.has(o.trace_id)) fail("qa7-result duplicate trace_id");
    seenTid.add(o.trace_id);
    for (const k of expectKeys) {
      if (Object.prototype.hasOwnProperty.call(o, k)) {
        fail(`qa7 observation ${o.case_id} leaked expectation key ${k}`);
      }
    }
  }
  if (qa7Result.hashes) {
    if (qa7Result.hashes.prompt_hash !== "MATCH") fail("qa7-result prompt_hash must be MATCH");
    if (qa7Result.hashes.eval_dataset_hash !== "MATCH") {
      fail("qa7-result eval_dataset_hash must be MATCH");
    }
    if (qa7Result.hashes.acceptance_workflow_hash !== "MATCH") {
      fail("qa7-result acceptance_workflow_hash must be MATCH");
    }
    if (baseline && qa7Result.hashes.pinned) {
      if (qa7Result.hashes.pinned.prompt_hash !== baseline.prompt_hash) {
        fail("qa7-result pinned prompt_hash must match baseline");
      }
      if (qa7Result.hashes.pinned.eval_dataset_hash !== baseline.eval_dataset_hash) {
        fail("qa7-result pinned eval_dataset_hash must match baseline");
      }
      if (
        qa7Result.hashes.pinned.acceptance_workflow_hash !==
        baseline.acceptance_workflow_hash
      ) {
        // A later POST_QA0_CONTROLLED_WORKFLOW_AMENDMENT_V1 entry (same
        // baseline_id) may legitimately move the workflow hash beyond what
        // was pinned when QA7 ran, as long as it proves QA7 semantics were
        // unaffected. Silent/unbridged drift still fails.
        let amendLedgerForQa7 = null;
        try {
          amendLedgerForQa7 = readJson(LEDGER_REL);
        } catch {
          amendLedgerForQa7 = null;
        }
        const bridge = findBridgingAmendment(
          amendLedgerForQa7,
          baseline,
          qa7Result.hashes.pinned.acceptance_workflow_hash,
        );
        const qa7Unaffected =
          bridge &&
          Array.isArray(bridge.unaffected_completed_suites) &&
          bridge.unaffected_completed_suites.includes("QA7");
        if (!qa7Unaffected) {
          fail(
            "qa7-result pinned acceptance_workflow_hash must match baseline, or be bridged by " +
              "a controlled amendment that lists QA7 as unaffected",
          );
        }
      }
    }
  } else {
    fail("qa7-result.hashes required");
  }
  // A real CI-heavy QA4->QA5->QA6->QA8 chain resets QA7's evidence entry to
  // NOT_STARTED (via QA6's generic fallthrough) before QA8 ever runs, same
  // as the QA9 entry - tolerate it the same way in this state.
  if (evidence && !ephemeralQa6Rewrite && !ephemeralPreQa9Rewrite && !currentEpochPreQa7Checkpoint) {
    const qa7 = (evidence.suites || []).find((s) => s.suite_id === "QA7");
    if (qa7 && qa7.checksum !== qa7Result.checksum) {
      fail("evidence QA7.checksum must match qa7-result.checksum");
    }
    if (qa7 && String(qa7.run_id) !== String(qa7Result.run_id)) {
      fail("evidence QA7.run_id must match qa7-result.run_id");
    }
  }
}

// --- QA-8 security/privacy result (ASVS 5.0.0 subset · discovery only) ---
let qa8Result;
try {
  qa8Result = readJson(`${GOV}/qa8-result.v1.json`);
} catch {
  fail("qa8-result.v1.json invalid JSON");
}
if (
  qa8Result &&
  !pendingRerun &&
  !currentEpochPreQa7Checkpoint &&
  !currentEpochPostQa7PreQa8Checkpoint
) {
  if (qa8Result.schema !== "governance.engine-acceptance.qa8-result.v1") {
    fail("qa8-result.schema mismatch");
  }
  if (qa8Result.suite_id !== "QA8") fail("qa8-result.suite_id must be QA8");
  if (qa8Result.completion_status !== "COMPLETE") {
    fail("qa8-result.completion_status must be COMPLETE");
  }
  if (qa8Result.asvs_version !== "5.0.0") fail("qa8-result.asvs_version must be 5.0.0");
  if (qa8Result.exhaustive_certification_claim !== false) {
    fail("qa8-result.exhaustive_certification_claim must be false — no full ASVS cert claim");
  }
  if (baseline && qa8Result.baseline_id !== baseline.id) {
    fail("qa8-result.baseline_id must match current baseline.id");
  }
  if (!qa8Result.kill_switch || qa8Result.kill_switch.verified_before_checks !== true) {
    fail("qa8-result must record kill_switch.verified_before_checks");
  }
  if (qa8Result.product_mutation !== 0) fail("qa8-result.product_mutation must be 0");
  if (qa8Result.kpi_forbidden !== true) fail("qa8-result.kpi_forbidden must be true");
  if (qa8Result.mock_pass_forbidden !== true) {
    fail("qa8-result.mock_pass_forbidden must be true");
  }
  if (!["tiny", "full"].includes(qa8Result.mode)) {
    fail("qa8-result.mode must be tiny|full");
  }
  if (qa8Result.next !== "QA9_ACCEPTANCE_REPORT") {
    fail("qa8-result.next must be QA9_ACCEPTANCE_REPORT");
  }
  const secWorld = (qa8Result.checks || {}).security_privacy_world;
  if (!secWorld) {
    fail("qa8-result.checks.security_privacy_world required");
  } else {
    if (!Array.isArray(secWorld.checks) || secWorld.checks.length < 5) {
      fail("qa8-result security_privacy_world.checks must cover >=5 areas");
    }
    const byId = new Map((secWorld.checks || []).map((c) => [c.check_id, c]));
    for (const id of [
      "QA8_ADMIN_BOUNDARY",
      "QA8_USER_ISOLATION_SHARED_WITH_QA2",
      "QA8_JWT_TOKEN_VALIDATION",
      "QA8_PRIVACY_DELETE_ACCOUNT",
      "QA8_ERROR_DISCLOSURE_AND_LOGGING",
    ]) {
      if (!byId.has(id)) fail(`qa8-result missing check_id ${id}`);
    }
    const adminCheck = byId.get("QA8_ADMIN_BOUNDARY");
    if (adminCheck) {
      // Honest discovery — do not require PASS. Only require the check ran
      // with real evidence and did not silently launder a FAIL as PASS.
      if (!Array.isArray(adminCheck.asvs_ids) || !adminCheck.asvs_ids.includes("v5.0.0-8.2.1")) {
        fail("qa8 admin-boundary check must cite ASVS v5.0.0-8.2.1");
      }
      if (typeof adminCheck.controllers_scanned !== "number" || adminCheck.controllers_scanned < 1) {
        fail("qa8 admin-boundary check must record controllers_scanned > 0 (real evidence)");
      }
      if (adminCheck.status === "FAIL" && !adminCheck.rich_evidence) {
        fail("qa8 admin-boundary FAIL must carry rich_evidence");
      }
    }
    const dyn = (secWorld.dynamic_scenarios || [])[0];
    if (!dyn) {
      fail("qa8-result must record a dynamic adversarial scenario");
    } else if (dyn.blocked_code === "BLOCKED_ENV_CAPABILITY") {
      // Legitimate when the CI-heavy qa8-adversarial harness has not run in
      // this job — unchanged from the original lock.
    } else if (dyn.status === "PASS" || dyn.status === "FAIL") {
      // Only legal once real run-qa8-adversarial.cjs evidence was actually
      // consumed (harness_probe.available proves it, not an invented PASS).
      if (!dyn.harness_probe || dyn.harness_probe.available !== true) {
        fail("qa8-result dynamic scenario PASS/FAIL must be backed by a fresh, available harness_probe (no mock PASS)");
      }
      if (dyn.status === "FAIL" && !(dyn.findings && dyn.findings.length)) {
        fail("qa8-result dynamic scenario FAIL must carry findings");
      }
    } else {
      fail(`qa8-result dynamic adversarial scenario has an unrecognized status/blocked_code combination: status=${dyn.status} blocked_code=${dyn.blocked_code}`);
    }
  }
  if (
    !qa8Result.critical_invariant_cumulative ||
    typeof qa8Result.critical_invariant_cumulative.blocked !== "number"
  ) {
    fail("qa8-result.critical_invariant_cumulative.blocked required");
  }
  {
    const qa8Dyn = ((qa8Result.checks || {}).security_privacy_world || {}).dynamic_scenarios || [];
    const qa8DynBlocked = qa8Dyn.some((d) => d.blocked_code === "BLOCKED_ENV_CAPABILITY");
    if (!Array.isArray(qa8Result.blocked_codes_observed)) {
      fail("qa8-result.blocked_codes_observed must be an array");
    } else if (qa8DynBlocked && !qa8Result.blocked_codes_observed.includes("BLOCKED_ENV_CAPABILITY")) {
      fail("qa8-result.blocked_codes_observed must include BLOCKED_ENV_CAPABILITY while the dynamic scenario is still blocked");
    } else if (!qa8DynBlocked && qa8Result.blocked_codes_observed.includes("BLOCKED_ENV_CAPABILITY")) {
      fail("qa8-result.blocked_codes_observed claims BLOCKED_ENV_CAPABILITY but no check/dynamic_scenario currently reports it");
    }
  }
  // FAIL findings must be linked in defects.v1.json (record, do not repair).
  const qa8Fails = ((qa8Result.checks || {}).security_privacy_world?.checks || []).filter(
    (c) => c.status === "FAIL",
  );
  for (const f of qa8Fails) {
    const linked = (defects.defects || []).some(
      (d) => d.suite_id === "QA8" && d.trace_id === `qa8:${f.check_id}`,
    );
    if (!linked) {
      fail(`qa8 FAIL ${f.check_id} must be recorded in defects.v1.json`);
    }
  }
  if (qa8Result.defects_counts) {
    const p0p1 = (qa8Result.defects_counts.P0 || 0) + (qa8Result.defects_counts.P1 || 0);
    if (p0p1 > 0 && qa8Result.verdict_contribution !== "ENGINE_NOT_ACCEPTED") {
      fail("qa8-result P0/P1 defects present must set verdict_contribution=ENGINE_NOT_ACCEPTED");
    }
  }
  if (defects && !ephemeralQa6Rewrite && !ephemeralPreQa9Rewrite && !currentEpochPreQa7Checkpoint) {
    if (defects.counts.P0 > 0 || defects.counts.P1 > 0) {
      if (evidence && evidence.verdict !== "ENGINE_NOT_ACCEPTED") {
        fail("evidence-manifest.verdict must be ENGINE_NOT_ACCEPTED when defects.P0/P1 > 0");
      }
    }
  }
  if (evidence && !ephemeralQa6Rewrite && !currentEpochPreQa7Checkpoint) {
    const qa8 = (evidence.suites || []).find((s) => s.suite_id === "QA8");
    if (qa8 && qa8.checksum !== qa8Result.checksum) {
      fail("evidence QA8.checksum must match qa8-result.checksum");
    }
    if (qa8 && String(qa8.run_id) !== String(qa8Result.run_id)) {
      fail("evidence QA8.run_id must match qa8-result.run_id");
    }
  }
}

// --- QA-9 acceptance report (final aggregation / verdict issuance — not a discovery suite) ---
let qa9Result;
try {
  qa9Result = readJson(`${GOV}/qa9-result.v1.json`);
} catch {
  fail("qa9-result.v1.json invalid JSON");
}
if (
  qa9Result &&
  !pendingRerun &&
  !currentEpochPreQa7Checkpoint &&
  !currentEpochPostQa7PreQa8Checkpoint &&
  !currentEpochPostQa8PreQa9Checkpoint
) {
  if (qa9Result.schema !== "governance.engine-acceptance.qa9-result.v1") {
    fail("qa9-result.schema mismatch");
  }
  if (qa9Result.suite_id !== "QA9") fail("qa9-result.suite_id must be QA9");
  if (qa9Result.completion_status !== "COMPLETE") {
    fail("qa9-result.completion_status must be COMPLETE");
  }
  if (qa9Result.aggregation_only !== true) {
    fail("qa9-result.aggregation_only must be true (QA9 is not a discovery suite)");
  }
  if (qa9Result.discovery_suite !== false) {
    fail("qa9-result.discovery_suite must be false");
  }
  if (baseline && qa9Result.baseline_id !== baseline.id) {
    fail("qa9-result.baseline_id must match current baseline.id");
  }
  if (!qa9Result.kill_switch || qa9Result.kill_switch.verified_before_checks !== true) {
    fail("qa9-result must record kill_switch.verified_before_checks");
  }
  if (qa9Result.product_mutation !== 0) fail("qa9-result.product_mutation must be 0");
  if (qa9Result.kpi_forbidden !== true) fail("qa9-result.kpi_forbidden must be true");
  if (qa9Result.mock_pass_forbidden !== true) {
    fail("qa9-result.mock_pass_forbidden must be true");
  }
  if (qa9Result.engine_accepted_for_ui === "ISSUED" && qa9Result.verdict !== "ENGINE_ACCEPTED_FOR_UI") {
    fail("qa9-result.engine_accepted_for_ui=ISSUED requires verdict=ENGINE_ACCEPTED_FOR_UI");
  }
  if (!["ENGINE_ACCEPTED_FOR_UI", "ENGINE_NOT_ACCEPTED", "ENGINE_QA_INCOMPLETE"].includes(qa9Result.verdict)) {
    fail("qa9-result.verdict must be one of the locked 3-state values");
  }
  // Independently re-derive the L1 formula from qa9-result's own recorded
  // formula_inputs and require its self-reported verdict to match — QA9 must
  // not hand-wave a verdict inconsistent with the inputs it itself recorded.
  const fi = qa9Result.formula_inputs;
  if (!fi) {
    fail("qa9-result.formula_inputs required");
  } else {
    const p0p1 = (fi.defects_P0 || 0) + (fi.defects_P1 || 0);
    let expected;
    if (p0p1 > 0) {
      expected = "ENGINE_NOT_ACCEPTED";
    } else if (
      !fi.mandatory_suite_complete ||
      (fi.critical_invariant_blocked || 0) > 0 ||
      (fi.critical_invariant_skipped || 0) > 0 ||
      (fi.critical_invariant_uncovered || 0) > 0 ||
      !fi.baseline_valid ||
      !fi.acceptance_scope_unchanged ||
      !fi.report_baseline_id_match ||
      !fi.evidence_integrity_valid
    ) {
      expected = "ENGINE_QA_INCOMPLETE";
    } else {
      expected = "ENGINE_ACCEPTED_FOR_UI";
    }
    if (qa9Result.verdict !== expected) {
      fail(
        `qa9-result.verdict=${qa9Result.verdict} does not match its own formula_inputs (expected ${expected})`,
      );
    }
    // While an earlier suite (QA4-QA8) has JUST been re-run in this same job
    // but QA9 has not yet been re-aggregated (ephemeralQa6Rewrite /
    // ephemeralPreQa9Rewrite), the committed qa9-result.v1.json is EXPECTED
    // to be momentarily behind live defects.v1.json - that is exactly what
    // "pending re-aggregation" means, not a staleness violation. Once QA9
    // itself re-runs it will either match or the run fails on its own
    // internal-consistency check above.
    if (defects && !ephemeralQa6Rewrite && !ephemeralPreQa9Rewrite && !currentEpochPreQa7Checkpoint) {
      if ((fi.defects_P0 || 0) !== (defects.counts.P0 || 0)) {
        fail("qa9-result.formula_inputs.defects_P0 must match live defects.v1.json counts.P0");
      }
      if ((fi.defects_P1 || 0) !== (defects.counts.P1 || 0)) {
        fail("qa9-result.formula_inputs.defects_P1 must match live defects.v1.json counts.P1");
      }
    }
  }
  if (Array.isArray(qa9Result.p0_security_findings)) {
    // Generic, evidence-derived requirement: EVERY currently-recorded P0
    // defect (whichever check it actually is, not a single hardcoded name)
    // must be visible in p0_security_findings - a specific historical
    // defect id must never be hardcoded as the only thing that counts.
    const currentP0TraceIds = (defects ? defects.defects : []).filter((d) => d.severity === "P0").map((d) => d.trace_id);
    const visibleTraceIds = new Set(qa9Result.p0_security_findings.map((f) => f.trace_id));
    const missingP0 = currentP0TraceIds.filter((tid) => !visibleTraceIds.has(tid));
    if (missingP0.length > 0) {
      fail(`qa9-result.p0_security_findings must keep every current P0 defect visible - missing: ${missingP0.join(", ")}`);
    }
  } else {
    fail("qa9-result.p0_security_findings must be an array (P0 must stay visible, not buried)");
  }
  if (qa9Result.verdict === "ENGINE_NOT_ACCEPTED" || qa9Result.verdict === "ENGINE_QA_INCOMPLETE") {
    if (qa9Result.engine_accepted_for_ui !== "NOT_ISSUED") {
      fail("qa9-result.engine_accepted_for_ui must be NOT_ISSUED when verdict is not ACCEPTED");
    }
    if (qa9Result.ui_ux_entry_gate !== "CLOSED") {
      fail("qa9-result.ui_ux_entry_gate must be CLOSED when verdict is not ACCEPTED");
    }
  }
  if (evidence && !ephemeralQa6Rewrite && !ephemeralPreQa9Rewrite && !currentEpochPreQa7Checkpoint) {
    const qa9 = (evidence.suites || []).find((s) => s.suite_id === "QA9");
    if (qa9 && qa9.checksum !== qa9Result.checksum) {
      fail("evidence QA9.checksum must match qa9-result.checksum");
    }
    if (qa9 && String(qa9.run_id) !== String(qa9Result.run_id)) {
      fail("evidence QA9.run_id must match qa9-result.run_id");
    }
    if (evidence.verdict !== qa9Result.verdict) {
      fail("evidence-manifest.verdict must match qa9-result.verdict");
    }
  }
}

const report = fs.existsSync(path.join(ROOT, `${GOV}/ENGINE_ACCEPTANCE_REPORT.md`))
  ? fs.readFileSync(path.join(ROOT, `${GOV}/ENGINE_ACCEPTANCE_REPORT.md`), "utf8")
  : "";
// QA6 budget may now be SPECIFIED (Human/PO ACK) instead of UNSPECIFIED_PERF_BUDGET —
// the REPORT must mention whichever is the CURRENT qa6-result.v1.json status, not a
// permanently-fixed string from before the V1 budget was approved.
const qa6PerfWorld = qa6Result && qa6Result.checks && qa6Result.checks.performance_world;
const qa6BudgetSpecified = Boolean(qa6PerfWorld && qa6PerfWorld.status !== "UNSPECIFIED_PERF_BUDGET");
// Same idea for QA8's dynamic adversarial scenario: BLOCKED_ENV_CAPABILITY is
// only the CURRENT truth while no CI-heavy harness evidence was consumed.
const qa8SecWorld = qa8Result && qa8Result.checks && qa8Result.checks.security_privacy_world;
const qa8DynScenario = qa8SecWorld && (qa8SecWorld.dynamic_scenarios || [])[0];
const qa8DynamicBlocked = Boolean(qa8DynScenario && qa8DynScenario.blocked_code === "BLOCKED_ENV_CAPABILITY");
if (report) {
  if (/verdict\s*[:=]\s*`?ENGINE_ACCEPTED_FOR_UI/i.test(report)) {
    fail("REPORT must not claim ENGINE_ACCEPTED_FOR_UI before full suites");
  }
  if (pendingRerun) {
    if (!report.includes("ENGINE_ACCEPTANCE_REBASE_V1")) {
      fail("REPORT must name ENGINE_ACCEPTANCE_REBASE_V1 after product rebase");
    }
    if (!report.includes("STALE")) {
      fail("REPORT must declare QA1-QA6 STALE for current epoch");
    }
    if (!report.includes("QA1_DETERMINISTIC_TRUTH")) {
      fail("REPORT must declare NEXT=QA1_DETERMINISTIC_TRUTH after rebase");
    }
  } else if (ephemeralQa6Rewrite) {
    if (!report.includes("QA7_AI_EVAL")) {
      fail("ephemeral QA6 REPORT must declare NEXT=QA7_AI_EVAL");
    }
    if (!report.includes("QA6 = COMPLETE")) {
      fail("REPORT banner must include QA6 = COMPLETE");
    }
    if (qa6BudgetSpecified ? !report.includes("SPECIFIED") : !report.includes("UNSPECIFIED_PERF_BUDGET")) {
      fail(`REPORT must mention QA6's current budget status (${qa6BudgetSpecified ? "SPECIFIED" : "UNSPECIFIED_PERF_BUDGET"})`);
    }
    if (!report.includes("threshold") && !report.includes("Threshold")) {
      fail("REPORT must mention threshold mechanism");
    }
    if (!report.includes("CI only") && !report.includes("ci only") && !report.includes("CI-only")) {
      fail("REPORT must mention CI only heavy k6");
    }
    if (!report.includes("retention") && !report.includes("90")) {
      fail("REPORT must mention artifact retention ≥90");
    }
    if (!report.includes("always()")) {
      fail("REPORT must mention aggregator if: always()");
    }
    if (!report.includes("PRODUCT MUTATION = 0") && !report.includes("product mutation")) {
      fail("REPORT must state product mutation 0");
    }
  } else if (ephemeralPreQa9Rewrite) {
    // Live REPORT.md was just regenerated by run-qa8.cjs (predates QA9) in
    // the QA8-era shape - require exactly what that regeneration produces.
    if (!report.includes("QA9_ACCEPTANCE_REPORT")) {
      fail("ephemeral pre-QA9 rewrite REPORT must declare NEXT=QA9_ACCEPTANCE_REPORT");
    }
    if (!report.includes("QA7 = COMPLETE")) {
      fail("REPORT banner must include QA7 = COMPLETE");
    }
    if (!report.includes("QA8 = COMPLETE")) {
      fail("REPORT banner must include QA8 = COMPLETE");
    }
    if (!report.includes("QA6 = COMPLETE")) {
      fail("REPORT banner must include QA6 = COMPLETE");
    }
    if (qa6BudgetSpecified ? !report.includes("SPECIFIED") : !report.includes("UNSPECIFIED_PERF_BUDGET")) {
      fail(`REPORT must mention QA6's current budget status (${qa6BudgetSpecified ? "SPECIFIED" : "UNSPECIFIED_PERF_BUDGET"}, QA6 record retained)`);
    }
    if (!report.includes("threshold") && !report.includes("Threshold")) {
      fail("REPORT must mention threshold mechanism");
    }
    if (!report.includes("CI only") && !report.includes("ci only") && !report.includes("CI-only")) {
      fail("REPORT must mention CI only heavy k6");
    }
    if (!report.includes("retention") && !report.includes("90")) {
      fail("REPORT must mention artifact retention ≥90");
    }
    if (!report.includes("always()")) {
      fail("REPORT must mention aggregator if: always()");
    }
    if (!report.includes("PRODUCT MUTATION = 0") && !report.includes("product mutation")) {
      fail("REPORT must state product mutation 0");
    }
    if (!report.includes("ASVS") || !report.includes("5.0.0")) {
      fail("REPORT must cite ASVS 5.0.0 (QA8 subset)");
    }
    if (qa8DynamicBlocked && !/BLOCKED_ENV_CAPABILITY/.test(report)) {
      fail("REPORT must record QA8 dynamic-scenario BLOCKED_ENV_CAPABILITY while it is still blocked (no mock PASS)");
    }
    if (!qa8DynamicBlocked && !/SEC-DYNAMIC-ADVERSARIAL-01/.test(report)) {
      fail("REPORT must still name the QA8 dynamic-adversarial scenario even once it is no longer BLOCKED");
    }
    if (!/not repaired|Not repaired|discovery only/i.test(report)) {
      fail("REPORT must state QA8 findings are not repaired this wave (discovery only)");
    }
    if (!report.includes("ENGINE_NOT_ACCEPTED") && !report.includes("ENGINE_QA_INCOMPLETE")) {
      fail("REPORT verdict must be ENGINE_NOT_ACCEPTED or ENGINE_QA_INCOMPLETE (never ACCEPTED)");
    }
  } else if (currentEpochPreQa7Checkpoint) {
    assertCurrentEpochPreQa7Report(report, fail);
  } else if (currentEpochPostQa7PreQa8Checkpoint) {
    assertCurrentEpochPostQa7PreQa8Report(report, fail);
  } else if (currentEpochPostQa8PreQa9Checkpoint) {
    assertCurrentEpochPostQa8PreQa9Report(report, fail);
  } else {
    if (!report.includes("QA9 = COMPLETE")) {
      fail("REPORT banner must include QA9 = COMPLETE");
    }
    if (
      !report.includes("03_blocked_fix_round") &&
      !report.includes("03_blocked_incomplete") &&
      !report.includes("03_ui_entry_unlocked")
    ) {
      fail(
        "REPORT must declare a QA9 NEXT state (03_blocked_fix_round|03_blocked_incomplete|03_ui_entry_unlocked)",
      );
    }
    if (!report.includes("QA7 = COMPLETE")) {
      fail("REPORT banner must include QA7 = COMPLETE");
    }
    if (!report.includes("QA8 = COMPLETE")) {
      fail("REPORT banner must include QA8 = COMPLETE");
    }
    if (!report.includes("QA6 = COMPLETE")) {
      fail("REPORT banner must include QA6 = COMPLETE");
    }
    if (qa6BudgetSpecified ? !report.includes("SPECIFIED") : !report.includes("UNSPECIFIED_PERF_BUDGET")) {
      fail(`REPORT must mention QA6's current budget status (${qa6BudgetSpecified ? "SPECIFIED" : "UNSPECIFIED_PERF_BUDGET"}, QA6 record retained)`);
    }
    if (!report.includes("threshold") && !report.includes("Threshold")) {
      fail("REPORT must mention threshold mechanism");
    }
    if (!report.includes("CI only") && !report.includes("ci only") && !report.includes("CI-only")) {
      fail("REPORT must mention CI only heavy k6");
    }
    if (!report.includes("retention") && !report.includes("90")) {
      fail("REPORT must mention artifact retention ≥90");
    }
    if (!report.includes("always()")) {
      fail("REPORT must mention aggregator if: always()");
    }
    if (!report.includes("PRODUCT MUTATION = 0") && !report.includes("product mutation")) {
      fail("REPORT must state product mutation 0");
    }
    if (!report.includes("ASVS") || !report.includes("5.0.0")) {
      fail("REPORT must cite ASVS 5.0.0 (QA8 subset)");
    }
    if (qa8DynamicBlocked && !/BLOCKED_ENV_CAPABILITY/.test(report)) {
      fail("REPORT must record QA8 dynamic-scenario BLOCKED_ENV_CAPABILITY while it is still blocked (no mock PASS)");
    }
    if (!qa8DynamicBlocked && !/SEC-DYNAMIC-ADVERSARIAL-01/.test(report)) {
      fail("REPORT must still name the QA8 dynamic-adversarial scenario even once it is no longer BLOCKED");
    }
    if (!/not repaired|Not repaired|discovery only/i.test(report)) {
      fail("REPORT must state findings are not repaired this wave (discovery/aggregation only)");
    }
    // Independently re-derive the REPORT's verdict-text requirement from
    // qa9Result.verdict, which was already cross-checked above (its own
    // formula_inputs re-derivation at L1756-1785, the evidence-manifest
    // match at L1832-1834, and the live defects.v1.json match) - a superset
    // of a blanket "never ACCEPTED" rule, not a relaxation of one: it also
    // catches a report that names the WRONG one of the two non-accepted
    // states, and only lets "ACCEPTED" appear in the text once every one of
    // those independent formula checks has already passed.
    if (
      !["ENGINE_ACCEPTED_FOR_UI", "ENGINE_NOT_ACCEPTED", "ENGINE_QA_INCOMPLETE"].includes(qa9Result.verdict) ||
      !report.includes(qa9Result.verdict)
    ) {
      fail(`REPORT must state the current qa9-result.verdict (${qa9Result.verdict})`);
    }
    // QA9-specific: EVERY currently-recorded P0 defect must remain
    // prominently visible in the final report, not buried only in
    // defects.v1.json - generic over whichever check(s) are actually P0
    // right now, never a single hardcoded historical defect name.
    const reportMissingP0 = (defects ? defects.defects : [])
      .filter((d) => d.severity === "P0")
      .map((d) => d.trace_id)
      .filter((tid) => !report.includes(tid) && !report.includes(String(tid).replace(/^qa\d+:/, "")));
    if (reportMissingP0.length > 0) {
      fail(`REPORT must keep every current P0 finding visible - missing: ${reportMissingP0.join(", ")}`);
    }
    if (!/P0_SECURITY_FINDINGS/i.test(report) && !/P0\b.*(finding|security)/i.test(report)) {
      fail("REPORT must include a P0 security findings section");
    }
    if (!/REPAIR_ENTRY_POINT/i.test(report)) {
      fail("REPORT must include a REPAIR_ENTRY_POINT section");
    }
    const policyV2 =
      rebaseLedger &&
      rebaseLedger.rebase_policy &&
      rebaseLedger.rebase_policy.current_version === "ENGINE_ACCEPTANCE_REBASE_POLICY_V2";
    if (!policyV2) {
      if (!/HUMAN_PO_APPROVAL_REQUIRED/i.test(report)) {
        fail("REPORT must record HUMAN_PO_APPROVAL_REQUIRED items (rebase governance gap) rather than silently resolving them");
      }
    } else {
      if (!/ENGINE_ACCEPTANCE_REBASE_POLICY_V2/.test(report)) {
        fail("REPORT must record applied ENGINE_ACCEPTANCE_REBASE_POLICY_V2 rebase topology repair");
      }
      if (!/HUMAN_PO_APPROVAL_REQUIRED/i.test(report) && !/REBASE_GOVERNANCE_GAP/.test(report)) {
        fail("REPORT must keep the rebase governance gap history visible after policy V2 repair");
      }
      if (!/L8_REBASE_GOVERNANCE_GAP_REPAIR/i.test(report) && !/rebase-policy-qa8-qa9-topology/.test(report)) {
        fail("REPORT must name the L8 rebase governance gap repair amendment");
      }
    }
  }
}

// --- workflow L5 ---
const wfPath = path.join(ROOT, ".github/workflows/engine-acceptance.yml");
if (fs.existsSync(wfPath)) {
  const wf = fs.readFileSync(wfPath, "utf8");
  if (!/fail-fast:\s*false/.test(wf)) fail("workflow must set strategy.fail-fast: false");
  if (!/concurrency:/.test(wf)) fail("workflow must define concurrency group");
  if (!/group:\s*engine-acceptance-/.test(wf)) {
    fail("workflow concurrency.group must be engine-acceptance-*");
  }
  if (!/workflow_dispatch:/.test(wf)) fail("workflow must allow workflow_dispatch");
  if (!/if:\s*(\$\{\{\s*always\(\)\s*\}\}|always\(\))/.test(wf)) {
    fail("workflow aggregator must use if: always()");
  }
  if (!/retention-days:\s*90/.test(wf)) fail("workflow artifact retention-days must be ≥90");
  if (!/run-qa1\.cjs/.test(wf)) fail("workflow must invoke run-qa1.cjs for QA1");
  if (!/run-qa2\.cjs/.test(wf)) fail("workflow must invoke run-qa2.cjs for QA2");
  if (!/run-qa3\.cjs/.test(wf)) fail("workflow must invoke run-qa3.cjs for QA3");
  if (!/run-qa4\.cjs/.test(wf)) fail("workflow must invoke run-qa4.cjs for QA4");
  if (!/run-qa5\.cjs/.test(wf)) fail("workflow must invoke run-qa5.cjs for QA5");
  if (!/run-qa6\.cjs/.test(wf)) fail("workflow must invoke run-qa6.cjs for QA6");
  if (!/run-qa7\.cjs/.test(wf)) fail("workflow must invoke run-qa7.cjs for QA7");
  if (!/run-qa8\.cjs/.test(wf)) fail("workflow must invoke run-qa8.cjs for QA8");
  if (!/engine-acceptance-QA7-raw-traces/.test(wf)) {
    fail("workflow must upload engine-acceptance-QA7-raw-traces");
  }
  if (!/qa6-result\.v1\.json/.test(wf)) {
    fail("workflow aggregator/artifacts must include qa6-result.v1.json");
  }
  if (!/qa8-result\.v1\.json/.test(wf)) {
    fail("workflow aggregator/artifacts must include qa8-result.v1.json");
  }
  if (!/perf-budget\.v1\.json/.test(wf)) {
    fail("workflow aggregator/artifacts must include perf-budget.v1.json");
  }
  if (!/qa-matrix:/.test(wf) && !/matrix:/.test(wf)) {
    fail("workflow must define CI matrix for generative suites");
  }
  // aggregator always() already checked; retention ≥90 already checked
  const alwaysCount = (wf.match(/if:\s*\$\{\{\s*always\(\)\s*\}\}/g) || []).length;
  if (alwaysCount < 2) {
    fail("workflow must use if: always() on aggregator and artifact upload steps");
  }
}

// --- L6 kill-switch before smoke ---
const denyProd = evaluateKillSwitch({
  target_env: "production",
  hostname: "localhost",
  synthetic_account_namespace: "qa-synth-x",
});
if (denyProd.ok) fail("kill-switch must reject target_env=production");

const denyHost = evaluateKillSwitch({
  target_env: "local",
  hostname: "www.peotteok.com",
  synthetic_account_namespace: "qa-synth-x",
});
if (denyHost.ok) fail("kill-switch must reject production-like hostname");

const denyNs = evaluateKillSwitch({
  target_env: "local",
  hostname: "localhost",
  synthetic_account_namespace: "prod-users",
});
if (denyNs.ok) fail("kill-switch must reject non-synthetic namespace");

let smokeBlocked = false;
try {
  runTinySmoke({
    target_env: "production",
    hostname: "localhost",
    synthetic_account_namespace: "qa-synth-x",
  });
} catch (e) {
  smokeBlocked = e && e.code === "AIPO_QA_KILL_SWITCH";
}
if (!smokeBlocked) {
  fail("tiny-smoke must abort via kill-switch before running when unsafe");
}

let smokeOk = false;
try {
  const r = runTinySmoke({
    target_env: "local",
    hostname: "localhost",
    synthetic_account_namespace: "qa-synth-local",
  });
  smokeOk = r && r.status === "SMOKE_OK";
} catch (e) {
  fail(`tiny-smoke safe path failed: ${e.message}`);
}
if (!smokeOk) fail("tiny-smoke safe path must return SMOKE_OK after kill-switch");

const { runQa1 } = require("../engine-acceptance/run-qa1.cjs");
let qa1Blocked = false;
try {
  runQa1({
    target_env: "production",
    hostname: "localhost",
    synthetic_account_namespace: "qa-synth-x",
  });
} catch (e) {
  qa1Blocked = e && e.code === "AIPO_QA_KILL_SWITCH";
}
if (!qa1Blocked) {
  fail("run-qa1 must abort via kill-switch before checks when unsafe");
}

const { runQa2 } = require("../engine-acceptance/run-qa2.cjs");
let qa2Blocked = false;
try {
  runQa2({
    target_env: "production",
    hostname: "localhost",
    synthetic_account_namespace: "qa-synth-x",
    mode: "tiny",
  });
} catch (e) {
  qa2Blocked = e && e.code === "AIPO_QA_KILL_SWITCH";
}
if (!qa2Blocked) {
  fail("run-qa2 must abort via kill-switch before checks when unsafe");
}

const { runQa3 } = require("../engine-acceptance/run-qa3.cjs");
let qa3Blocked = false;
try {
  runQa3({
    target_env: "production",
    hostname: "localhost",
    synthetic_account_namespace: "qa-synth-x",
    mode: "tiny",
  });
} catch (e) {
  qa3Blocked = e && e.code === "AIPO_QA_KILL_SWITCH";
}
if (!qa3Blocked) {
  fail("run-qa3 must abort via kill-switch before checks when unsafe");
}

const { runQa4 } = require("../engine-acceptance/run-qa4.cjs");
let qa4Blocked = false;
try {
  runQa4({
    target_env: "production",
    hostname: "localhost",
    synthetic_account_namespace: "qa-synth-x",
    mode: "tiny",
  });
} catch (e) {
  qa4Blocked = e && e.code === "AIPO_QA_KILL_SWITCH";
}
if (!qa4Blocked) {
  fail("run-qa4 must abort via kill-switch before checks when unsafe");
}

const { runQa5 } = require("../engine-acceptance/run-qa5.cjs");
let qa5Blocked = false;
try {
  runQa5({
    target_env: "production",
    hostname: "localhost",
    synthetic_account_namespace: "qa-synth-x",
    mode: "tiny",
  });
} catch (e) {
  qa5Blocked = e && e.code === "AIPO_QA_KILL_SWITCH";
}
if (!qa5Blocked) {
  fail("run-qa5 must abort via kill-switch before checks when unsafe");
}

const { runQa6 } = require("../engine-acceptance/run-qa6.cjs");
let qa6Blocked = false;
try {
  runQa6({
    target_env: "production",
    hostname: "localhost",
    synthetic_account_namespace: "qa-synth-x",
    mode: "tiny",
  });
} catch (e) {
  qa6Blocked = e && e.code === "AIPO_QA_KILL_SWITCH";
}
if (!qa6Blocked) {
  fail("run-qa6 must abort via kill-switch before checks when unsafe");
}

const { runQa8 } = require("../engine-acceptance/run-qa8.cjs");
let qa8Blocked = false;
try {
  runQa8({
    target_env: "production",
    hostname: "localhost",
    synthetic_account_namespace: "qa-synth-x",
    mode: "tiny",
  });
} catch (e) {
  qa8Blocked = e && e.code === "AIPO_QA_KILL_SWITCH";
}
if (!qa8Blocked) {
  fail("run-qa8 must abort via kill-switch before checks when unsafe");
}

const { runQa9 } = require("../engine-acceptance/run-qa9.cjs");
let qa9Blocked = false;
try {
  runQa9({
    target_env: "production",
    hostname: "localhost",
    synthetic_account_namespace: "qa-synth-x",
  });
} catch (e) {
  qa9Blocked = e && e.code === "AIPO_QA_KILL_SWITCH";
}
if (!qa9Blocked) {
  fail("run-qa9 must abort via kill-switch before checks when unsafe");
}

// POST_QA0_CONTROLLED_WORKFLOW_AMENDMENT_V1 governance
let amendmentLedger;
try {
  amendmentLedger = loadLedger(LEDGER_REL);
} catch {
  fail("workflow-amendments.v1.json invalid JSON");
}
if (baseline && amendmentLedger) {
  let evidenceForAmend = null;
  try {
    evidenceForAmend = readJson(`${GOV}/evidence-manifest.v1.json`);
  } catch {
    evidenceForAmend = null;
  }
  verifyGovernanceAgainstBaseline(
    baseline,
    scope,
    amendmentLedger,
    evidenceForAmend,
    fails,
    rebaseLedger,
  );
}
assertRunnersForbidSilentWorkflowSync(fails);
try {
  selftestWorkflowAmendment();
} catch (e) {
  fail(`workflow-amendment selftest threw: ${e && e.message ? e.message : e}`);
}
try {
  selftestProductRebase();
} catch (e) {
  fail(`product-rebase selftest threw: ${e && e.message ? e.message : e}`);
}
try {
  const { run: selftestQa7 } = require("../engine-acceptance/selftest-qa7.cjs");
  selftestQa7();
} catch (e) {
  fail(`qa7 selftest threw: ${e && e.message ? e.message : e}`);
}
try {
  const harnessSelf = require("../engine-acceptance/selftest-pre-rebase-harness.cjs");
  const out = harnessSelf.run();
  if (out && Array.isArray(out.fails) && out.fails.length) {
    for (const f of out.fails) fail(`pre-rebase harness: ${f}`);
  }
} catch (e) {
  fail(`pre-rebase harness selftest threw: ${e && e.message ? e.message : e}`);
}
if (amendmentLedger && amendmentLedger.decision_id !== DECISION_ID) {
  fail(`decision_id must be ${DECISION_ID}`);
}

// workflow hash in baseline matches file
if (baseline && fs.existsSync(wfPath) && scope) {
  const live = hashPathList(scope.aggregateHashes.acceptance_workflow_hash, scope);
  if (baseline.acceptance_workflow_hash !== live) {
    fail("acceptance_workflow_hash drift");
  }
}

if (fails.length) {
  console.error("[verify:engine-acceptance] FAIL (QA-0..QA-9)");
  for (const f of fails) console.error(`  - ${f}`);
  process.exit(1);
}

console.log("[verify:engine-acceptance] PASS (QA-0..QA-9 scope)");
console.log("  ACCEPTANCE CONTRACT = LOCKED");
console.log(pendingRerun ? "  BASELINE = NEW_EPOCH (REBASE PENDING RERUN)" : "  BASELINE = FROZEN");
console.log("  GOVERNANCE_DECISION = POST_QA0_CONTROLLED_WORKFLOW_AMENDMENT_V1");
console.log(`  REBASE_DECISION = ${REBASE_DECISION_ID}`);
console.log("  WORKFLOW_HASH_POLICY = CONTROLLED_AMENDMENT_ONLY");
console.log("  LEGACY_AUTO_SYNC_STATUS = MUST_BE_GATED");
if (pendingRerun) {
  console.log("  QA1-QA6 = STALE_FOR_CURRENT_EPOCH");
  console.log("  NEXT = QA1_DETERMINISTIC_TRUTH");
} else if (ephemeralQa6Rewrite) {
  console.log("  QA1-QA5 = COMPLETE (ephemeral QA6 CI rewrite in this job workspace)");
  console.log("  NEXT = QA7_AI_EVAL");
} else if (ephemeralPreQa9Rewrite) {
  console.log("  QA1-QA8 = COMPLETE (ephemeral QA8 CI rewrite predates QA9 in this job workspace)");
  console.log("  NEXT = QA9_ACCEPTANCE_REPORT");
} else if (currentEpochPreQa7Checkpoint) {
  console.log("  QA0-QA6 = COMPLETE");
  console.log("  QA7 = NOT_STARTED");
  console.log("  QA8 = NOT_STARTED");
  console.log("  QA9 = NOT_STARTED / STALE_AGGREGATION");
  console.log("  NEXT = QA7_AI_EVAL");
  console.log("  VERDICT = ENGINE_QA_INCOMPLETE");
  console.log("  ENGINE_ACCEPTED_FOR_UI = NOT_ISSUED");
  console.log("  UI_UX_ENTRY_GATE = CLOSED");
} else if (currentEpochPostQa7PreQa8Checkpoint) {
  console.log("  QA0-QA7 = COMPLETE");
  console.log("  QA8 = NOT_STARTED");
  console.log("  QA9 = NOT_STARTED / STALE_AGGREGATION");
  console.log("  NEXT = QA8_SECURITY_PRIVACY");
  console.log("  VERDICT = ENGINE_QA_INCOMPLETE");
  console.log("  ENGINE_ACCEPTED_FOR_UI = NOT_ISSUED");
  console.log("  UI_UX_ENTRY_GATE = CLOSED");
} else if (currentEpochPostQa8PreQa9Checkpoint) {
  console.log("  QA0-QA8 = COMPLETE");
  console.log("  QA9 = NOT_STARTED / STALE_AGGREGATION");
  console.log("  NEXT = QA9_ACCEPTANCE_REPORT");
  console.log(`  VERDICT = ${(evidence && evidence.verdict) || "UNKNOWN"}`);
  console.log("  ENGINE_ACCEPTED_FOR_UI = NOT_ISSUED");
  console.log("  UI_UX_ENTRY_GATE = CLOSED");
} else {
  console.log("  QA1 = COMPLETE");
  console.log("  QA2 = COMPLETE");
  console.log("  QA3 = COMPLETE");
  console.log("  QA4 = COMPLETE");
  console.log("  QA5 = COMPLETE");
  console.log("  QA6 = COMPLETE");
  console.log("  QA7 = COMPLETE");
  console.log("  QA8 = COMPLETE");
  console.log("  QA9 = COMPLETE");
  const finalVerdict = (evidence && evidence.verdict) || "UNKNOWN";
  console.log(`  VERDICT = ${finalVerdict}`);
  console.log(
    `  ENGINE_ACCEPTED_FOR_UI = ${finalVerdict === "ENGINE_ACCEPTED_FOR_UI" ? "ISSUED" : "NOT_ISSUED"}`,
  );
  console.log(
    `  UI_UX_ENTRY_GATE = ${finalVerdict === "ENGINE_ACCEPTED_FOR_UI" ? "OPEN" : "CLOSED"}`,
  );
}
console.log("  QA HARNESS TARGET = SAFE");
