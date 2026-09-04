# ENGINE ACCEPTANCE REPORT

> **QA phase:** QA-9 `qa9-acceptance-report` (FINAL aggregation / verdict issuance — not a new discovery suite)
> **Measured:** 2026-09-02T18:01:01.866Z
> **baseline_id:** `ea-baseline-0d8825e8f333-5ac0f4291966`
> **qa9_run_id:** `qa9-acceptance-report-20260902`
> **qa9_result_checksum:** `ec28c45284345961bc652fb193c3e0130f60bba13b6d862be7d0269b0e0f27cd`
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
NEXT = 03_ui_entry_unlocked
PRODUCT MUTATION = 0
03 UI = UNLOCKED
ENGINE_ACCEPTED_FOR_UI = ISSUED
UI_UX_ENTRY_GATE = OPEN
```

## FINAL_ACCEPTANCE_VERDICT

| Field | Value |
|---|---|
| verdict | `ENGINE_ACCEPTED_FOR_UI` |
| reason | QA9 COMPLETE - all acceptance-contract L1 conditions met - ENGINE_ACCEPTED_FOR_UI |
| evidence_integrity | `VALID` |
| baseline.valid | `true` |
| working_tree_clean | `true` (fact only, not forced clean) |
| protected_scope_clean | `true` |
| acceptance_scope.unchanged | `true` |

**Prohibited-state check:** `ENGINE_ACCEPTED_FOR_UI` is `ISSUED`. `UI_UX_ENTRY_GATE = OPEN`.

## ACCEPTANCE_FORMULA_INPUTS

| Input | Value |
|---|---|
| mandatory_suite.QA1..QA8.status == COMPLETE | `true` |
| critical_invariant.blocked | `0` |
| critical_invariant.skipped | `0` |
| critical_invariant.uncovered | `0` |
| defects.P0 | `0` |
| defects.P1 | `0` |
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

- (none currently recorded)

## REMAINING_BLOCKED (critical_invariant.blocked cumulative = 0)

No BLOCKED critical_invariant entries currently recorded across QA4/QA5/QA6/QA8.

### Performance World (k6, CI only heavy) — QA6 record retained

QA6 record retained unchanged through QA7/QA8/QA9. suite status `PASS` — budget
SPECIFIED (Human/PO ACK, perf-budget.v1.json V1) — k6 scenario-mix + tag threshold mechanism
locked — numeric SLO invention forbidden — tags: `feed_read`:`PASS`, `participate`:`PASS`, `wallet_read`:`PASS`, `auth_profile`:`PASS` — heavy k6 remains CI
only — artifact retention >= 90 days — aggregator `if: always()`.

### Security and Privacy World (QA8, ASVS 5.0.0 subset)

admin-boundary / user-isolation / JWT-token-validation / privacy-delete-account / error-disclosure -
dynamic adversarial scenario(s): `SEC-DYNAMIC-ADVERSARIAL-01`:`PASS`.
QA8 is a discovery suite: any finding it records in defects.v1.json is not repaired by QA8 or QA9
themselves - repairs happen in a dedicated round (see REPAIR_ENTRY_POINT). QA9 remains aggregation
only and invents no new ASVS scenarios.

## REPAIR_ENTRY_POINT (governance state)

No outstanding P0/P1 defects and no BLOCKED critical_invariant rows are currently recorded.

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

No outstanding defects or BLOCKED critical_invariant rows are currently recorded — nothing queued here.

## Dual Dirty

- working_tree_clean=`true`
- protected_scope_clean=`true`
- forced clean / stash laundry = forbidden

## NEXT_CANONICAL_WAVE

`03_ui_entry_unlocked` — verdict `ENGINE_ACCEPTED_FOR_UI` unlocks 03 UI. All acceptance-contract L1 conditions are met on this evidence.
