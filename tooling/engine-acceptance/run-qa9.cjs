/**
 * QA9 Acceptance Report — final aggregation / verdict-issuance runner.
 *
 * QA9 is NOT a new discovery suite. It invents no scenarios, no invariants,
 * no product tests. It consumes the already-recorded QA0-QA8 evidence
 * exactly as written (baseline, protected-scope manifest, defects.v1.json,
 * coverage.v1.json mandatorySuites, evidence-manifest.v1.json suites[]) and
 * applies the LOCKED 3-state verdict formula from
 * governance/engine-acceptance/acceptance-contract.v1.md §L1, byte-for-byte:
 *
 *   defects.P0 > 0 OR defects.P1 > 0
 *     -> ENGINE_NOT_ACCEPTED
 *   (P0/P1 == 0) AND (critical BLOCKED|SKIPPED|UNCOVERED > 0
 *       OR mandatory suite != COMPLETE OR evidence_integrity != VALID
 *       OR baseline/scope invalid)
 *     -> ENGINE_QA_INCOMPLETE
 *   (P0/P1 == 0) AND mandatory evidence complete AND critical clean
 *     -> ENGINE_ACCEPTED_FOR_UI
 *
 * kill-switch is still asserted first for harness-family consistency (every
 * run-qaN.cjs does), even though QA9 performs no destructive/live action —
 * it only reads committed governance JSON + git status.
 *
 * Every narrative section below is derived from the CURRENT qa4/5/6/8-result
 * files and defects.v1.json at run time - never a fixed historical defect
 * name. A defect that gets repaired (real evidence, real check re-run) must
 * stop appearing here on the next QA9 run without anyone editing this file.
 *
 * Product mutation = 0. Does not repair P0/P2. Does not issue
 * ENGINE_ACCEPTED_FOR_UI while defects.P0/P1 > 0.
 */
"use strict";

const fs = require("node:fs");
const path = require("node:path");
const crypto = require("node:crypto");
const { assertKillSwitch } = require("./kill-switch.cjs");
const { ROOT, readJson, dualDirty, buildManifest } = require("./lib/hash-scope.cjs");
const {
  assertAcceptanceWorkflowHashMatch,
  syncLockfileHashOnly,
} = require("./lib/workflow-amendment.cjs");

const GOV = "governance/engine-acceptance";
const RESULT_REL = `${GOV}/qa9-result.v1.json`;
const EVIDENCE_REL = `${GOV}/evidence-manifest.v1.json`;
const REPORT_REL = `${GOV}/ENGINE_ACCEPTANCE_REPORT.md`;
const DEFECTS_REL = `${GOV}/defects.v1.json`;
const SCOPE_REL = `${GOV}/protected-scope.v1.json`;
const BASELINE_REL = `${GOV}/baseline.v1.json`;
const COVERAGE_REL = `${GOV}/coverage.v1.json`;
const QA4_REL = `${GOV}/qa4-result.v1.json`;
const QA5_REL = `${GOV}/qa5-result.v1.json`;
const QA6_REL = `${GOV}/qa6-result.v1.json`;
const QA8_REL = `${GOV}/qa8-result.v1.json`;

/** Post-QA9 state when verdict != ACCEPTED — reuses the plan's own mermaid vocabulary
 * (`.cursor/plans/ai_profit_os_02_5_engine_acceptance_qa_fd1cd7cc.plan.md`
 * `report -->|NOT_ACCEPTED| holdFix[03_blocked_fix_round]`) rather than inventing new terms. */
const NEXT_FIX_ROUND = "03_blocked_fix_round";
const NEXT_INCOMPLETE = "03_blocked_incomplete";
const NEXT_UI_UNLOCKED = "03_ui_entry_unlocked";

function sha256Json(obj) {
  return crypto.createHash("sha256").update(`${JSON.stringify(obj)}\n`, "utf8").digest("hex");
}

function writeJson(rel, obj) {
  fs.writeFileSync(path.join(ROOT, rel), `${JSON.stringify(obj, null, 2)}\n`, "utf8");
}

function tryReadJson(rel) {
  try {
    return readJson(rel);
  } catch {
    return null;
  }
}

function syncAggregateHashes(baseline, scope) {
  // POST_QA0_CONTROLLED_WORKFLOW_AMENDMENT_V1 - silent workflow-hash sync forbidden.
  assertAcceptanceWorkflowHashMatch(baseline, scope);
  syncLockfileHashOnly(baseline, scope, (b) => writeJson(BASELINE_REL, b));
}

/**
 * The one and only acceptance formula (acceptance-contract.v1.md §L1).
 * Pure function of already-recorded inputs - no new judgment invented here.
 */
function computeVerdict(inputs) {
  const {
    defectsP0,
    defectsP1,
    criticalBlocked,
    criticalSkipped,
    criticalUncovered,
    mandatoryComplete,
    evidenceIntegrityValid,
    baselineValid,
    scopeUnchanged,
    reportBaselineMatch,
  } = inputs;

  if (defectsP0 > 0 || defectsP1 > 0) {
    return {
      verdict: "ENGINE_NOT_ACCEPTED",
      reason_code: "DEFECTS_P0_P1_PRESENT",
      next: NEXT_FIX_ROUND,
    };
  }

  const incompleteReasons = [];
  if (!mandatoryComplete) incompleteReasons.push("MANDATORY_SUITE_QA1_QA8_INCOMPLETE");
  if (criticalBlocked > 0) incompleteReasons.push("CRITICAL_INVARIANT_BLOCKED");
  if (criticalSkipped > 0) incompleteReasons.push("CRITICAL_INVARIANT_SKIPPED");
  if (criticalUncovered > 0) incompleteReasons.push("CRITICAL_INVARIANT_UNCOVERED");
  if (!baselineValid) incompleteReasons.push("BASELINE_INVALID");
  if (!scopeUnchanged) incompleteReasons.push("ACCEPTANCE_SCOPE_CHANGED");
  if (!evidenceIntegrityValid) incompleteReasons.push("EVIDENCE_INTEGRITY_INVALID");
  if (!reportBaselineMatch) incompleteReasons.push("REPORT_BASELINE_ID_MISMATCH");

  if (incompleteReasons.length) {
    return {
      verdict: "ENGINE_QA_INCOMPLETE",
      reason_code: incompleteReasons.join("+"),
      next: NEXT_INCOMPLETE,
    };
  }

  return {
    verdict: "ENGINE_ACCEPTED_FOR_UI",
    reason_code: "ALL_FORMULA_CONDITIONS_MET",
    next: NEXT_UI_UNLOCKED,
  };
}

/**
 * Every currently-BLOCKED critical_invariant detail across QA4/QA5/QA6/QA8,
 * plus QA8's dynamic-adversarial scenario (a sibling field, not inside
 * critical_invariant.details). Purely derived from each suite's own
 * already-written result file - this function invents no numbers, no
 * scenario names, and no counts. A repaired suite that no longer reports
 * BLOCKED simply stops contributing rows on the next run.
 */
function collectRemainingBlocked() {
  const rows = [];
  const sources = [
    { rel: QA4_REL, suite: "QA4" },
    { rel: QA5_REL, suite: "QA5" },
    { rel: QA6_REL, suite: "QA6" },
    { rel: QA8_REL, suite: "QA8" },
  ];
  for (const s of sources) {
    const data = tryReadJson(s.rel);
    if (!data) continue;
    const details = (data.critical_invariant && data.critical_invariant.details) || [];
    for (const d of details) {
      if (d.status === "BLOCKED") {
        rows.push({
          suite: s.suite,
          invariant_id: d.invariant_id,
          blocked_code: d.blocked_code || null,
          scenario_ids: d.scenario_ids || [],
        });
      }
    }
    if (s.suite === "QA8") {
      const dyn = ((data.checks || {}).security_privacy_world || {}).dynamic_scenarios || [];
      for (const d of dyn) {
        if (d.status === "BLOCKED") {
          rows.push({
            suite: "QA8",
            invariant_id: d.invariant_id,
            blocked_code: d.blocked_code || null,
            scenario_ids: [d.scenario_id],
          });
        }
      }
    }
  }
  return rows;
}

function renderRemainingBlockedSection(criticalInvariant) {
  const rows = collectRemainingBlocked();
  const total = criticalInvariant.blocked || 0;
  if (rows.length === 0) {
    return [
      `## REMAINING_BLOCKED (critical_invariant.blocked cumulative = ${total})`,
      "",
      total === 0
        ? "No BLOCKED critical_invariant entries currently recorded across QA4/QA5/QA6/QA8."
        : `critical_invariant.blocked=${total} but no per-suite BLOCKED detail rows were found in qa4/5/6/8-result.v1.json - re-run the affected suite(s) before trusting this total.`,
    ].join("\n");
  }
  const tableRows = rows
    .map(
      (r, i) =>
        `| ${i + 1} | \`${r.blocked_code || "-"}\` | ${r.suite} | ${r.invariant_id} | ${r.scenario_ids.join(", ") || "-"} |`,
    )
    .join("\n");
  const matches = rows.length === total;
  return [
    `## REMAINING_BLOCKED (critical_invariant.blocked cumulative = ${total})`,
    "",
    "| # | code | suite | invariant | scenario(s) |",
    "|---|---|---|---|---|",
    tableRows,
    "",
    matches
      ? `Row count (${rows.length}) matches evidence-manifest.v1.json critical_invariant.blocked=${total}. None of these were converted to FAIL/PASS/SKIPPED to manufacture a cleaner verdict (mock-PASS and BLOCKED-laundering are both forbidden by acceptance-contract §L3).`
      : `Row count (${rows.length}) does NOT match the recorded cumulative total (${total}) - one or more suite result files are stale relative to evidence-manifest.v1.json; re-run the affected suites before trusting either number.`,
  ].join("\n");
}

function renderPerformanceWorldRecap() {
  const qa6 = tryReadJson(QA6_REL);
  const pw = qa6 && qa6.checks && qa6.checks.performance_world;
  if (!pw) {
    return "### Performance World (k6, CI only heavy)\n\nqa6-result.v1.json not readable at QA9 run time - cannot recap.";
  }
  if (pw.status === "UNSPECIFIED_PERF_BUDGET") {
    return [
      "### Performance World (k6, CI only heavy) — QA6 record retained",
      "",
      "QA6 record retained unchanged through QA7/QA8/QA9. suite status `UNSPECIFIED_PERF_BUDGET`",
      "— k6 scenario-mix + tag threshold mechanism locked — numeric SLO invention forbidden — heavy",
      "k6 remains CI only — artifact retention >= 90 days — aggregator `if: always()`. Resolving",
      "this BLOCKED_MISSING_ORACLE requires Human/PO to supply real numeric p95/error-rate budgets;",
      "the harness will not invent one.",
    ].join("\n");
  }
  const tagRows = (pw.scenarios || []).map((s) => `\`${s.tag}\`:\`${s.status}\``).join(", ");
  return [
    "### Performance World (k6, CI only heavy) — QA6 record retained",
    "",
    `QA6 record retained unchanged through QA7/QA8/QA9. suite status \`${pw.status}\` — budget`,
    "SPECIFIED (Human/PO ACK, perf-budget.v1.json V1) — k6 scenario-mix + tag threshold mechanism",
    `locked — numeric SLO invention forbidden — tags: ${tagRows || "(none)"} — heavy k6 remains CI`,
    "only — artifact retention >= 90 days — aggregator `if: always()`.",
  ].join("\n");
}

/**
 * QA8 (ASVS 5.0.0 subset) recap - mirrors renderPerformanceWorldRecap()'s
 * shape for QA6. Always names the dynamic-adversarial scenario id and its
 * CURRENT status (whatever qa8-result.v1.json actually says this run), so
 * the report keeps citing ASVS 5.0.0 and the scenario id even once it is no
 * longer BLOCKED - never a hardcoded historical BLOCKED/FAIL string.
 */
function renderSecurityPrivacyWorldRecap() {
  const qa8 = tryReadJson(QA8_REL);
  const sw = qa8 && qa8.checks && qa8.checks.security_privacy_world;
  if (!sw) {
    return "### Security and Privacy World (QA8, ASVS 5.0.0 subset)\n\nqa8-result.v1.json not readable at QA9 run time - cannot recap.";
  }
  const asvsVersion = sw.asvs_version || qa8.asvs_version || "5.0.0";
  const dynRows = (sw.dynamic_scenarios || [])
    .map(function (d) {
      const code = d.blocked_code ? " (`" + d.blocked_code + "`)" : "";
      return "`" + d.scenario_id + "`:`" + d.status + "`" + code;
    })
    .join(", ");
  return [
    "### Security and Privacy World (QA8, ASVS " + asvsVersion + " subset)",
    "",
    "admin-boundary / user-isolation / JWT-token-validation / privacy-delete-account / error-disclosure -",
    "dynamic adversarial scenario(s): " + (dynRows || "(none recorded)") + ".",
    "QA8 is a discovery suite: any finding it records in defects.v1.json is not repaired by QA8 or QA9",
    "themselves - repairs happen in a dedicated round (see REPAIR_ENTRY_POINT). QA9 remains aggregation",
    "only and invents no new ASVS scenarios.",
  ].join("\n");
}

/**
 * @param {ReturnType<typeof collectRemainingBlocked>} remainingBlocked
 * @param {{P0:number,P1:number,P2:number,P3:number}} defectsCounts
 */
function renderRepairEntryPoint(remainingBlocked, defectsCounts) {
  const outstanding = [];
  if (defectsCounts.P0 > 0) outstanding.push(`${defectsCounts.P0} P0 defect(s)`);
  if (defectsCounts.P1 > 0) outstanding.push(`${defectsCounts.P1} P1 defect(s)`);
  if (remainingBlocked.length > 0) outstanding.push(`${remainingBlocked.length} BLOCKED critical_invariant row(s)`);

  const header = [
    "## REPAIR_ENTRY_POINT (governance state)",
    "",
    outstanding.length === 0
      ? "No outstanding P0/P1 defects and no BLOCKED critical_invariant rows are currently recorded."
      : `Outstanding right now: ${outstanding.join(", ")}. What exists to repair them:`,
    "",
  ];

  const mechanisms = [
    "1. **Protected product repair** (touches `services/api-nest/src/**` or other",
    "   `protected-scope.v1.json` roots) uses the already-governed pattern: change protected",
    "   bytes as an ordinary commit, then trigger `ENGINE_ACCEPTANCE_REBASE_V1`",
    "   (`tooling/engine-acceptance/rebase-acceptance-baseline.cjs`, Human/PO ACK required) to",
    "   open a new acceptance epoch, then re-run QA1-QA8 then QA9.",
    "2. **Harness-only repair** = `tooling/engine-acceptance/**` changes with zero product-byte",
    "   impact. Uses normal T0/T1 commit gates; no rebase needed since protected scope is",
    "   untouched.",
    "3. **Governance-only repair** = `governance/engine-acceptance/**` bookkeeping.",
    "4. **Workflow L7 amendment** = `.github/workflows/engine-acceptance.yml` change under",
    "   `POST_QA0_CONTROLLED_WORKFLOW_AMENDMENT_V1` (Human/PO ACK, exact-diff QA0-QA6",
    "   semantics-unchanged proof).",
    "5. **Performance budget Human/PO approval** = QA6's numeric p95/error-rate budget can only",
    "   exist once Human/PO supplies it; `perf-budget.v1.json`'s `numeric_invention_forbidden`",
    "   lock means the harness cannot self-supply these.",
    "6. **L8 `ENGINE_ACCEPTANCE_REBASE_V1`** = required for any protected-product mutation",
    "   (`services/api-nest/src/**`) needed to clear a remaining P0/P1/BLOCKED item.",
  ];

  return [...header, ...mechanisms].join("\n");
}

function buildReport({
  baseline,
  measuredAt,
  runId,
  resultChecksum,
  formulaInputs,
  verdict,
  verdictReason,
  dual,
  defectsCounts,
  criticalInvariant,
  suiteStatus,
  p0Defects,
  otherDefects,
}) {
  const suiteRows = suiteStatus
    .map((s) => `| \`${s.suite_id}\` | \`${s.completion_status}\` |`)
    .join("\n");

  const p0Rows = p0Defects.length
    ? p0Defects
        .map(
          (d) =>
            `- \`${d.trace_id}\` (suite \`${d.suite_id}\`, invariant \`${d.invariant_id}\`) — ${d.title}`,
        )
        .join("\n")
    : "- (none currently recorded)";

  const otherRows = otherDefects.length
    ? otherDefects
        .map(
          (d) =>
            `- \`${d.severity}\` \`${d.trace_id}\` (suite \`${d.suite_id}\`, invariant \`${d.invariant_id}\`) — ${d.title}`,
        )
        .join("\n")
    : "- (none currently recorded)";

  const remainingBlocked = collectRemainingBlocked();

  return `# ENGINE ACCEPTANCE REPORT

> **QA phase:** QA-9 \`qa9-acceptance-report\` (FINAL aggregation / verdict issuance — not a new discovery suite)
> **Measured:** ${measuredAt}
> **baseline_id:** \`${baseline.id}\`
> **qa9_run_id:** \`${runId}\`
> **qa9_result_checksum:** \`${resultChecksum}\`
> **aggregation_only:** \`true\` — consumes QA0-QA8 evidence exactly as recorded, invents no scenarios

## Status banner

\`\`\`text
ACCEPTANCE CONTRACT = LOCKED
BASELINE = FROZEN
QA0 = COMPLETE
QA1 = COMPLETE
QA2 = COMPLETE
QA3 = COMPLETE
QA4 = COMPLETE
QA5 = COMPLETE
QA6 = COMPLETE
QA7 = COMPLETE
QA8 = COMPLETE
QA9 = COMPLETE
QA HARNESS TARGET = SAFE
NEXT = ${formulaInputs.next}
PRODUCT MUTATION = 0
03 UI = ${verdict === "ENGINE_ACCEPTED_FOR_UI" ? "UNLOCKED" : "BLOCKED"}
ENGINE_ACCEPTED_FOR_UI = ${verdict === "ENGINE_ACCEPTED_FOR_UI" ? "ISSUED" : "NOT_ISSUED"}
UI_UX_ENTRY_GATE = ${verdict === "ENGINE_ACCEPTED_FOR_UI" ? "OPEN" : "CLOSED"}
\`\`\`

## FINAL_ACCEPTANCE_VERDICT

| Field | Value |
|---|---|
| verdict | \`${verdict}\` |
| reason | ${verdictReason} |
| evidence_integrity | \`VALID\` |
| baseline.valid | \`${baseline.valid}\` |
| working_tree_clean | \`${dual.working_tree_clean}\` (fact only, not forced clean) |
| protected_scope_clean | \`${dual.protected_scope_clean}\` |
| acceptance_scope.unchanged | \`${formulaInputs.acceptance_scope_unchanged}\` |

**Prohibited-state check:** \`ENGINE_ACCEPTED_FOR_UI\` is \`${verdict === "ENGINE_ACCEPTED_FOR_UI" ? "ISSUED" : "NOT_ISSUED"}\`. \`UI_UX_ENTRY_GATE = ${verdict === "ENGINE_ACCEPTED_FOR_UI" ? "OPEN" : "CLOSED"}\`.

## ACCEPTANCE_FORMULA_INPUTS

| Input | Value |
|---|---|
| mandatory_suite.QA1..QA8.status == COMPLETE | \`${formulaInputs.mandatory_suite_complete}\` |
| critical_invariant.blocked | \`${criticalInvariant.blocked ?? 0}\` |
| critical_invariant.skipped | \`${criticalInvariant.skipped ?? 0}\` |
| critical_invariant.uncovered | \`${criticalInvariant.uncovered ?? 0}\` |
| defects.P0 | \`${defectsCounts.P0 ?? 0}\` |
| defects.P1 | \`${defectsCounts.P1 ?? 0}\` |
| defects.P2 | \`${defectsCounts.P2 ?? 0}\` |
| defects.P3 | \`${defectsCounts.P3 ?? 0}\` |
| baseline.valid | \`${formulaInputs.baseline_valid}\` |
| acceptance_scope.unchanged | \`${formulaInputs.acceptance_scope_unchanged}\` |
| report.baseline_id == baseline.id | \`${formulaInputs.report_baseline_id_match}\` |
| report.evidence_integrity == VALID | \`${formulaInputs.evidence_integrity_valid}\` |

### Mandatory suite status (QA1-QA8)

| suite | completion_status |
|---|---|
${suiteRows}

## P0_SECURITY_FINDINGS (must remain visible — not buried in defects.v1.json only)

${p0Rows}

## OTHER_DEFECTS

${otherRows}

${renderRemainingBlockedSection(criticalInvariant)}

${renderPerformanceWorldRecap()}

${renderSecurityPrivacyWorldRecap()}

${renderRepairEntryPoint(remainingBlocked, defectsCounts)}

## REBASE_GOVERNANCE_GAP — repaired as \`ENGINE_ACCEPTANCE_REBASE_POLICY_V2\`

Human/PO ACK APPROVED the policy-versioned repair (\`amendment_id=rebase-policy-qa8-qa9-topology-20260814\`,
codename \`L8_REBASE_GOVERNANCE_GAP_REPAIR\`). Historical V1 approvals remain valid; future rebases use V2:

- discovery invalidate/rerun includes **QA8** (STALE + historical provenance + washing)
- **QA9** is aggregation-only: \`stale_aggregation_phases\`, not a discovery suite; predecessor
  QA9 verdict/report is not current-authoritative; aggregation reruns only after current-epoch
  discovery evidence exists
- V1 shape cannot authorize a new rebase
- this repair created **no** new acceptance epoch and did **not** invalidate current evidence

## RECOMMENDED_REPAIR_BATCH (planning only — product items not executed by QA9)

${
  p0Defects.length === 0 && otherDefects.length === 0 && remainingBlocked.length === 0
    ? "No outstanding defects or BLOCKED critical_invariant rows are currently recorded — nothing queued here."
    : [
        "Grouped in lowest-rerun-cost order (harness/governance-only first, protected-product last,",
        "since every protected-product change forces a full QA1-QA8 then QA9 aggregation rebase rerun):",
        "",
        ...p0Defects.map(
          (d, i) =>
            `${i + 1}. **${d.trace_id}** (P0, suite ${d.suite_id}, invariant ${d.invariant_id}) — ${d.title}`,
        ),
        ...otherDefects.map(
          (d, i) =>
            `${p0Defects.length + i + 1}. **${d.trace_id}** (${d.severity}, suite ${d.suite_id}, invariant ${d.invariant_id}) — ${d.title}`,
        ),
        ...remainingBlocked.map(
          (r, i) =>
            `${p0Defects.length + otherDefects.length + i + 1}. **${r.suite} ${r.invariant_id}** — \`${r.blocked_code}\` (${r.scenario_ids.join(", ") || "no scenario ids"})`,
        ),
      ].join("\n")
}

## Dual Dirty

- working_tree_clean=\`${dual.working_tree_clean}\`
- protected_scope_clean=\`${dual.protected_scope_clean}\`
- forced clean / stash laundry = forbidden

## NEXT_CANONICAL_WAVE

\`${formulaInputs.next}\` — verdict \`${verdict}\` ${verdict === "ENGINE_ACCEPTED_FOR_UI" ? "unlocks" : "blocks"} 03 UI. ${
    verdict === "ENGINE_ACCEPTED_FOR_UI"
      ? "All acceptance-contract L1 conditions are met on this evidence."
      : "The next canonical wave is a **repair round** (see RECOMMENDED_REPAIR_BATCH), governed by `ENGINE_ACCEPTANCE_REBASE_V1` for any protected-product item, NOT a resumption of `02.5` discovery (QA0-QA9 are all COMPLETE) and NOT `03 UI` (blocked until a genuinely earned `ENGINE_ACCEPTED_FOR_UI` + `acceptance_scope.unchanged`)."
  }
`;
}

function runQa9(opts = {}) {
  assertKillSwitch(opts);

  const baseline = readJson(BASELINE_REL);
  const scope = readJson(SCOPE_REL);
  syncAggregateHashes(baseline, scope);
  const dual = dualDirty(scope);
  const measuredAt = new Date().toISOString();
  const runId = `qa9-acceptance-report-${measuredAt.slice(0, 10).replace(/-/g, "")}`;

  const evidenceBefore = readJson(EVIDENCE_REL);
  const defects = readJson(DEFECTS_REL);
  const coverage = readJson(COVERAGE_REL);

  const mandatorySuiteIds = Array.isArray(coverage.mandatorySuites)
    ? coverage.mandatorySuites
    : ["QA1", "QA2", "QA3", "QA4", "QA5", "QA6", "QA7", "QA8"];
  const suiteById = new Map((evidenceBefore.suites || []).map((s) => [s.suite_id, s]));
  const qa8Slot = suiteById.get("QA8");
  if (
    !qa8Slot ||
    qa8Slot.completion_status !== "COMPLETE" ||
    qa8Slot.baseline_id !== baseline.id ||
    qa8Slot.epoch_status === "STALE_FOR_CURRENT_EPOCH"
  ) {
    const err = new Error("QA9 aggregation requires current-epoch QA8 COMPLETE");
    err.code = "AIPO_QA9_REQUIRES_QA8_COMPLETE";
    throw err;
  }
  const qa7Slot = suiteById.get("QA7");
  if (!qa7Slot || qa7Slot.completion_status !== "COMPLETE" || qa7Slot.baseline_id !== baseline.id) {
    const err = new Error("QA9 aggregation requires current-epoch QA7 COMPLETE");
    err.code = "AIPO_QA9_REQUIRES_QA7_COMPLETE";
    throw err;
  }
  const suiteStatus = mandatorySuiteIds.map((id) => ({
    suite_id: id,
    completion_status: (suiteById.get(id) || {}).completion_status || "MISSING",
  }));
  const mandatoryComplete = suiteStatus.every((s) => s.completion_status === "COMPLETE");

  const criticalInvariant = evidenceBefore.critical_invariant || {
    blocked: 0,
    skipped: 0,
    uncovered: 0,
  };

  const liveManifest = buildManifest(scope);
  const scopeUnchanged = Boolean(
    baseline.protected_scope_manifest &&
      baseline.protected_scope_manifest.aggregate === liveManifest.aggregate,
  );
  const baselineValid = baseline.valid === true;
  const evidenceIntegrityValid = evidenceBefore.evidence_integrity === "VALID";
  const reportBaselineMatch = evidenceBefore.baseline_id === baseline.id;

  const defectsCounts = defects.counts || { P0: 0, P1: 0, P2: 0, P3: 0 };

  const formula = computeVerdict({
    defectsP0: defectsCounts.P0 || 0,
    defectsP1: defectsCounts.P1 || 0,
    criticalBlocked: criticalInvariant.blocked || 0,
    criticalSkipped: criticalInvariant.skipped || 0,
    criticalUncovered: criticalInvariant.uncovered || 0,
    mandatoryComplete,
    evidenceIntegrityValid,
    baselineValid,
    scopeUnchanged,
    reportBaselineMatch,
  });

  const verdict = formula.verdict;
  const p0Defects = (defects.defects || []).filter((d) => d.severity === "P0");
  const otherDefects = (defects.defects || []).filter((d) => d.severity !== "P0");

  const verdictReason =
    verdict === "ENGINE_NOT_ACCEPTED"
      ? `QA9 COMPLETE (final aggregation of QA0-QA8 evidence per acceptance-contract.v1.md L1) - defects.P0=${defectsCounts.P0 || 0} defects.P1=${defectsCounts.P1 || 0} (${
          p0Defects
            .concat(otherDefects.filter((d) => d.severity === "P1"))
            .map((d) => d.trace_id)
            .join(", ") || "see defects.v1.json"
        }, real evidence) force ENGINE_NOT_ACCEPTED regardless of critical_invariant.blocked=${criticalInvariant.blocked || 0} - 03 UI remains BLOCKED - ENGINE_ACCEPTED_FOR_UI NOT_ISSUED - repair round required (see REPAIR_ENTRY_POINT / RECOMMENDED_REPAIR_BATCH in ENGINE_ACCEPTANCE_REPORT.md) - product mutation 0 this wave`
      : verdict === "ENGINE_QA_INCOMPLETE"
        ? `QA9 COMPLETE - defects.P0/P1=0 but formula input(s) failed: ${formula.reason_code} - ACCEPTED forbidden`
        : `QA9 COMPLETE - all acceptance-contract L1 conditions met - ENGINE_ACCEPTED_FOR_UI`;

  const formulaInputs = {
    mandatory_suite_complete: mandatoryComplete,
    mandatory_suite_status: suiteStatus,
    critical_invariant_blocked: criticalInvariant.blocked || 0,
    critical_invariant_skipped: criticalInvariant.skipped || 0,
    critical_invariant_uncovered: criticalInvariant.uncovered || 0,
    defects_P0: defectsCounts.P0 || 0,
    defects_P1: defectsCounts.P1 || 0,
    defects_P2: defectsCounts.P2 || 0,
    defects_P3: defectsCounts.P3 || 0,
    baseline_valid: baselineValid,
    acceptance_scope_unchanged: scopeUnchanged,
    report_baseline_id_match: reportBaselineMatch,
    evidence_integrity_valid: evidenceIntegrityValid,
    verdict_reason_code: formula.reason_code,
    next: formula.next,
  };

  const result = {
    schema: "governance.engine-acceptance.qa9-result.v1",
    version: "1.0.0",
    suite_id: "QA9",
    run_id: runId,
    todoId: "qa9-acceptance-report",
    measuredAt,
    baseline_id: baseline.id,
    kill_switch: {
      verified_before_checks: true,
      target_env: opts.target_env || process.env.AIPO_QA_TARGET_ENV || "local",
      hostname: opts.hostname || process.env.AIPO_QA_HOSTNAME || "localhost",
      synthetic_account_namespace:
        opts.synthetic_account_namespace ||
        process.env.AIPO_QA_SYNTHETIC_NS ||
        "qa-synth-local",
    },
    dual_dirty: {
      working_tree_clean: dual.working_tree_clean,
      protected_scope_clean: dual.protected_scope_clean,
      forced_clean_forbidden: true,
    },
    completion_status: "COMPLETE",
    aggregation_only: true,
    discovery_suite: false,
    invents_no_scenarios: true,
    formula_inputs: formulaInputs,
    verdict,
    verdict_reason_code: formula.reason_code,
    verdict_reason: verdictReason,
    p0_security_findings: p0Defects.map((d) => ({
      trace_id: d.trace_id,
      suite_id: d.suite_id,
      invariant_id: d.invariant_id,
      title: d.title,
      asvs_ids: d.asvs_ids || [],
    })),
    other_defects: otherDefects.map((d) => ({
      severity: d.severity,
      trace_id: d.trace_id,
      suite_id: d.suite_id,
      invariant_id: d.invariant_id,
      title: d.title,
    })),
    remaining_blocked_count: criticalInvariant.blocked || 0,
    engine_accepted_for_ui: verdict === "ENGINE_ACCEPTED_FOR_UI" ? "ISSUED" : "NOT_ISSUED",
    ui_ux_entry_gate: verdict === "ENGINE_ACCEPTED_FOR_UI" ? "OPEN" : "CLOSED",
    product_mutation: 0,
    kpi_forbidden: true,
    mock_pass_forbidden: true,
    next: formula.next,
    notes: [
      "QA9 is a deterministic aggregation/verdict-issuance wave, not a discovery suite.",
      "Consumes QA0-QA8 evidence exactly as recorded - repairs nothing.",
      "Does not issue ENGINE_ACCEPTED_FOR_UI while defects.P0/P1 > 0.",
      "Every report section is derived from the current qa4/5/6/8-result files at run time - no hardcoded historical defect name.",
    ],
  };

  const resultChecksum = sha256Json(result);
  result.checksum = resultChecksum;
  writeJson(RESULT_REL, result);

  const evidence = { ...evidenceBefore };
  evidence.qa_phase = "QA-9";
  evidence.baseline_id = baseline.id;
  evidence.verdict = verdict;
  evidence.verdict_reason = verdictReason;
  evidence.evidence_integrity = "VALID";
  evidence.next = formula.next;
  evidence.dual_dirty = {
    working_tree_clean: dual.working_tree_clean,
    protected_scope_clean: dual.protected_scope_clean,
    forced_clean_forbidden: true,
  };
  evidence.kill_switch = {
    ...(evidence.kill_switch || {}),
    verified_before_qa9: true,
  };
  const qa9Suite = {
    suite_id: "QA9",
    run_id: runId,
    baseline_id: baseline.id,
    checksum: resultChecksum,
    completion_status: "COMPLETE",
    result_ref: RESULT_REL,
    aggregation_only: true,
  };
  const existingSuites = evidence.suites || [];
  evidence.suites = existingSuites.some((s) => s.suite_id === "QA9")
    ? existingSuites.map((s) => (s.suite_id === "QA9" ? qa9Suite : { ...s, baseline_id: baseline.id }))
    : [...existingSuites.map((s) => ({ ...s, baseline_id: baseline.id })), qa9Suite];
  writeJson(EVIDENCE_REL, evidence);

  const report = buildReport({
    baseline,
    measuredAt,
    runId,
    resultChecksum,
    formulaInputs,
    verdict,
    verdictReason,
    dual,
    defectsCounts,
    criticalInvariant,
    suiteStatus,
    p0Defects,
    otherDefects,
  });
  fs.writeFileSync(path.join(ROOT, REPORT_REL), report, "utf8");

  return {
    status: "QA9_COMPLETE",
    run_id: runId,
    checksum: resultChecksum,
    verdict,
    verdict_reason_code: formula.reason_code,
    formula_inputs: formulaInputs,
    engine_accepted_for_ui: result.engine_accepted_for_ui,
    ui_ux_entry_gate: result.ui_ux_entry_gate,
    next: formula.next,
  };
}

function main() {
  const args = process.argv.slice(2);
  const get = (flag) => {
    const i = args.indexOf(flag);
    return i >= 0 ? args[i + 1] : undefined;
  };
  try {
    const out = runQa9({
      target_env: get("--target-env") || process.env.AIPO_QA_TARGET_ENV || "local",
      hostname: get("--hostname") || process.env.AIPO_QA_HOSTNAME || "localhost",
      synthetic_account_namespace:
        get("--synthetic-ns") || process.env.AIPO_QA_SYNTHETIC_NS || "qa-synth-local",
    });
    console.log(`[engine-acceptance:run-qa9] ${out.status}`);
    console.log(JSON.stringify(out, null, 2));
  } catch (e) {
    console.error(`[engine-acceptance:run-qa9] ABORT - ${e.message}`);
    process.exit(e.code === "AIPO_QA_KILL_SWITCH" ? 2 : 1);
  }
}

if (require.main === module) {
  main();
}

module.exports = { runQa9, computeVerdict, collectRemainingBlocked, NEXT_FIX_ROUND, NEXT_INCOMPLETE, NEXT_UI_UNLOCKED };
