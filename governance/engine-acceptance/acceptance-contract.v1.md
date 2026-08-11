# Engine Acceptance Contract v1 (L1–L6)

> **Status:** LOCKED (QA-0)  
> **Owns:** `governance/engine-acceptance/**` · `tooling/engine-acceptance/**` · `verify:engine-acceptance`  
> **철학:** 전수 조사 종료 전 제품 수정 0 · “결함을 못 찾음” ≠ ACCEPTED

## L1 — 3-state Verdict

| Verdict | 의미 | 03 UI |
|---|---|---|
| `ENGINE_ACCEPTED_FOR_UI` | 필수 suite COMPLETE + critical coverage 충족 + P0/P1=0 | 착수 허용 |
| `ENGINE_NOT_ACCEPTED` | P0 또는 P1 > 0 | **차단** |
| `ENGINE_QA_INCOMPLETE` | P0/P1=0 이어도 critical `BLOCKED`/`SKIPPED`/`UNCOVERED` 존재, 또는 mandatory suite 미완료, 또는 evidence 무결성 실패 | **차단** |

### Acceptance 식

```text
ENGINE_ACCEPTED_FOR_UI iff
  baseline.valid == true
  AND acceptance_scope.unchanged == true
  AND mandatory_suite.QA1..QA8.status == COMPLETE
  AND critical_invariant.blocked == 0
  AND critical_invariant.skipped == 0
  AND critical_invariant.uncovered == 0
  AND defects.P0 == 0
  AND defects.P1 == 0
  AND report.baseline_id == baseline.id
  AND report.evidence_integrity == VALID
```

### 상태 전이

```text
P0/P1 > 0 → ENGINE_NOT_ACCEPTED

P0/P1 == 0 AND (critical BLOCKED|SKIPPED|UNCOVERED > 0
  OR mandatory suite ≠ COMPLETE
  OR evidence_integrity ≠ VALID
  OR baseline/scope invalid) → ENGINE_QA_INCOMPLETE

P0/P1 == 0 AND mandatory evidence complete AND critical clean
  → ENGINE_ACCEPTED_FOR_UI
```

**QA-0 잠금:** 본 단계에서 `ENGINE_ACCEPTED_FOR_UI` 발급 **금지**. 정상 종료 시 report verdict = `ENGINE_QA_INCOMPLETE` (mandatory suite 미실행) · `next = QA1_DETERMINISTIC_TRUTH`.

## L2 — Protected-scope Baseline

SSOT: `baseline.v1.json` + `protected-scope.v1.json`.

필수 필드:

- `id` · `commit_sha` · `tree_sha`
- `working_tree_clean` — repo 전체 dirty 사실 (강제 clean 금지)
- `protected_scope_clean` — protected 경로만 오염 여부
- `lockfile_hash` · `schema_migration_hash` · `prompt_hash` · `eval_dataset_hash`
- `acceptance_workflow_hash` · `node_version` · `package_manager_version` (`pnpm@10.14`)
- `protected_scope_manifest` — 경로 목록 + content hash · 산출 규칙=`protected-scope.v1.json`

**03 진입 검사:** `HEAD == accepted commit`가 아니라  
`acceptance_scope.unchanged == (현재 protected_scope_manifest == accepted baseline manifest)`.

### Dual Dirty

| 필드 | 의미 |
|---|---|
| `working_tree_clean` | 전체 working tree dirty 여부 (사실 기록만) |
| `protected_scope_clean` | acceptance 대상 경로만 오염 여부 |

금지: 전체 tree dirty를 이유로 stash / WIP commit / 무관 파일 정리로 세탁 PASS.  
scope dirty → 오염 경로 명시 + `baseline.valid=false` (또는 verifier FAIL).

## L3 — BLOCKED_* 정식 결과 타입

| Code | 의미 |
|---|---|
| `BLOCKED_NO_CLOCK_HOOK` | 시간 가상화 훅 없음 |
| `BLOCKED_NO_FAULT_HOOK` | fault injection 훅 없음 |
| `BLOCKED_ENV_CAPABILITY` | 환경 능력 부족(로컬 RAM/Docker OFF 등) |
| `BLOCKED_MISSING_ORACLE` | 판정 oracle/SLO/계약 부재 |

BLOCKED ≠ defect. critical invariant의 BLOCKED/SKIPPED/UNCOVERED → ACCEPTED 불가.

## L4 — Severity Policy

SSOT: `severity-policy.v1.md`. **QA 실행 결과 본 뒤 severity 재조정 금지.**

`defects.v1.json` 필수 링크: `severity` · `invariant_id` · `suite_id` · `persona_id` · `journey_id` · `seed` · `trace_id` · `baseline_id` · `first_observed_at` · `repro_status`.

## L5 — CI Matrix / Concurrency / Workflow

SSOT: `.github/workflows/engine-acceptance.yml`

1. `strategy.fail-fast: false`
2. `concurrency` group — 동일 QA 환경 직렬화
3. `workflow_dispatch` — default branch에 workflow 존재 필요 · 개발 중 PR trigger 허용 · 최종 acceptance run은 default-branch workflow
4. Heavy jobs 실패 후에도 aggregator `if: always()`
5. Raw evidence = Actions artifact (retention ≥ 90일) · repo에는 summary + `evidence-manifest.v1.json` checksum만

**Heavy suite 전체는 `verify:gate` T2에 편입 금지** — 전용 workflow only.

## L6 — Production Kill-switch (harness only)

Destructive QA 전 필수 검사:

- `target_env` ∈ allowlist
- hostname allowlist
- synthetic account namespace prefix

하나라도 production-like → **즉시 abort**. 제품 코드 변경 없음.  
**순서 잠금:** kill-switch 검증이 tiny smoke보다 **먼저**.
