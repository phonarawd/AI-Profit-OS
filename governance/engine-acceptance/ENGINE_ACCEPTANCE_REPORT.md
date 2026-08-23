# ENGINE ACCEPTANCE REPORT

> **QA phase:** QA-9 `qa9-acceptance-report` (FINAL aggregation / verdict issuance — not a new discovery suite)
> **Measured:** 2026-08-23T10:56:51.419Z
> **baseline_id:** `ea-baseline-a6908eff1def-3db9e8f8832f`
> **qa9_run_id:** `qa9-acceptance-report-20260823`
> **qa9_result_checksum:** `375c24caaa4bcbabde3db2194bb3237223cf13996740169f37de2002d4aedabc`
> **aggregation_only:** `true` — consumes QA0-QA8 evidence exactly as recorded, invents no scenarios

## Status banner

```text
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
NEXT = 03_blocked_fix_round
PRODUCT MUTATION = 0
03 UI = BLOCKED
ENGINE_ACCEPTED_FOR_UI = NOT_ISSUED
UI_UX_ENTRY_GATE = CLOSED
```

## FINAL_ACCEPTANCE_VERDICT

| Field | Value |
|---|---|
| verdict | `ENGINE_NOT_ACCEPTED` |
| reason | QA9 COMPLETE (final aggregation of QA0-QA8 evidence per acceptance-contract.v1.md L1) - defects.P0=0 defects.P1=12 (qa4:TIME-KST-DAY-BOUNDARY, qa4:TIME-KST-MONTH-END, qa4:TIME-KST-YEAR-END, qa4:TIME-PLUS-30D, qa4:TIME-PLUS-365D, qa4:TIME-MULTI-DAY-LIFECYCLE, qa5:FAULT-AI-429-DEGRADE, qa5:FAULT-AI-TIMEOUT-FALLBACK, qa5:FAULT-UPSTREAM-5XX-DEGRADE, qa5:FAULT-RECOVERY-LEDGER-SCAN, qa5:FAULT-RECOVERY-IDEMPOTENCY-SCAN, qa5:FAULT-RECOVERY-USER-STATE, real evidence) force ENGINE_NOT_ACCEPTED regardless of critical_invariant.blocked=2 - 03 UI remains BLOCKED - ENGINE_ACCEPTED_FOR_UI NOT_ISSUED - repair round required (see REPAIR_ENTRY_POINT / RECOMMENDED_REPAIR_BATCH in ENGINE_ACCEPTANCE_REPORT.md) - product mutation 0 this wave |
| evidence_integrity | `VALID` |
| baseline.valid | `true` |
| working_tree_clean | `false` (fact only, not forced clean) |
| protected_scope_clean | `true` |
| acceptance_scope.unchanged | `true` |

**Prohibited-state check:** `ENGINE_ACCEPTED_FOR_UI` is `NOT_ISSUED`. `UI_UX_ENTRY_GATE = CLOSED`.

## ACCEPTANCE_FORMULA_INPUTS

| Input | Value |
|---|---|
| mandatory_suite.QA1..QA8.status == COMPLETE | `true` |
| critical_invariant.blocked | `2` |
| critical_invariant.skipped | `0` |
| critical_invariant.uncovered | `0` |
| defects.P0 | `0` |
| defects.P1 | `12` |
| defects.P2 | `0` |
| defects.P3 | `0` |
| baseline.valid | `true` |
| acceptance_scope.unchanged | `true` |
| report.baseline_id == baseline.id | `true` |
| report.evidence_integrity == VALID | `true` |

### Mandatory suite status (QA1-QA8)

| suite | completion_status |
|---|---|
| `QA1` | `COMPLETE` |
| `QA2` | `COMPLETE` |
| `QA3` | `COMPLETE` |
| `QA4` | `COMPLETE` |
| `QA5` | `COMPLETE` |
| `QA6` | `COMPLETE` |
| `QA7` | `COMPLETE` |
| `QA8` | `COMPLETE` |

## P0_SECURITY_FINDINGS (must remain visible — not buried in defects.v1.json only)

- (none currently recorded)

## OTHER_DEFECTS

- `P1` `qa4:TIME-KST-DAY-BOUNDARY` (suite `QA4`, invariant `INV-TIME-01`) — stateful-time fail: TIME-KST-DAY-BOUNDARY
- `P1` `qa4:TIME-KST-MONTH-END` (suite `QA4`, invariant `INV-TIME-01`) — stateful-time fail: TIME-KST-MONTH-END
- `P1` `qa4:TIME-KST-YEAR-END` (suite `QA4`, invariant `INV-TIME-01`) — stateful-time fail: TIME-KST-YEAR-END
- `P1` `qa4:TIME-PLUS-30D` (suite `QA4`, invariant `INV-TIME-01`) — stateful-time fail: TIME-PLUS-30D
- `P1` `qa4:TIME-PLUS-365D` (suite `QA4`, invariant `INV-TIME-01`) — stateful-time fail: TIME-PLUS-365D
- `P1` `qa4:TIME-MULTI-DAY-LIFECYCLE` (suite `QA4`, invariant `INV-LIFECYCLE-01`) — stateful-time fail: TIME-MULTI-DAY-LIFECYCLE
- `P1` `qa5:FAULT-AI-429-DEGRADE` (suite `QA5`, invariant `INV-FEED-AI-01`) — failure-world fail: FAULT-AI-429-DEGRADE
- `P1` `qa5:FAULT-AI-TIMEOUT-FALLBACK` (suite `QA5`, invariant `INV-FEED-AI-01`) — failure-world fail: FAULT-AI-TIMEOUT-FALLBACK
- `P1` `qa5:FAULT-UPSTREAM-5XX-DEGRADE` (suite `QA5`, invariant `INV-FEED-AI-01`) — failure-world fail: FAULT-UPSTREAM-5XX-DEGRADE
- `P1` `qa5:FAULT-RECOVERY-LEDGER-SCAN` (suite `QA5`, invariant `INV-LEDGER-01`) — failure-world fail: FAULT-RECOVERY-LEDGER-SCAN
- `P1` `qa5:FAULT-RECOVERY-IDEMPOTENCY-SCAN` (suite `QA5`, invariant `INV-IDEMPOTENCY-01`) — failure-world fail: FAULT-RECOVERY-IDEMPOTENCY-SCAN
- `P1` `qa5:FAULT-RECOVERY-USER-STATE` (suite `QA5`, invariant `INV-LEDGER-01`) — failure-world fail: FAULT-RECOVERY-USER-STATE

## REMAINING_BLOCKED (critical_invariant.blocked cumulative = 2)

| # | code | suite | invariant | scenario(s) |
|---|---|---|---|---|
| 1 | `BLOCKED_ENV_CAPABILITY` | QA6 | INV-PERF-01 | PERF-FEED-READ, PERF-PARTICIPATE, PERF-WALLET-READ, PERF-AUTH-PROFILE |
| 2 | `BLOCKED_ENV_CAPABILITY` | QA8 | INV-ISOLATION-01 | SEC-DYNAMIC-ADVERSARIAL-01 |

Row count (2) matches evidence-manifest.v1.json critical_invariant.blocked=2. None of these were converted to FAIL/PASS/SKIPPED to manufacture a cleaner verdict (mock-PASS and BLOCKED-laundering are both forbidden by acceptance-contract §L3).

### Performance World (k6, CI only heavy) — QA6 record retained

QA6 record retained unchanged through QA7/QA8/QA9. suite status `BLOCKED` — budget
SPECIFIED (Human/PO ACK, perf-budget.v1.json V1) — k6 scenario-mix + tag threshold mechanism
locked — numeric SLO invention forbidden — tags: `feed_read`:`BLOCKED`, `participate`:`BLOCKED`, `wallet_read`:`BLOCKED`, `auth_profile`:`BLOCKED` — heavy k6 remains CI
only — artifact retention >= 90 days — aggregator `if: always()`.

### Security and Privacy World (QA8, ASVS 5.0.0 subset)

admin-boundary / user-isolation / JWT-token-validation / privacy-delete-account / error-disclosure -
dynamic adversarial scenario(s): `SEC-DYNAMIC-ADVERSARIAL-01`:`BLOCKED` (`BLOCKED_ENV_CAPABILITY`).
QA8 is a discovery suite: any finding it records in defects.v1.json is not repaired by QA8 or QA9
themselves - repairs happen in a dedicated round (see REPAIR_ENTRY_POINT). QA9 remains aggregation
only and invents no new ASVS scenarios.

## REPAIR_ENTRY_POINT (governance state)

Outstanding right now: 12 P1 defect(s), 2 BLOCKED critical_invariant row(s). What exists to repair them:

1. **Protected product repair** (touches `services/api-nest/src/**` or other
   `protected-scope.v1.json` roots) uses the already-governed pattern: change protected
   bytes as an ordinary commit, then trigger `ENGINE_ACCEPTANCE_REBASE_V1`
   (`tooling/engine-acceptance/rebase-acceptance-baseline.cjs`, Human/PO ACK required) to
   open a new acceptance epoch, then re-run QA1-QA8 then QA9.
2. **Harness-only repair** = `tooling/engine-acceptance/**` changes with zero product-byte
   impact. Uses normal T0/T1 commit gates; no rebase needed since protected scope is
   untouched.
3. **Governance-only repair** = `governance/engine-acceptance/**` bookkeeping.
4. **Workflow L7 amendment** = `.github/workflows/engine-acceptance.yml` change under
   `POST_QA0_CONTROLLED_WORKFLOW_AMENDMENT_V1` (Human/PO ACK, exact-diff QA0-QA6
   semantics-unchanged proof).
5. **Performance budget Human/PO approval** = QA6's numeric p95/error-rate budget can only
   exist once Human/PO supplies it; `perf-budget.v1.json`'s `numeric_invention_forbidden`
   lock means the harness cannot self-supply these.
6. **L8 `ENGINE_ACCEPTANCE_REBASE_V1`** = required for any protected-product mutation
   (`services/api-nest/src/**`) needed to clear a remaining P0/P1/BLOCKED item.

## REBASE_GOVERNANCE_GAP — repaired as `ENGINE_ACCEPTANCE_REBASE_POLICY_V2`

Human/PO ACK APPROVED the policy-versioned repair (`amendment_id=rebase-policy-qa8-qa9-topology-20260814`,
codename `L8_REBASE_GOVERNANCE_GAP_REPAIR`). Historical V1 approvals remain valid; future rebases use V2:

- discovery invalidate/rerun includes **QA8** (STALE + historical provenance + washing)
- **QA9** is aggregation-only: `stale_aggregation_phases`, not a discovery suite; predecessor
  QA9 verdict/report is not current-authoritative; aggregation reruns only after current-epoch
  discovery evidence exists
- V1 shape cannot authorize a new rebase
- this repair created **no** new acceptance epoch and did **not** invalidate current evidence

## RECOMMENDED_REPAIR_BATCH (planning only — product items not executed by QA9)

Grouped in lowest-rerun-cost order (harness/governance-only first, protected-product last,
since every protected-product change forces a full QA1-QA8 then QA9 aggregation rebase rerun):

1. **qa4:TIME-KST-DAY-BOUNDARY** (P1, suite QA4, invariant INV-TIME-01) — stateful-time fail: TIME-KST-DAY-BOUNDARY
2. **qa4:TIME-KST-MONTH-END** (P1, suite QA4, invariant INV-TIME-01) — stateful-time fail: TIME-KST-MONTH-END
3. **qa4:TIME-KST-YEAR-END** (P1, suite QA4, invariant INV-TIME-01) — stateful-time fail: TIME-KST-YEAR-END
4. **qa4:TIME-PLUS-30D** (P1, suite QA4, invariant INV-TIME-01) — stateful-time fail: TIME-PLUS-30D
5. **qa4:TIME-PLUS-365D** (P1, suite QA4, invariant INV-TIME-01) — stateful-time fail: TIME-PLUS-365D
6. **qa4:TIME-MULTI-DAY-LIFECYCLE** (P1, suite QA4, invariant INV-LIFECYCLE-01) — stateful-time fail: TIME-MULTI-DAY-LIFECYCLE
7. **qa5:FAULT-AI-429-DEGRADE** (P1, suite QA5, invariant INV-FEED-AI-01) — failure-world fail: FAULT-AI-429-DEGRADE
8. **qa5:FAULT-AI-TIMEOUT-FALLBACK** (P1, suite QA5, invariant INV-FEED-AI-01) — failure-world fail: FAULT-AI-TIMEOUT-FALLBACK
9. **qa5:FAULT-UPSTREAM-5XX-DEGRADE** (P1, suite QA5, invariant INV-FEED-AI-01) — failure-world fail: FAULT-UPSTREAM-5XX-DEGRADE
10. **qa5:FAULT-RECOVERY-LEDGER-SCAN** (P1, suite QA5, invariant INV-LEDGER-01) — failure-world fail: FAULT-RECOVERY-LEDGER-SCAN
11. **qa5:FAULT-RECOVERY-IDEMPOTENCY-SCAN** (P1, suite QA5, invariant INV-IDEMPOTENCY-01) — failure-world fail: FAULT-RECOVERY-IDEMPOTENCY-SCAN
12. **qa5:FAULT-RECOVERY-USER-STATE** (P1, suite QA5, invariant INV-LEDGER-01) — failure-world fail: FAULT-RECOVERY-USER-STATE
13. **QA6 INV-PERF-01** — `BLOCKED_ENV_CAPABILITY` (PERF-FEED-READ, PERF-PARTICIPATE, PERF-WALLET-READ, PERF-AUTH-PROFILE)
14. **QA8 INV-ISOLATION-01** — `BLOCKED_ENV_CAPABILITY` (SEC-DYNAMIC-ADVERSARIAL-01)

## Dual Dirty

- working_tree_clean=`false`
- protected_scope_clean=`true`
- forced clean / stash laundry = forbidden

## NEXT_CANONICAL_WAVE

`03_blocked_fix_round` — verdict `ENGINE_NOT_ACCEPTED` blocks 03 UI. The next canonical wave is a **repair round** (see RECOMMENDED_REPAIR_BATCH), governed by `ENGINE_ACCEPTANCE_REBASE_V1` for any protected-product item, NOT a resumption of `02.5` discovery (QA0-QA9 are all COMPLETE) and NOT `03 UI` (blocked until a genuinely earned `ENGINE_ACCEPTED_FOR_UI` + `acceptance_scope.unchanged`).
