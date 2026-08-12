# ENGINE ACCEPTANCE REPORT

> **QA phase:** QA-5 `qa5-failure-world`  
> **Measured:** 2026-08-12T11:49:55.088Z  
> **baseline_id:** `ea-baseline-13b7a5138ebe-cb4530b02ecf`  
> **qa5_run_id:** `qa5-failure-world-20260812`  
> **qa5_result_checksum:** `637ea4ed7a54569206d1bf11b839e3e1a7111ba58b9b872b30531ded7c7f4ac9`  
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
QA HARNESS TARGET = SAFE
NEXT = QA6_PERFORMANCE
PRODUCT MUTATION = 0
03 UI = BLOCKED
```

## Verdict (after QA-5)

| Field | Value |
|---|---|
| verdict | `ENGINE_QA_INCOMPLETE` |
| reason | QA5 COMPLETE · critical_invariant.blocked=4 (incl. BLOCKED_NO_FAULT_HOOK / prior BLOCKED_NO_CLOCK_HOOK) · P0/P1=0 · ACCEPTED 불가 · QA6..QA8 not executed |
| evidence_integrity | `VALID` |
| baseline.valid | `true` |
| working_tree_clean | `false` (fact only — not forced clean) |
| protected_scope_clean | `true` |
| defects.P0 / P1 | 0 / 0 |
| critical_invariant.blocked (cumulative QA4+QA5) | 4 |
| critical_invariant.skipped | 0 |
| critical_invariant.uncovered | 0 |
| mandatory suites COMPLETE | QA0..QA5 only · QA6..QA8 NOT_STARTED |

**금지 확인:** `ENGINE_ACCEPTED_FOR_UI` **not issued** (critical BLOCKED and/or QA6..QA8 incomplete).

## Failure World (CI fault · two axes)

| Field | Value |
|---|---|
| suite status | `BLOCKED` |
| fault_hook.available | `false` |
| fault_hook.blocked_code | `BLOCKED_NO_FAULT_HOOK` |
| scenarios blocked/failed/passed | 2 / 0 / 0 |
| axis1 (degradation/fallback) | `BLOCKED` · n=1 |
| axis2 (post-recovery invariant) | `BLOCKED` · n=1 |
| mock PASS | **forbidden** |
| product mutation | `0` |
| artifact retention | acceptance evidence ≥ **90** days (Actions artifact) |
| aggregator | `if: always()` (선행 job 실패 후에도 집계) |

| Scenario | Axis | Invariant | Status | Blocked code |
|---|---|---|---|---|
| `FAULT-AI-429-DEGRADE` | axis1 | `INV-FEED-AI-01` | `BLOCKED` | `BLOCKED_NO_FAULT_HOOK` |
| `FAULT-RECOVERY-LEDGER-SCAN` | axis2 | `INV-LEDGER-01` | `BLOCKED` | `BLOCKED_NO_FAULT_HOOK` |

### BLOCKED_NO_FAULT_HOOK

- Formal L3 result type (≠ defect).
- `INV-FEED-AI-01` / `INV-LEDGER-01` are **critical** → `critical_invariant.blocked > 0` → `ENGINE_QA_INCOMPLETE` (ACCEPTED 불가).
- Invented mock fault = **금지**.

## Dual Dirty

- working_tree_clean=`false`
- protected_scope_clean=`true`
- forced clean / stash laundry = **forbidden**

## Next

`QA6_PERFORMANCE` only. Full ACCEPTED · product mutation · 03 UI — **금지**.
