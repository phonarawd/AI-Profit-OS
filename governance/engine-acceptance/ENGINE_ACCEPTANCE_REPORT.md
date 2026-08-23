# ENGINE ACCEPTANCE REPORT

> **QA phase:** QA-6 `qa6-performance-world`  
> **Measured:** 2026-08-23T01:00:45.270Z  
> **baseline_id:** `ea-baseline-b5f275949da2-c8d8ae7d479e`  
> **qa6_run_id:** `qa6-performance-world-20260823`  
> **qa6_result_checksum:** `ff0c6bab3a86f1e88a51154c34d0f741202d83558c86ed587d1c9ca3c60504e6`  
> **mode:** `full`

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
| reason | QA6 COMPLETE · P0/P1=0 · mandatory suites QA7..QA8 not executed · ENGINE_ACCEPTED_FOR_UI forbidden |
| evidence_integrity | `VALID` |
| baseline.valid | `true` |
| working_tree_clean | `false` (fact only — not forced clean) |
| protected_scope_clean | `true` |
| defects.P0 / P1 | 0 / 0 |
| critical_invariant.blocked (cumulative) | 0 |
| critical_invariant.skipped | 0 |
| critical_invariant.uncovered | 0 |
| mandatory suites COMPLETE | QA0..QA6 only · QA7..QA8 NOT_STARTED |

**금지 확인:** `ENGINE_ACCEPTED_FOR_UI` **not issued** (critical BLOCKED/UNSPECIFIED and/or QA7..QA8 incomplete).

## Performance World (k6 · CI only heavy)

| Field | Value |
|---|---|
| suite status | `PASS` |
| budget_status | `SPECIFIED` |
| threshold_mechanism.locked | `true` |
| threshold_mechanism.engine | `k6` |
| threshold_mechanism.binding | `tag` |
| k6_script | `tooling/engine-acceptance/k6/scenario-mix.js` present=`true` |
| scenarios blocked/unspecified/failed/passed | 0 / 0 / 0 / 4 |
| numeric invention | **forbidden** |
| heavy k6 | **CI only** |
| mock PASS | **forbidden** |
| product mutation | `0` |
| artifact retention | acceptance evidence ≥ **90** days (Actions artifact) |
| aggregator | `if: always()` (선행 job 실패 후에도 집계) |

| Scenario | Tag | Invariant | Status | Budget | Blocked code |
|---|---|---|---|---|---|
| `PERF-FEED-READ` | `feed_read` | `INV-PERF-01` | `PASS` | `SPECIFIED` | `—` |
| `PERF-PARTICIPATE` | `participate` | `INV-PERF-01` | `PASS` | `SPECIFIED` | `—` |
| `PERF-WALLET-READ` | `wallet_read` | `INV-PERF-01` | `PASS` | `SPECIFIED` | `—` |
| `PERF-AUTH-PROFILE` | `auth_profile` | `INV-PERF-01` | `PASS` | `SPECIFIED` | `—` |

### SPECIFIED (Human/PO ACK)

- perf-budget.v1.json budget_version=V1, p95<=30ms, error_rate<=0.01, four tags (feed_read/participate/wallet_read/auth_profile).
- Numbers are Human/PO-ACK sourced, never invented by the harness.
- Real threshold PASS/FAIL is only reflected here when run-qa6-threshold.cjs (real k6 + booted Nest + isolated Postgres) produced fresh evidence in this same job.

## Dual Dirty

- working_tree_clean=`false`
- protected_scope_clean=`true`
- forced clean / stash laundry = **forbidden**

## Next

`QA7_AI_EVAL` only. Full ACCEPTED · product mutation · 03 UI — **금지**.
