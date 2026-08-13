# ENGINE ACCEPTANCE REPORT

> **QA phase:** QA-6 `qa6-performance-world`  
> **Measured:** 2026-08-13T02:30:11.880Z  
> **baseline_id:** `ea-baseline-ca476b4698a6-c1d90fceefe9`  
> **qa6_run_id:** `qa6-performance-world-20260813`  
> **qa6_result_checksum:** `8d321bf24fd81116b1ffa0df1d3667f3c89e1658aa7d09e8f878f1970f91c1b9`  
> **mode:** `tiny`

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
QA HARNESS TARGET = SAFE
NEXT = QA7_AI_EVAL
PRODUCT MUTATION = 0
03 UI = BLOCKED
```

## Verdict (after QA-6)

| Field | Value |
|---|---|
| verdict | `ENGINE_QA_INCOMPLETE` |
| reason | QA6 COMPLETE · critical_invariant.blocked=5 (incl. UNSPECIFIED_PERF_BUDGET/BLOCKED_MISSING_ORACLE + prior BLOCKED_*) · P0/P1=0 · ACCEPTED 불가 · QA7..QA8 not executed |
| evidence_integrity | `VALID` |
| baseline.valid | `true` |
| working_tree_clean | `false` (fact only — not forced clean) |
| protected_scope_clean | `true` |
| defects.P0 / P1 | 0 / 0 |
| critical_invariant.blocked (cumulative) | 5 |
| critical_invariant.skipped | 0 |
| critical_invariant.uncovered | 0 |
| mandatory suites COMPLETE | QA0..QA6 only · QA7..QA8 NOT_STARTED |

**금지 확인:** `ENGINE_ACCEPTED_FOR_UI` **not issued** (critical BLOCKED/UNSPECIFIED and/or QA7..QA8 incomplete).

## Performance World (k6 · CI only heavy)

| Field | Value |
|---|---|
| suite status | `UNSPECIFIED_PERF_BUDGET` |
| budget_status | `UNSPECIFIED_PERF_BUDGET` |
| threshold_mechanism.locked | `true` |
| threshold_mechanism.engine | `k6` |
| threshold_mechanism.binding | `tag` |
| k6_script | `tooling/engine-acceptance/k6/scenario-mix.js` present=`true` |
| scenarios blocked/unspecified/failed/passed | 2 / 2 / 0 / 0 |
| numeric invention | **forbidden** |
| heavy k6 | **CI only** |
| mock PASS | **forbidden** |
| product mutation | `0` |
| artifact retention | acceptance evidence ≥ **90** days (Actions artifact) |
| aggregator | `if: always()` (선행 job 실패 후에도 집계) |

| Scenario | Tag | Invariant | Status | Budget | Blocked code |
|---|---|---|---|---|---|
| `PERF-FEED-READ` | `feed_read` | `INV-PERF-01` | `BLOCKED` | `UNSPECIFIED_PERF_BUDGET` | `BLOCKED_MISSING_ORACLE` |
| `PERF-PARTICIPATE` | `participate` | `INV-PERF-01` | `BLOCKED` | `UNSPECIFIED_PERF_BUDGET` | `BLOCKED_MISSING_ORACLE` |

### UNSPECIFIED_PERF_BUDGET

- Formal suite/budget status when product SLO/contract numeric budgets are absent.
- `BLOCKED_MISSING_ORACLE` on critical `INV-PERF-01` → `ENGINE_QA_INCOMPLETE` (ACCEPTED 불가).
- Invented p95 / error_rate = **금지**.

## Dual Dirty

- working_tree_clean=`false`
- protected_scope_clean=`true`
- forced clean / stash laundry = **forbidden**

## Next

`QA7_AI_EVAL` only. Full ACCEPTED · product mutation · 03 UI — **금지**.
