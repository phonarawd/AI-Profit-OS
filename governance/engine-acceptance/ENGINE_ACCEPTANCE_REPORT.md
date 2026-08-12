# ENGINE ACCEPTANCE REPORT

> **QA phase:** QA-2 `qa2-synthetic-personas`  
> **Measured:** 2026-08-12T11:06:43.727Z  
> **baseline_id:** `ea-baseline-13b7a5138ebe-cb4530b02ecf`  
> **qa2_run_id:** `qa2-synthetic-personas-20260812`  
> **qa2_result_checksum:** `c8fbe6a347e0bcb19757e1e572fe7b22bcbf62a2da7860a3299e722e90dd4bd3`  
> **mode:** `tiny`

## Status banner

```text
ACCEPTANCE CONTRACT = LOCKED
BASELINE = FROZEN
QA0 = COMPLETE
QA1 = COMPLETE
QA2 = COMPLETE
QA HARNESS TARGET = SAFE
NEXT = QA3_GENERATIVE_FUZZ
PRODUCT MUTATION = 0
03 UI = BLOCKED
```

## Verdict (after QA-2)

| Field | Value |
|---|---|
| verdict | `ENGINE_QA_INCOMPLETE` |
| reason | QA2 COMPLETE · P0/P1=0 · mandatory suites QA3..QA8 not executed · ENGINE_ACCEPTED_FOR_UI forbidden |
| evidence_integrity | `VALID` |
| baseline.valid | `true` |
| working_tree_clean | `false` (fact only — not forced clean) |
| protected_scope_clean | `true` |
| defects.P0 / P1 | 0 / 0 |
| mandatory suites COMPLETE | QA0+QA1+QA2 only · QA3..QA8 NOT_STARTED |

**금지 확인:** `ENGINE_ACCEPTED_FOR_UI` **not issued** (QA3..QA8 incomplete).

## Personas × Journeys × Coverage

| Check | Status | Notes |
|---|---|---|
| coverage mapping (`QA2_COVERAGE_MAPPING`) | `PASS` | resolved=5 · kpi_forbidden=true |
| dirty path bias (`QA2_DIRTY_PATH_BIAS`) | `PASS` | dirty=4 > happy=1 |
| KPI case-count SLA | `FORBIDDEN` | 맵/시퀀스 개수 ≠ 합격 KPI |

## User isolation (INV-ISOLATION-01)

| Attack face | Status |
|---|---|
| interleave | `PASS` |
| token_cross | `PASS` |
| object_id_swap (IDOR) | `PASS` |

Isolation aggregate: `PASS`.

## Synthetic evidence (seed ≠ alone)

| Field | Status |
|---|---|
| seed + rng_version + clock_as_of + request_sequence | `PASS` |
| mode | `tiny` (tiny=local smoke) |
| live_http | `false` |
| selectedCount | 4 (observational · not KPI) |

## Dual Dirty

- working_tree_clean=`false`
- protected_scope_clean=`true`
- forced clean / stash laundry = **forbidden**

## Next

`QA3_GENERATIVE_FUZZ` only. Full ACCEPTED · product mutation · 03 UI — **금지**.
