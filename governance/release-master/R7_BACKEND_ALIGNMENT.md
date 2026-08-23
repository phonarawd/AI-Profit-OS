# REL-505 — BACKEND_DATA_ALIGNMENT_CERTIFICATION (R7)

```text
R7_CERT: ISSUED
R7_ALIGNMENT: CONFLICTS_OWNED
CLEAN_ALIGNMENT: NO
HIDE: 0
DATE: 2026-08-23
PROJECT_REF: mgsytcetsiecllmhcyox
APPLY_MIGRATION: 0
PRODUCTION_DB_WRITE: 0
PROTECTED_SCOPE_MUTATION: false
FIXTURE: tooling/verify/fixtures/r7-backend-alignment.v1.json
```

이 문서는 API·SDK·Nest AppModule·Engine FSM·local/remote migration head·indexes/RLS/idempotency·auth permission·money units·source/asOf/reasonCode 의 **1:1 대조 결과**다.
`tooling/verify/fixtures/migrations-applied.v1.json` 은 로컬 파일명 접두사 스냅샷이며 **NOT remote 1:1**.

## Dependencies (위조 0)

| dep | plan YAML | this cert |
|---|---|---|
| REL-502 | PENDING | H-DEP-502 · FINAL_ACCEPTANCE 창작 0 |
| REL-504 | PENDING | H-DEP-504 · MIGRATION_READINESS READY 창작 0 |

## 대조표 (공란 0)

| id | 차원 | 판정 | owner |
|---|---|---|---|
| D-API-SDK | API · SDK consumer path | ALIGNED | — |
| D-APPMODULE | Nest AppModule imports | ALIGNED | — |
| D-ENGINE-FSM | Engine FSM · resultCode | CONFLICT | REL-509 |
| D-MIGRATION-HEAD | local/remote migration head | CONFLICT | REL-508 |
| D-INDEX-RLS-IDEM | indexes · RLS · idempotency | ALIGNED | — |
| D-AUTH-PERM | auth permission | ALIGNED | — |
| D-MONEY-UNITS | money units | ALIGNED | — |
| D-SOURCE-ASOF-REASON | source / asOf / reasonCode | CONFLICT | REL-510 |

## Conflicts (first-class · 각주로 숨기지 않음)

| id | 내용 | owner |
|---|---|---|
| C-MIG-VERSION-DRIFT | 같은 name, 다른 version id (ptf00c ×4 + krw_deposit_fx_facts) | REL-508 |
| C-MIG-REMOTE-ORPHAN-ONBOARDING | 원격 `20260821223109 beginner_onboarding_experience` · 로컬 SQL 0 · public 잔여 객체 0 | REL-508 |
| C-MIG-REMOTE-DUP-IDEMPOTENCY | 원격 idempotency_request_fingerprint 두 줄 (`20260810212231` + `20260811062000`) | REL-508 |
| C-MIG-FIXTURE-HIDE | migrations-applied.v1.json 이 원격 apply-time version을 로컬 접두사로 대체 | REL-508 |
| C-FSM-REGISTRY-STATUS | registry `engine.trade_execution` 에 cancelled/failed 없음 (schema/SDK/Nest 에는 있음) | REL-509 |
| C-FSM-CANCELLED-BY-USER | Nest/SDK/schema `CANCELLED_BY_USER` · rust/cjs ExecutionResultCode 없음 | REL-509 |
| C-REASON-CIRCUIT-GRAMMAR | `BUCKET_INVARIANT_FAIL` ≠ `domain.resource.reason` | REL-510 |

## Holds (semantic conflict 아님)

| id | 내용 | owner |
|---|---|---|
| H-TRACK-A-UNAPPLIED | 로컬 전용 미적용 Track A 3파일. apply = REL-701-DB | REL-701-DB |
| H-DEP-502 | REL-502 미완료 | REL-502 |
| H-DEP-504 | REL-504 미완료 | REL-504 |

## ALIGNED evidence

- AppModule imports 21 = disk feature modules 21.
- SDK Phase0 `/api/v1/*` ⊆ Nest. Phase1 `trades/:id/execution` 예약. `/me/membership`·`/me/benefits` = PendingFigma.
- RLS ENABLE + money/auth FORCE + policy 2개(deny_all) + ledger 불변 트리거 + `request_fingerprint` + idempotency_key unique. `auth.uid()` 0.
- 유저 컨트롤러 JwtAuthGuard. Nest JWT SoT.
- USDT = decimal string (wallet-buckets schema · SDK · Nest).

## Version bump

```text
RELEASE_MASTER_REVISION += REL-505 R7 + additive REL-508/509/510
R7_ALIGNMENT_EPOCH = 2026-08-23
certVersion = 1
```

기존 116 REL 정의를 덮어쓰지 않는다. 충돌 owner 가산만.

## Exit

- 충돌을 각주/노트/로컬접두사 픽스처로 숨기면 FAIL.
- 이 인증을 CLEAN alignment 로 인용하면 FAIL.
- apply/DDL 0.
- 재인증은 owner REL 완료 후 fixture+본 문서 갱신.
