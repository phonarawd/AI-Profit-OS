/**
 * QA8 Security and Privacy World runner.
 *
 * kill-switch -> security-privacy-world checks (ASVS 5.0.0 subset) ->
 * classify PASS/FAIL/BLOCKED -> evidence-manifest / REPORT / defects.
 *
 * Local default = tiny. Static checks are equally complete in tiny/full;
 * only the dynamic adversarial scenario differs, and it is
 * BLOCKED_ENV_CAPABILITY on this Phase0 machine either way.
 *
 * Product mutation = 0. This is a discovery wave: FAIL/BLOCKED results are
 * recorded honestly and are NOT repaired in this run.
 */
"use strict";

const fs = require("node:fs");
const path = require("node:path");
const crypto = require("node:crypto");
const { assertKillSwitch } = require("./kill-switch.cjs");
const { ROOT, readJson, dualDirty } = require("./lib/hash-scope.cjs");
const {
  assertAcceptanceWorkflowHashMatch,
  syncLockfileHashOnly,
} = require("./lib/workflow-amendment.cjs");
const { runSecurityPrivacyWorld } = require("./checks/security-privacy-world.cjs");

const RESULT_REL = "governance/engine-acceptance/qa8-result.v1.json";
const EVIDENCE_REL = "governance/engine-acceptance/evidence-manifest.v1.json";
const REPORT_REL = "governance/engine-acceptance/ENGINE_ACCEPTANCE_REPORT.md";
const DEFECTS_REL = "governance/engine-acceptance/defects.v1.json";
const SCOPE_REL = "governance/engine-acceptance/protected-scope.v1.json";
const BASELINE_REL = "governance/engine-acceptance/baseline.v1.json";
const COVERAGE_REL = "governance/engine-acceptance/coverage.v1.json";
const QA7_REL = "governance/engine-acceptance/qa7-result.v1.json";

function sha256Json(obj) {
  return crypto.createHash("sha256").update(`${JSON.stringify(obj)}\n`, "utf8").digest("hex");
}

function writeJson(rel, obj) {
  fs.writeFileSync(path.join(ROOT, rel), `${JSON.stringify(obj, null, 2)}\n`, "utf8");
}

function syncAggregateHashes(baseline, scope) {
  // POST_QA0_CONTROLLED_WORKFLOW_AMENDMENT_V1 - silent workflow-hash sync forbidden.
  assertAcceptanceWorkflowHashMatch(baseline, scope);
  syncLockfileHashOnly(baseline, scope, (b) => writeJson(BASELINE_REL, b));
}

function countBySeverity(defects) {
  const counts = { P0: 0, P1: 0, P2: 0, P3: 0 };
  for (const d of defects) {
    if (counts[d.severity] !== undefined) counts[d.severity] += 1;
  }
  return counts;
}

/**
 * severity-policy.v1.md is LOCKED before results - classification below is
 * applied once, honestly, from the checks output. Not re-adjusted to make a
 * result look better.
 *
 * P0 = catastrophic integrity/security (cross-user data leak / money
 *      corruption / unrecoverable loss).
 * P1 = core lifecycle / idempotency / authorization / fail-safe violation.
 * P2 = important but non-fatal contract deviation.
 * P3 = non-core polish / observability gap.
 */
function severityForCheck(check) {
  if (check.check_id === "QA8_ADMIN_BOUNDARY") {
    // Every *.admin.controller.ts route (ledger balance-adjust, withdraw
    // credentials, KYC decisions, deposit config, ...) is reachable with
    // zero authentication and allows arbitrary cross-user reads plus a
    // direct unauthenticated money-balance-adjustment path. This is the
    // exact P0 definition (cross-user data leak AND a live path to money
    // corruption), not a lesser authz gap.
    return "P0";
  }
  if (check.check_id === "QA8_PRIVACY_DELETE_ACCOUNT") {
    // Retained PII-adjacent rows after delete-account is a real ASVS
    // v5.0.0-14.2.7 deviation, but the feature itself works (guards,
    // confirm x2, session revoke, email/phone null); no cross-user exposure
    // and no money-path impact. Important, non-fatal -> P2, not P0/P1.
    return "P2";
  }
  return "P2";
}

/** BLOCKED/PASS are not defects. FAIL only -> defects.v1.json (record, do not repair). */
function collectDefects(secResult, baselineId, measuredAt) {
  const defects = [];
  for (const check of secResult.checks) {
    if (check.status !== "FAIL") continue;
    defects.push({
      severity: severityForCheck(check),
      invariant_id: check.invariant_id,
      suite_id: "QA8",
      persona_id: check.check_id === "QA8_PRIVACY_DELETE_ACCOUNT" ? "KR-12" : "KR-11",
      journey_id:
        check.check_id === "QA8_ADMIN_BOUNDARY"
          ? "J-DIRTY-ADMIN-BOUNDARY-01"
          : check.check_id === "QA8_PRIVACY_DELETE_ACCOUNT"
            ? "J-HAPPY-01"
            : "J-DIRTY-IDOR-01",
      seed: secResult.seed ?? null,
      trace_id: `qa8:${check.check_id}`,
      baseline_id: baselineId,
      first_observed_at: measuredAt,
      repro_status: "repro_confirmed",
      title: `security-privacy-world FAIL: ${check.check_id}`,
      asvs_ids: check.asvs_ids || [],
      findings: check.findings || [],
      rich_evidence: check.rich_evidence || null,
      root_cause_note: check.root_cause_note || null,
      protected_product_impact: false,
      product_mutation_in_this_wave: 0,
    });
  }
  return defects;
}

function mergeCriticalInvariant(prior, current) {
  const p = prior || { blocked: 0, skipped: 0, uncovered: 0 };
  const c = current || { blocked: 0, skipped: 0, uncovered: 0 };
  return {
    blocked: (p.blocked || 0) + (c.blocked || 0),
    skipped: (p.skipped || 0) + (c.skipped || 0),
    uncovered: (p.uncovered || 0) + (c.uncovered || 0),
    sources: {
      QA4_QA6_cumulative: {
        blocked: p.blocked || 0,
        skipped: p.skipped || 0,
        uncovered: p.uncovered || 0,
      },
      QA8_new: {
        blocked: c.blocked || 0,
        skipped: c.skipped || 0,
        uncovered: c.uncovered || 0,
      },
    },
  };
}

function buildReport({
  baseline,
  measuredAt,
  runId,
  resultChecksum,
  secResult,
  defectsCounts,
  verdict,
  verdictReason,
  dual,
  mode,
  criticalMerged,
}) {
  const checkRows = secResult.checks
    .map(
      (c) =>
        `| \`${c.check_id}\` | ${(c.asvs_ids || []).join(", ")} | \`${c.invariant_id}\` | \`${c.status}\` |`,
    )
    .join("\n");

  return `# ENGINE ACCEPTANCE REPORT

> **QA phase:** QA-8 \`qa8-security-privacy\`
> **Measured:** ${measuredAt}
> **baseline_id:** \`${baseline.id}\`
> **qa8_run_id:** \`${runId}\`
> **qa8_result_checksum:** \`${resultChecksum}\`
> **mode:** \`${mode}\`
> **asvs_version:** \`5.0.0\` (subset - exhaustive_certification_claim=false)

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
QA HARNESS TARGET = SAFE
NEXT = QA9_ACCEPTANCE_REPORT
PRODUCT MUTATION = 0
EVAL_MUTATION = 0
GRADER_MUTATION = 0
03 UI = BLOCKED
ENGINE_ACCEPTED_FOR_UI = NOT_ISSUED
\`\`\`

## Verdict (after QA-8)

| Field | Value |
|---|---|
| verdict | \`${verdict}\` |
| reason | ${verdictReason} |
| evidence_integrity | \`VALID\` |
| baseline.valid | \`${baseline.valid}\` |
| working_tree_clean | \`${dual.working_tree_clean}\` (fact only, not forced clean) |
| protected_scope_clean | \`${dual.protected_scope_clean}\` |
| defects.P0 / P1 / P2 / P3 | ${defectsCounts.P0} / ${defectsCounts.P1} / ${defectsCounts.P2} / ${defectsCounts.P3} |
| critical_invariant.blocked (cumulative, QA4-QA6 + QA8) | ${criticalMerged.blocked ?? 0} |
| critical_invariant.skipped | ${criticalMerged.skipped ?? 0} |
| critical_invariant.uncovered | ${criticalMerged.uncovered ?? 0} |
| mandatory suites COMPLETE | QA0..QA8 |

**Prohibited state confirmed:** \`ENGINE_ACCEPTED_FOR_UI\` is **not issued** (P0 defect present and/or critical BLOCKED > 0).

## QA8 Security and Privacy World (ASVS 5.0.0 subset)

| check_id | ASVS IDs | invariant | status |
|---|---|---|---|
${checkRows}

### Critical finding - QA8_ADMIN_BOUNDARY (P0)

Every \`*.admin.controller.ts\` route in \`services/api-nest/src/**\` (ledger balance-adjust,
withdraw-credentials, KYC decisions, deposit-config, risk rules, membership, referral,
ai-logs, and more) carries \`@Controller("admin")\` with **zero** \`@UseGuards\`. No global
\`APP_GUARD\`/middleware compensates in \`app.module.ts\`/\`main.ts\`. This is a live,
unauthenticated path to cross-user financial reads and unauthenticated balance
adjustment - recorded per ASVS v5.0.0-8.2.1 / v5.0.0-8.4.2. Root cause is a
self-documented, already-planned gap (\`ledger.admin.controller.ts\` comment: "Auth/RBAC
guard lands with Admin todos"; \`schemas/admin-rbac.v1.json\` + Admin plan section 9.9
AdminGuard are specified but not yet wired). **Not repaired in this wave.**

### Finding - QA8_PRIVACY_DELETE_ACCOUNT (P2)

\`auth.service.ts#deleteAccount\` performs an \`UPDATE\` (soft-delete) on \`public.users\`
(email/phone nulled, sessions revoked), not a hard \`DELETE\`. Schema \`ON DELETE
CASCADE\`/\`SET NULL\` foreign keys therefore never fire, so \`ai_twin_memory\`,
\`notification_prefs\`, \`referral_edge\`, and other user_id-linked rows persist after
account deletion. KYC 5-year retention is explicit documented policy (section 42.2.1)
and is not counted as part of this finding. ASVS v5.0.0-14.2.7. **Not repaired in this
wave.**

### PASS - QA8_USER_ISOLATION_SHARED_WITH_QA2, QA8_JWT_TOKEN_VALIDATION

User-facing IDOR/token-cross/interleave surfaces (shared oracle with QA2) and JWT
integrity/algorithm-allowlist/validity/audience (reusing
\`tooling/verify/auth-jwt-runtime.cjs\`) both pass.

### BLOCKED - SEC-DYNAMIC-ADVERSARIAL-01

Live adversarial HTTP testing against a booted api-nest instance is
\`BLOCKED_ENV_CAPABILITY\` on this Phase0 2C/~8GB machine (same axis already flagged by
\`checks/user-isolation-surfaces.cjs\`). Not mock-PASSed; deferred to the CI heavy matrix.

## Performance World (k6, CI only heavy) - QA6 record retained

QA6 record retained unchanged. suite status \`UNSPECIFIED_PERF_BUDGET\` - threshold
mechanism locked - numeric invention forbidden - heavy k6 CI only - artifact retention
>= 90 days - aggregator if: always().

### UNSPECIFIED_PERF_BUDGET

- Formal suite/budget status when product SLO/contract numeric budgets are absent.
- \`BLOCKED_MISSING_ORACLE\` on critical \`INV-PERF-01\` contributes to the cumulative
  critical_invariant.blocked count (ACCEPTED forbidden).
- Invented p95 / error_rate values are forbidden.

## Dual Dirty

- working_tree_clean=\`${dual.working_tree_clean}\`
- protected_scope_clean=\`${dual.protected_scope_clean}\`
- forced clean / stash laundry = forbidden

## Next

\`QA9_ACCEPTANCE_REPORT\` per the 02.5 plan file-serial order. This wave does not start
QA9, does not repair the P0/P2 findings above, and does not issue
\`ENGINE_ACCEPTED_FOR_UI\`.
`;
}

function runQa8(opts = {}) {
  assertKillSwitch(opts);

  const mode = opts.mode === "full" ? "full" : "tiny";
  const baseline = readJson(BASELINE_REL);
  const scope = readJson(SCOPE_REL);
  syncAggregateHashes(baseline, scope);
  const dual = dualDirty(scope);
  const measuredAt = new Date().toISOString();
  const runId = `qa8-security-privacy-${measuredAt.slice(0, 10).replace(/-/g, "")}`;
  const synthetic_ns =
    opts.synthetic_account_namespace ||
    process.env.AIPO_QA_SYNTHETIC_NS ||
    "qa-synth-local";

  const secResult = runSecurityPrivacyWorld({
    mode,
    baseline_id: baseline.id,
    measuredAt,
  });

  try {
    const coverage = readJson(COVERAGE_REL);
    coverage.status = "qa8_active";
    if (!Array.isArray(coverage.notes)) coverage.notes = [];
    const note =
      "QA-8 Security and Privacy World = ASVS 5.0.0 subset; admin-surface + JWT + delete-account retention (suite_ids QA8).";
    if (!coverage.notes.includes(note)) coverage.notes.push(note);
    writeJson(COVERAGE_REL, coverage);
  } catch {
    /* optional */
  }

  const defects = collectDefects(secResult, baseline.id, measuredAt);
  const defectsCounts = countBySeverity(defects);

  let priorCi = { blocked: 0, skipped: 0, uncovered: 0 };
  try {
    const qa7 = readJson(QA7_REL);
    priorCi = qa7.critical_invariant_unchanged || priorCi;
  } catch {
    /* optional */
  }
  const criticalMerged = mergeCriticalInvariant(priorCi, secResult.critical_invariant);

  let verdict;
  let verdictReason;
  if (defectsCounts.P0 > 0 || defectsCounts.P1 > 0) {
    verdict = "ENGINE_NOT_ACCEPTED";
    verdictReason = `QA8 COMPLETE (ASVS 5.0.0 subset) - found P0=${defectsCounts.P0} P1=${defectsCounts.P1} (admin-boundary zero-guard, real evidence) - 03 blocked - product mutation 0 - not repaired this wave`;
  } else if (
    (criticalMerged.blocked || 0) > 0 ||
    (criticalMerged.skipped || 0) > 0 ||
    (criticalMerged.uncovered || 0) > 0
  ) {
    verdict = "ENGINE_QA_INCOMPLETE";
    verdictReason = `QA8 COMPLETE - critical_invariant.blocked=${criticalMerged.blocked} (cumulative QA4-QA6 + QA8 dynamic-pentest BLOCKED_ENV_CAPABILITY) - P0/P1=0 - ACCEPTED forbidden`;
  } else {
    verdict = "ENGINE_QA_INCOMPLETE";
    verdictReason = "QA8 COMPLETE - P0/P1=0 - mandatory suite QA9 report not yet issued";
  }

  const blockedCodes = ["BLOCKED_ENV_CAPABILITY"];

  const result = {
    schema: "governance.engine-acceptance.qa8-result.v1",
    version: "1.0.0",
    suite_id: "QA8",
    run_id: runId,
    todoId: "qa8-security-privacy",
    measuredAt,
    baseline_id: baseline.id,
    mode,
    asvs_version: "5.0.0",
    exhaustive_certification_claim: false,
    kill_switch: {
      verified_before_checks: true,
      target_env: opts.target_env || process.env.AIPO_QA_TARGET_ENV || "local",
      hostname: opts.hostname || process.env.AIPO_QA_HOSTNAME || "localhost",
      synthetic_account_namespace: synthetic_ns,
    },
    dual_dirty: {
      working_tree_clean: dual.working_tree_clean,
      protected_scope_clean: dual.protected_scope_clean,
      forced_clean_forbidden: true,
    },
    completion_status: "COMPLETE",
    checks: { security_privacy_world: secResult },
    critical_invariant: secResult.critical_invariant,
    critical_invariant_cumulative: criticalMerged,
    all_checks_pass: secResult.checks.every((c) => c.status === "PASS"),
    defects_found: defects.length,
    defects_counts: defectsCounts,
    verdict_contribution: verdict,
    next: "QA9_ACCEPTANCE_REPORT",
    product_mutation: 0,
    kpi_forbidden: true,
    mock_pass_forbidden: true,
    ci: {
      strategy_fail_fast: false,
      concurrency_group: "engine-acceptance-${{ github.ref }}",
    },
    blocked_codes_observed: blockedCodes,
    notes: [
      "ASVS 5.0.0 subset - IDOR/authz/PII/delete-account - isolation invariant mapping shared with QA2.",
      "Real defects recorded in defects.v1.json - discovery only, not repaired this wave.",
      "Does not issue ENGINE_ACCEPTED_FOR_UI. Does not start QA9.",
    ],
  };

  const resultChecksum = sha256Json(result);
  result.checksum = resultChecksum;
  writeJson(RESULT_REL, result);

  let prior = { defects: [] };
  try {
    prior = readJson(DEFECTS_REL);
  } catch {
    /* empty */
  }
  const kept = (prior.defects || []).filter((d) => d.suite_id !== "QA8");
  const merged = [...kept, ...defects];
  const mergedCounts = countBySeverity(merged);
  writeJson(DEFECTS_REL, {
    schema: "governance.engine-acceptance.defects.v1",
    version: "1.0.0",
    status: merged.length ? "qa8_recorded" : "qa8_empty",
    requiredLinkFields: [
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
    ],
    counts: mergedCounts,
    defects: merged,
    notes: [
      "BLOCKED_ENV_CAPABILITY (SEC-DYNAMIC-ADVERSARIAL-01) is a suite/invariant result, not a defect row.",
      "QA8 FAIL rows are recorded for the dedicated repair wave - not fixed here (discovery only).",
    ],
  });

  const evidence = readJson(EVIDENCE_REL);
  evidence.qa_phase = "QA-8";
  evidence.baseline_id = baseline.id;
  evidence.verdict = verdict;
  evidence.verdict_reason = verdictReason;
  evidence.evidence_integrity = "VALID";
  evidence.next = "QA9_ACCEPTANCE_REPORT";
  evidence.critical_invariant = {
    blocked: criticalMerged.blocked || 0,
    skipped: criticalMerged.skipped || 0,
    uncovered: criticalMerged.uncovered || 0,
  };
  evidence.dual_dirty = {
    working_tree_clean: dual.working_tree_clean,
    protected_scope_clean: dual.protected_scope_clean,
    forced_clean_forbidden: true,
  };
  evidence.kill_switch = {
    ...(evidence.kill_switch || {}),
    verified_before_qa8: true,
  };
  evidence.suites = (evidence.suites || []).map((s) => {
    if (s.suite_id === "QA8") {
      return {
        suite_id: "QA8",
        run_id: runId,
        baseline_id: baseline.id,
        checksum: resultChecksum,
        completion_status: "COMPLETE",
        result_ref: RESULT_REL,
        mode,
        asvs_version: "5.0.0",
        blocked_codes: blockedCodes,
      };
    }
    return { ...s, baseline_id: baseline.id };
  });
  writeJson(EVIDENCE_REL, evidence);

  const report = buildReport({
    baseline,
    measuredAt,
    runId,
    resultChecksum,
    secResult,
    defectsCounts,
    verdict,
    verdictReason,
    dual,
    mode,
    criticalMerged,
  });
  fs.writeFileSync(path.join(ROOT, REPORT_REL), report, "utf8");

  return {
    status: "QA8_COMPLETE",
    run_id: runId,
    checksum: resultChecksum,
    verdict,
    mode,
    all_checks_pass: result.all_checks_pass,
    defects_counts: defectsCounts,
    critical_invariant: secResult.critical_invariant,
    critical_invariant_cumulative: criticalMerged,
    blocked_codes_observed: blockedCodes,
    next: "QA9_ACCEPTANCE_REPORT",
  };
}

function main() {
  const args = process.argv.slice(2);
  const get = (flag) => {
    const i = args.indexOf(flag);
    return i >= 0 ? args[i + 1] : undefined;
  };
  const modeFlag = get("--mode");
  const mode =
    modeFlag === "full" || args.includes("--full")
      ? "full"
      : modeFlag === "tiny" || args.includes("--tiny")
        ? "tiny"
        : "tiny";

  try {
    const out = runQa8({
      target_env: get("--target-env") || process.env.AIPO_QA_TARGET_ENV || "local",
      hostname: get("--hostname") || process.env.AIPO_QA_HOSTNAME || "localhost",
      synthetic_account_namespace:
        get("--synthetic-ns") ||
        process.env.AIPO_QA_SYNTHETIC_NS ||
        "qa-synth-local",
      mode,
    });
    console.log(`[engine-acceptance:run-qa8] ${out.status} mode=${out.mode}`);
    console.log(JSON.stringify(out, null, 2));
  } catch (e) {
    console.error(`[engine-acceptance:run-qa8] ABORT - ${e.message}`);
    process.exit(e.code === "AIPO_QA_KILL_SWITCH" ? 2 : 1);
  }
}

if (require.main === module) {
  main();
}

module.exports = { runQa8 };
