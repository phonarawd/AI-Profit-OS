# ENGINE ACCEPTANCE REPORT

> **QA phase:** QA-4 `qa4-stateful-time`  
> **Measured:** 2026-08-22T22:26:28.618Z  
> **baseline_id:** `ea-baseline-b5f275949da2-c8d8ae7d479e`  
> **qa4_run_id:** `qa4-stateful-time-20260822`  
> **qa4_result_checksum:** `108e72d6340a597dcf1960b7886079120d9c7fbf318350632a787730e8c036e5`  
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
QA HARNESS TARGET = SAFE
NEXT = QA5_FAILURE_WORLD
PRODUCT MUTATION = 0
03 UI = BLOCKED
```

## Verdict (after QA-4)

| Field | Value |
|---|---|
| verdict | `ENGINE_NOT_ACCEPTED` |
| reason | QA4 found P0=0 P1=6 · 03 blocked · product mutation 0 |
| evidence_integrity | `VALID` |
| baseline.valid | `true` |
| working_tree_clean | `false` (fact only — not forced clean) |
| protected_scope_clean | `true` |
| defects.P0 / P1 | 0 / 6 |
| critical_invariant.blocked | 0 |
| critical_invariant.skipped | 0 |
| critical_invariant.uncovered | 0 |
| mandatory suites COMPLETE | QA0..QA4 only · QA5..QA8 NOT_STARTED |

**금지 확인:** `ENGINE_ACCEPTED_FOR_UI` **not issued** (critical BLOCKED and/or QA5..QA8 incomplete).

## Stateful time (KST + multi-day)

| Field | Value |
|---|---|
| suite status | `FAIL` |
| clock_hook.available | `true` |
| clock_hook.blocked_code | `—` |
| scenarios blocked/failed/passed | 0 / 6 / 0 |
| mock PASS | **forbidden** |
| product mutation | `0` |

| Scenario | Invariant | Status | Blocked code | KST label |
|---|---|---|---|---|
| `TIME-KST-DAY-BOUNDARY` | `INV-TIME-01` | `FAIL` | `—` | 2026-03-15T00:00:00+09:00 |
| `TIME-KST-MONTH-END` | `INV-TIME-01` | `FAIL` | `—` | 2026-01-31T23:59:59+09:00 |
| `TIME-KST-YEAR-END` | `INV-TIME-01` | `FAIL` | `—` | 2026-12-31T23:59:59+09:00 |
| `TIME-PLUS-30D` | `INV-TIME-01` | `FAIL` | `—` | +30d from 2026-03-15T12:00:00+09:00 |
| `TIME-PLUS-365D` | `INV-TIME-01` | `FAIL` | `—` | +365d from 2026-03-15T12:00:00+09:00 |
| `TIME-MULTI-DAY-LIFECYCLE` | `INV-LIFECYCLE-01` | `FAIL` | `—` | multi-day lifecycle +3d |

### BLOCKED_NO_CLOCK_HOOK

- Formal L3 result type (≠ defect).
- `INV-TIME-01` is **critical** → `critical_invariant.blocked > 0` → `ENGINE_QA_INCOMPLETE` (ACCEPTED 불가).
- Wall-clock-only / invented mock clock = **금지**.

## Dual Dirty

- working_tree_clean=`false`
- protected_scope_clean=`true`
- forced clean / stash laundry = **forbidden**

## Next

`QA5_FAILURE_WORLD` only. Full ACCEPTED · product mutation · 03 UI — **금지**.
