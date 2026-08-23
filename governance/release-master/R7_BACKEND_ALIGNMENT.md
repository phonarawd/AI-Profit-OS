# REL-505 — BACKEND_DATA_ALIGNMENT_CERTIFICATION (R7)

```text
R7_CERT: ISSUED
R7_ALIGNMENT: HOLDS_OWNED
CLEAN_ALIGNMENT: NO
HIDE: 0
DATE: 2026-08-23
PROJECT_REF: mgsytcetsiecllmhcyox
APPLY_MIGRATION: 0
PRODUCTION_DB_WRITE: 0
PROTECTED_SCOPE_MUTATION: false
FIXTURE: tooling/verify/fixtures/r7-backend-alignment.v1.json
REMOTE_APPLIED: tooling/verify/fixtures/migrations-remote-applied.v1.json
certVersion: 3
```

이 문서는 API·SDK·Nest AppModule·Engine FSM·local/remote migration head·indexes/RLS/idempotency·auth permission·money units·source/asOf/reasonCode 의 **1:1 대조 결과**다.
`tooling/verify/fixtures/migrations-applied.v1.json` 은 로컬 파일명 접두사 스냅샷이며 **NOT remote 1:1**.
원격 apply-time 진실은 `migrations-remote-applied.v1.json` 이다.

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
| D-ENGINE-FSM | Engine FSM · resultCode | ALIGNED | — |
| D-MIGRATION-HEAD | local/remote migration head | ALIGNED | — |
| D-INDEX-RLS-IDEM | indexes · RLS · idempotency | ALIGNED | — |
| D-AUTH-PERM | auth permission | ALIGNED | — |
| D-MONEY-UNITS | money units | ALIGNED | — |
| D-SOURCE-ASOF-REASON | source / asOf / reasonCode | ALIGNED | — |

## Reconciled (REL-508/509/510 · first-class · 숨기지 않음)

| id | 내용 | owner |
|---|---|---|
| C-MIG-VERSION-DRIFT | 같은 name, 다른 version id 맵 공개 (ptf00c ×4 + krw_deposit_fx_facts). 버전 숫자를 같게 만들지 않음 | REL-508 |
| C-MIG-REMOTE-ORPHAN-ONBOARDING | ORPHAN_REMOTE `20260821223109 beginner_onboarding_experience` · 이 트리 로컬 SQL 0 · 컬럼 효과 있음 | REL-508 |
| C-MIG-REMOTE-DUP-IDEMPOTENCY | 원격 두 줄 (`20260810212231` + `20260811062000`) · 로컬은 후자만 · 행 삭제 0 | REL-508 |
| C-MIG-FIXTURE-HIDE | local-prefix 픽스처 유지 · remote proof = migrations-remote-applied.v1.json | REL-508 |
| C-FSM-REGISTRY-STATUS | registry `engine.trade_execution` 에 `failed` 추가 (Nest write). `cancelled` 는 rust-not-owner | REL-509 |
| C-FSM-CANCELLED-BY-USER | `cancelled` / `CANCELLED_BY_USER` = rust-not-owner (rust+cjs+Nest+registry). 가짜 rust variant 0 | REL-509 |
| C-REASON-CIRCUIT-GRAMMAR | `money.circuit.bucket_invariant` · 레거시 underscore_flat_alias 0 · apply 0 | REL-510 |

맵 문서: `governance/release-master/REL-508-MIGRATION-HEAD-IDENTITY.md`

## Conflicts (first-class · 남은 semantic conflict 0)

없음. C-FSM-* / C-REASON-* 는 Reconciled. CLEAN 인용 금지 — Holds 유지.

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
- Migration head identity map 공란 0. apply 0.
- registry `failed` + rust-not-owner `cancelled`/`CANCELLED_BY_USER`. circuit reasonCode `money.circuit.bucket_invariant`. `money_circuit.reason_code` 현재 null.

## Version bump

```text
RELEASE_MASTER_REVISION += REL-509/510 FSM + circuit reasonCode align
R7_ALIGNMENT_EPOCH = 2026-08-23
certVersion = 3
```

기존 REL 정의를 덮어쓰지 않는다. C-MIG-* / C-FSM-* / C-REASON-* 는 RECONCILED. H-TRACK-A-UNAPPLIED / H-DEP-502 / H-DEP-504 유지.

## Exit

- 충돌을 각주/노트/로컬접두사 픽스처로 숨기면 FAIL.
- 이 인증을 CLEAN alignment 로 인용하면 FAIL.
- apply/DDL 0.
- rust/cjs에 유저취소 variant 가짜 추가하면 FAIL.
- 레거시 circuit alias dual truth 이면 FAIL.
