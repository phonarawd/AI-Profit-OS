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
LOCAL_MIGRATION_FILES = 54
REMOTE_APPLIED_SNAPSHOT = 54
REMOTE_RAW_APPLIED = 55
COMMITTED_UNAPPLIED = 0
TRACK_A_FILE_RESTORE = 3
REL_408_BASELINE = 1
REL_502_ISSUED = 1
REL_701_DB_EXECUTED = 1
```

이 문서는 migration-plan READY 신호다. Production release authorization 이 아니다. REL-502 ISSUED는 migration readiness 선행조건 충족만 의미하며 Production release authorization은 아니다. REL-504 자체는 원격 스키마 변경 명령이 아니며 이 REL의 production DDL = 0. apply owner 는 REL-701-DB 그대로이며, REL-701-DB 는 2026-09-04 에 별도 Founder 승인으로 **실행 완료**됐다(아래 절).

## 2026-09-04 REL-701-DB EXECUTED (Founder-authorized · owner REL-701-DB · not this REL)

- 승인: Founder 채팅 지시 2026-09-04 10:22 KST (`INTEGRATION_PACKET_20260904` §3 게이트 #5 명시). Night Guard founder-auth 스코프 `REL-701-DB`(2시간 시한 · 적용 직후 파일 제거).
- 방법: `supabase db push --include-all` (pooler session 5432 · postgres 롤) · 임시 workdir = 레포 54 파일 + 원격 alias 이력 5건 presence placeholder(적용 0 · 레포 `supabase/migrations/**` 불변 · protected scope 드리프트 0).
- 결과: `supabase_migrations.schema_migrations` **43 → 55** · head `20260902155632` 불변 · alias 5행 보존 · public 테이블 93 불변.
- 순 스키마 델타: `withdraw_stepup_challenges.token_consumed_at` + `withdraw_stepup_challenges_token_unspent_idx` 만 (나머지 11개는 IF NOT EXISTS/OR REPLACE/ON CONFLICT DO NOTHING 로 기존 객체 확인만).
- `migration repair` 0 · 이력 수정 0 · `push_control`/`push_subscriptions` RLS 는 parity 마이그레이션대로 OFF 유지 → 하드닝은 PR #204 경로(protected scope · 새 epoch) 별도.
- 증거: `governance/recovery/founder-gates-executed-20260904.md` · `governance/recovery/evidence/rel-701-db-apply-20260904.txt` · fixture `rel701db` 블록.

## 2026-08-24 LIVE TRUTH RECONCILIATION

- 실제 연결 Supabase `supabase_migrations.schema_migrations` READ 결과 raw applied row = 42, latest = `20260821223109 beginner_onboarding_experience`.
- canonical applied local-version snapshot = 41. raw 42와 canonical 41의 차이는 historical duplicate/no-op row를 fixture의 `remoteHistoricalMappings` + `rawCountDelta`로 명시한다.
- `20260810212231 idempotency_request_fingerprint`는 실제 SQL이 적용된 historical early row이고, `20260811062000` raw row는 statements=[]이다. local canonical file은 `20260811062000_idempotency_request_fingerprint.sql`이며 실제 early-row SQL과 같은 schema effect를 보존한다.
- `20260814152139 ptf00c_r1_provider_tick_ledger` raw remote SQL은 local `20260814140000_ptf00c_r1_provider_tick_ledger.sql`과 동일하다. apply-time version alias로 기록하며 파일 rename/reapply 하지 않는다.
- remote에 적용돼 있었지만 main migration source에서 빠져 있던 `20260817154827_krw_deposit_fx_facts.sql`과 `20260821223109_beginner_onboarding_experience.sql`을 remote `statements` 그대로 source-restored 했다. 이 복구는 Git source만 변경하며 DB apply/write = 0.

## REVIEW

- 로컬 `supabase/migrations/*.sql` 54 · filename `YYYYMMDDHHMMSS_*.sql`
- 원격 applied canonical snapshot `tooling/verify/fixtures/migrations-applied.v1.json` versions = 54 (asOf 2026-09-04 post REL-701-DB, ref `mgsytcetsiecllmhcyox`)
- 실제 remote raw applied rows = 55; alias/duplicate history 5건을 fixture `remoteHistoricalMappings` 에 명시해 숨기지 않는다
- file-only `committedUnapplied` 0 — REL-701-DB 실행으로 12 → 0 (REL-504 단계에서 옮긴 것이 아니라 REL-701-DB 실행 기록)
- Track A (REL-003) file restore 3: `20260819210000` · `20260819220000` · `20260820013000` + `opportunity-reprice.service.ts` 존재
- REL-408 `SECURITY_BASELINE.md` · `REL-408-SECURITY-BASELINE.md` COMPLETED · APPLY_MIGRATION = 0
- REL-502 `FINAL_ACCEPTANCE.md` STATUS = ISSUED · REBASE_REQUIRED = 0 · ACK_RECEIVED = 1

## VERIFY

| command | expected |
|---|---|
| `pnpm verify:migrations-applied-parity` | PASS (54 local · 54 canonical applied · 55 raw remote rows · 0 pending) |
| `pnpm verify:rel-408-security-baseline` | PASS |
| `pnpm verify:rel-504-migration-readiness` | PASS |

## EXIT_GATE

이 REL(REL-504) 자체 산출물에 production DB apply 실행이 있으면 FAIL — REL-701-DB 실행 기록(위 절)은 owner REL-701-DB 의 것이며 REL-504 의 apply 가 아니다. Remote history와 repo migration source가 다시 불일치하면 READY를 release 근거로 사용하지 않는다.
