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
PRIMARY_SCHEMA_EFFECT_PRESENT_LEDGER_UNRECORDED = 10
ACTUAL_EFFECT_PENDING = 1
BLIND_REPLAY_FORBIDDEN = 1
TRACK_A_FILE_RESTORE = 3
REL_408_BASELINE = 1
REL_502_ISSUED = 0
REL_502_REBASE_REQUIRED = 1
```

이 문서는 READY 신호다. 원격 스키마 변경 명령이 아니다. production DDL = 0. apply owner 는 REL-701-DB 그대로다.

## 2026-09-03 LIVE TRUTH RECONCILIATION

- 실제 연결 Supabase `supabase_migrations.schema_migrations` READ 결과 raw applied row = 43, latest = `20260902155632 withdraw_broadcast_tron`.
- canonical applied local-version snapshot = 42. raw 43과 canonical 42의 차이는 historical duplicate/no-op row를 fixture의 `remoteHistoricalMappings` + `rawCountDelta`로 명시한다.
- `20260810212231 idempotency_request_fingerprint`는 실제 SQL이 적용된 historical early row이고, `20260811062000` raw row는 statements=[]이다. local canonical file은 `20260811062000_idempotency_request_fingerprint.sql`이며 실제 early-row SQL과 같은 schema effect를 보존한다.
- `20260814152139 ptf00c_r1_provider_tick_ledger` raw remote SQL은 local `20260814140000_ptf00c_r1_provider_tick_ledger.sql`과 동일하다. apply-time version alias로 기록하며 파일 rename/reapply 하지 않는다.
- remote에 적용돼 있었지만 integration migration source에서 빠져 있던 `20260902155632_withdraw_broadcast_tron.sql`을 recovery의 reconciled exact source로 복원했다.
- 2026-09-03 provider effect reconciliation 결과, `committedUnapplied=11`은 **11개 SQL을 그대로 Production에 재실행하라는 뜻이 아니다**. 그중 10개 버전의 주요 schema effect는 Production에 이미 존재하고 migration ledger만 canonical source와 불일치한다.
- `20260903092000_production_db_hardening.sql`만 현재 직접 확인된 실제 effect-pending migration이다. Production에서 `push_control` / `push_subscriptions` RLS는 OFF이고 deny policy는 0개다. staging rehearsal은 두 테이블 RLS+FORCE RLS와 deny policy 4개를 보유한다.
- `opportunity_price_overrides`는 Production/source가 `numeric(36,18)`인데 staging preview만 unrestricted `numeric`으로 넓어져 있던 drift를 발견했고, staging 0-row 상태에서 source와 동일한 `numeric(36,18)`로 복구했다. Production mutation = 0.
- 따라서 REL-701-DB는 **effect reconciliation first**다. missing ledger row만으로 migration replay를 승인하지 않는다. `BLIND_REPLAY_FORBIDDEN=1`. 상세 evidence: `governance/recovery/production-migration-effect-reconciliation.20260903.v1.json`.

## REVIEW

- 로컬 `supabase/migrations/*.sql` 53 · filename `YYYYMMDDHHMMSS_*.sql`
- 원격 applied canonical snapshot `tooling/verify/fixtures/migrations-applied.v1.json` versions = 42 (asOf 2026-09-03, ref `mgsytcetsiecllmhcyox`)
- 실제 remote raw applied rows = 43; alias/duplicate history를 fixture에 명시해 숨기지 않는다
- ledger 기준 `committedUnapplied` 11은 그대로 보존한다. 단, provider effect audit에서 10개는 주요 schema effect가 이미 존재한다. 이 10개는 **ledger/provenance reconciliation 대상**이며 blind SQL replay 대상이 아니다.
- 실제 effect pending으로 직접 확인된 것은 `20260903092000_production_db_hardening.sql` 1개다. 이 분류 역시 Production apply authority가 아니며 Founder 승인 전 mutation=0이다
- Track A (REL-003) file restore 3: `20260819210000` · `20260819220000` · `20260820013000` + `opportunity-reprice.service.ts` 존재
- REL-408 `SECURITY_BASELINE.md` · `REL-408-SECURITY-BASELINE.md` COMPLETED · APPLY_MIGRATION = 0
- REL-502 `FINAL_ACCEPTANCE.md` STATUS = NOT_ISSUED · REBASE_REQUIRED = 1

## VERIFY

| command | expected |
|---|---|
| `pnpm verify:migrations-applied-parity` | PASS (53 local · 42 canonical applied · 43 raw remote rows · 11 pending) |
| `pnpm verify:rel-408-security-baseline` | PASS |
| `pnpm verify:rel-504-migration-readiness` | PASS |

## EXIT_GATE

이 REL 산출물에 production DB apply 실행 흔적이 있으면 FAIL. Remote history와 repo migration source가 다시 불일치하면 READY를 release 근거로 사용하지 않는다.
또한 `committedUnapplied`만 근거로 SQL을 일괄 replay하려는 계획은 FAIL이다. REL-701-DB는 evidence 파일의 effect 분류를 먼저 재확인하고, 실제 missing effect만 itemized Founder approval 대상으로 올려야 한다.
