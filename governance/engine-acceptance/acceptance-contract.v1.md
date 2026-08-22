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

## L7 — Post-QA0 Controlled Workflow Amendment

> **Decision ID:** `POST_QA0_CONTROLLED_WORKFLOW_AMENDMENT_V1`  
> **SSOT ledger:** `workflow-amendments.v1.json`  
> **Apply path only:** `tooling/engine-acceptance/amend-acceptance-workflow-hash.cjs`

QA-0 baseline freeze 이후에도 **workflow-only orchestration** 변경은 명시적 Human/PO ACK가 있는 controlled amendment로 허용한다.

| 대상 | 정책 |
|---|---|
| `baseline.id` (`baseline_id`) | **STABLE** — amendment로 변경 금지 |
| `prompt_hash` | **IMMUTABLE** — amendment로도 변경 금지 |
| `eval_dataset_hash` | **IMMUTABLE** — amendment로도 변경 금지 |
| `acceptance_workflow_hash` | **CONTROLLED_AMENDMENT_ONLY** — 승인된 provenance로만 전이 |

### 금지

1. suite runner(`run-qa2`..`run-qa6`)의 `syncWorkflowHash` / `syncAggregateHashes`가 `acceptance_workflow_hash`를 암묵 sync하는 것
2. amendment 없는 workflow hash drift를 PASS로 세탁하는 것
3. QA7 body execution 진행 중(`RUNNING`/`IN_PROGRESS`/`STARTED`) baseline workflow amendment
4. full REFREEZE를 본 decision의 대체 경로로 쓰는 것 (`NO_REFREEZE_GOVERNANCE` 유지)

### Amendment provenance (최소 필드)

`amendment_id` · `reason` · `human_po_ack` · `old_acceptance_workflow_hash` · `new_acceptance_workflow_hash` · `workflow_diff_scope` (exact diff + QA0–QA6 semantics checks) · `affected_qa_suites` · `unaffected_completed_suites` · `baseline_id` · `commit_sha_or_pending` · `timestamp`

### QA0–QA6 validity

QA7-only wiring처럼 QA0–QA6 실행 semantics를 변경하지 않음이 **exact diff로 증명**되면 QA0–QA6 COMPLETE evidence를 재실행 없이 유지할 수 있다.

다음 중 하나라도 true/불확실이면 amendment **FAIL/BLOCKED** (별도 governance 판정 필요):

- QA0–QA6 command 변경
- artifact/upload semantics 변경
- env/permission 변경
- PASS/FAIL logic 변경
- `workflow_diff_scope.qa0_qa6_semantics_changed != false`

L7 STABLE / IMMUTABLE 핀은 **같은 acceptance epoch 안**에서만 성립한다. 보호 제품 바이트가 QA0 이후 바뀌면 L8 rebase가 새 epoch를 만든다. Amendment로 `prompt_hash`를 제자리 수정하는 것은 계속 금지.

## L8 — Product Acceptance Rebase (new epoch)

> **Decision ID:** `ENGINE_ACCEPTANCE_REBASE_V1`  
> **SSOT ledger:** `product-rebases.v1.json`  
> **Apply path only:** `tooling/engine-acceptance/rebase-acceptance-baseline.cjs`  
> **Predecessor archive:** `governance/engine-acceptance/baselines/<predecessor_id>.json`

QA0 freeze 이후 **protected product mutation**은 새 acceptance epoch를 만든다. 옛 baseline의 `prompt_hash` / `id`를 제자리 고쳐 MATCH를 만드는 것(**baseline washing**)은 금지.

| 규칙 | 정책 |
|---|---|
| 새 epoch | 새 `baseline.id` · live accepted product bytes pin |
| predecessor | 옛 baseline은 이력 · 해시 제자리 재작성 금지 |
| QA1–QA6 | predecessor COMPLETE는 역사 · **current epoch = STALE** · 재실행 필수 |
| QA7 | current-epoch QA1–QA6 재구축 후에만 |
| QA8 | **discovery suite** (mandatory_suite.QA1..QA8). V2부터 predecessor COMPLETE는 역사 · **current epoch = STALE** · 재실행 필수. P0/P2 발견은 새 epoch 실행이 대체할 때까지 predecessor evidence/history로 남긴다. 결함을 rebase가 지우지 않는다. |
| QA9 | **aggregation / verdict phase** (discovery 아님). V2부터 predecessor QA9 verdict/report는 current-authoritative가 아니다. 새 epoch discovery evidence가 생긴 뒤에만 aggregation을 재실행한다. rebase 시점에 새 verdict를 만들지 않는다. |
| eval dataset | product-only rebase 동안 **unchanged / MATCH** |
| workflow hash | 바이트가 안 바뀌면 현 승인 해시 **MATCH** · 바뀌면 L7 amendment |
| `acceptance_scope.unchanged` | **NEW epoch baseline**과 비교 |
| Human/PO ACK | rebase 필수 |
| `freeze-baseline.cjs` | 초기 QA0 이후 무단 재실행 금지 (L8 경로만) |

### 금지

1. 옛 baseline id를 유지한 채 `prompt_hash`만 교체
2. predecessor QA1–QA6 결과를 current COMPLETE로 재사용
3. protected 변경 파일을 scope에서 빼서 MATCH 제조
4. product-only rebase 중 eval dataset 변경
5. workflow hash 암묵 변경
6. invalidation ledger 없이 새 baseline 생성
7. ACK 없는 rebase
8. predecessor QA8 결과를 current COMPLETE로 재사용 (V2)
9. predecessor QA9 verdict/report를 새 epoch의 current-authoritative 판정으로 유지하거나 rebase 시점에 새 verdict를 날조

### Rebase policy versioning

역사적 승인 rebase는 **승인 당시 topology**로만 검증한다. 현재 정책 상수로 과거 payload를 exact-match하지 않는다.

| 정책 | 적용 | invalidated (discovery STALE) | required rerun (discovery) | aggregation stale |
|---|---|---|---|---|
| `ENGINE_ACCEPTANCE_REBASE_POLICY_V1` | 역사적 승인 3건 (`product-rebases.v1.json` frozen ids) | QA1–QA6 | QA1–QA7 | (없음 — QA8/QA9 이전) |
| `ENGINE_ACCEPTANCE_REBASE_POLICY_V2` | **미래** protected-product rebase 전용 | QA1–QA6 + **QA8** | QA1–QA8 | **QA9** (discovery 배열에 넣지 않음) |

V1 shape은 새 epoch를 인가할 수 없다. 정책 amendment는 새 acceptance epoch를 만들지 않고 현재 evidence를 무효화하지 않는다.

SSOT: `product-rebases.v1.json` `rebase_policy` + `tooling/engine-acceptance/lib/product-rebase.cjs`.

## L9 — Reviewed Eval Evolution (new epoch · distinct from L8)

> **Decision ID:** `ENGINE_ACCEPTANCE_REBASE_EVAL_REVIEW_V1`  
> **SSOT ledger:** `eval-evolutions.v1.json`  
> **Apply path only:** `tooling/engine-acceptance/rebase-acceptance-baseline-eval-review.cjs`  
> **Review evidence:** `governance/engine-acceptance/eval-evolution-reviews/*.json`

L8 product-only rebase는 계속 `eval_dataset_hash = MATCH`를 요구한다. 이 가드를 우회하거나 약화하지 않는다.

의도적 eval dataset 변경은 **별도** 경로로만 새 epoch를 만든다. 리뷰 없는 eval drift는 거절한다. Human/PO ACK 없는 apply는 거절한다. Founder ACK를 날조하지 않는다.

| 규칙 | 정책 |
|---|---|
| product-only L8 | eval MATCH 유지 · 본 경로로 대체 금지 |
| eval hashes | predecessor / live / review 세 값이 일치하게 기록 (old ≠ new) |
| changed files | exact path + added/removed/modified case ids |
| safety | REMOVED_SAFETY_CASES=0 (정당화 없는 삭제 금지) · WEAKENED_ASSERTIONS=0 · DISABLED_EVAL_FILES=0 |
| predecessor | 옛 baseline archive · 제자리 rewrite 금지 |
| QA topology | L8 V2와 동일 (QA1–QA8 STALE · QA9 aggregation stale) |
| workflow hash | 바이트가 안 바뀌면 MATCH · 바뀌면 L7 |
| Human/PO ACK | apply 필수 · statement가 `ENGINE_ACCEPTANCE_REBASE_EVAL_REVIEW_V1`를 명시 |

SSOT: `eval-evolutions.v1.json` + `tooling/engine-acceptance/lib/eval-review-rebase.cjs`.
