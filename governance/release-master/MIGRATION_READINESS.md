# PRODUCTION MIGRATION READINESS (REL-504)

```text
REL = REL-504
TITLE = PRODUCTION_MIGRATION_READINESS_CHECK
STATUS = COMPLETED
PLAN_LOCKED = TRUE
PROTECTED_SCOPE_MUTATION = FALSE
READY = 1
PRODUCTION_DB_APPLY = 0
APPLY_MIGRATION = 0
APPLY_LOG = 0
APPLY_OWNER = REL-701-DB
PROJECT_REF = mgsytcetsiecllmhcyox
LOCAL_MIGRATION_FILES = 53
REMOTE_APPLIED_SNAPSHOT = 42
REMOTE_RAW_APPLIED = 43
COMMITTED_UNAPPLIED = 11
TRACK_A_FILE_RESTORE = 3
REL_408_BASELINE = 1
REL_502_ISSUED = 0
```

이 문서는 migration-plan READY 신호다. Production release authorization 이 아니다. REL-502가 NOT_ISSUED인 동안 Production release 근거로 승격 금지. 원격 스키마 변경 명령이 아니며 production DDL = 0. apply owner 는 REL-701-DB 그대로다.

## 2026-08-24 LIVE TRUTH RECONCILIATION

- 실제 연결 Supabase `supabase_migrations.schema_migrations` READ 결과 raw applied row = 42, latest = `20260821223109 beginner_onboarding_experience`.
- canonical applied local-version snapshot = 41. raw 42와 canonical 41의 차이는 historical duplicate/no-op row를 fixture의 `remoteHistoricalMappings` + `rawCountDelta`로 명시한다.
- `20260810212231 idempotency_request_fingerprint`는 실제 SQL이 적용된 historical early row이고, `20260811062000` raw row는 statements=[]이다. local canonical file은 `20260811062000_idempotency_request_fingerprint.sql`이며 실제 early-row SQL과 같은 schema effect를 보존한다.
- `20260814152139 ptf00c_r1_provider_tick_ledger` raw remote SQL은 local `20260814140000_ptf00c_r1_provider_tick_ledger.sql`과 동일하다. apply-time version alias로 기록하며 파일 rename/reapply 하지 않는다.
- remote에 적용돼 있었지만 main migration source에서 빠져 있던 `20260817154827_krw_deposit_fx_facts.sql`과 `20260821223109_beginner_onboarding_experience.sql`을 remote `statements` 그대로 source-restored 했다. 이 복구는 Git source만 변경하며 DB apply/write = 0.

## REVIEW

- 로컬 `supabase/migrations/*.sql` 52 · filename `YYYYMMDDHHMMSS_*.sql`
- 원격 applied canonical snapshot `tooling/verify/fixtures/migrations-applied.v1.json` versions = 41 (asOf 2026-08-24, ref `mgsytcetsiecllmhcyox`)
- 실제 remote raw applied rows = 42; alias/duplicate history를 fixture에 명시해 숨기지 않는다
- file-only `committedUnapplied` 11 — 원격 apply 전. 이 단계에서 versions 로 옮기지 않는다
- Track A (REL-003) file restore 3: `20260819210000` · `20260819220000` · `20260820013000` + `opportunity-reprice.service.ts` 존재
- REL-408 `SECURITY_BASELINE.md` · `REL-408-SECURITY-BASELINE.md` COMPLETED · APPLY_MIGRATION = 0
- REL-502 `FINAL_ACCEPTANCE.md` STATUS = NOT_ISSUED · REBASE_REQUIRED = 1 · ACK_RECEIVED = 0

## VERIFY

| command | expected |
|---|---|
| `pnpm verify:migrations-applied-parity` | PASS (52 local · 41 canonical applied · 42 raw remote rows · 11 pending) |
| `pnpm verify:rel-408-security-baseline` | PASS |
| `pnpm verify:rel-504-migration-readiness` | PASS |

## EXIT_GATE

이 REL 산출물에 production DB apply 실행 흔적이 있으면 FAIL. Remote history와 repo migration source가 다시 불일치하면 READY를 release 근거로 사용하지 않는다.


## 2026-09-03 OVERNIGHT V4 LIVE RECONCILIATION

- OVERNIGHT_V4_RECONCILED = 1
- Live remote raw = 43 / latest = 20260902155632_withdraw_broadcast_tron
- Source-restored 20260902155632_withdraw_broadcast_tron.sql from remote statements
- #204 hardening renamed 20260902092000 -> 20260903092000 for ordering after remote head
- REL_502_ISSUED = 0 / Production DB mutation = 0
