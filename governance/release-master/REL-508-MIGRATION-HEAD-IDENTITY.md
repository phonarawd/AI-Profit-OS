# REL-508 — MIGRATION_HEAD_IDENTITY_RECONCILE

```text
REL: REL-508
STATUS: RECONCILED
DATE: 2026-08-23
PROJECT_REF: mgsytcetsiecllmhcyox
APPLY_MIGRATION: 0
PRODUCTION_DB_WRITE: 0
PROTECTED_SCOPE_MUTATION: false
SQL_EDIT: 0
TRACK_A_APPLY: 0
R7_CLEAN: NO
```

C-MIG-* 를 숨기지 않고 local↔remote identity를 공란 0으로 공개한다.
버전 숫자를 같게 만들거나 apply 하지 않는다.
`migrations-applied.v1.json` 에 remote apply-time id를 넣어 1:1인 척하지 않는다.

원격 진실 = `tooling/verify/fixtures/migrations-remote-applied.v1.json`
로컬 파일명 접두사 = `tooling/verify/fixtures/migrations-applied.v1.json` (NOT remote 1:1)

## C-MIG-VERSION-DRIFT — identity map

| name | local filename prefix | remote apply-time |
|---|---|---|
| ptf00c_fx_marketplace_normalization | 20260814130000 | 20260814134038 |
| ptf00c_provider_runtime_health | 20260814130100 | 20260814134055 |
| ptf00c_provider_health_last_tick_partial | 20260814130200 | 20260814135111 |
| ptf00c_r1_provider_tick_ledger | 20260814140000 | 20260814152139 |
| krw_deposit_fx_facts | 20260818010000 | 20260817154827 |

같은 name · 다른 version id. 맵이 공란 0이면 identity CONFLICT가 아니다.

## C-MIG-REMOTE-ORPHAN-ONBOARDING — ORPHAN_REMOTE

| field | value |
|---|---|
| remote version | 20260821223109 |
| remote name | beginner_onboarding_experience |
| local SQL on this tree | 0 |
| named public table | 0 |
| schema effect | user_profiles.beginner_onboarding_completed_at exists |
| source candidate (not copied, not applied) | .worktrees/rel-auth-track-a-integration `20260822080000_beginner_onboarding_experience.sql` |

후보 파일 version ≠ remote. 복사를 apply로 쓰지 않는다.

## C-MIG-REMOTE-DUP-IDEMPOTENCY — REMOTE_DUPLICATE_IDENTITY

| version | where |
|---|---|
| 20260810212231 | remote only |
| 20260811062000 | remote + local `20260811062000_idempotency_request_fingerprint.sql` |

컬럼 `request_fingerprint` 는 ledger_journals / participate_requests 에 있다.
원격 행 삭제 0. 없는 로컬 파일 창작 0.

## C-MIG-FIXTURE-HIDE — split truth

| fixture | role |
|---|---|
| migrations-applied.v1.json | local filename prefix snapshot |
| migrations-remote-applied.v1.json | remote apply-time versions |

로컬 접두사로 원격을 덮어쓰면 FAIL.

## Hold (승격 0)

H-TRACK-A-UNAPPLIED 유지. apply = REL-701-DB.

- 20260819210000_source_observations
- 20260819220000_canonical_products
- 20260820013000_match_results

## Exit

- APPLY 0
- DDL 0
- R7 전체 CLEAN 인용 FAIL
- 남은 CONFLICT = C-FSM-* (REL-509) · C-REASON-* (REL-510)
