# R7 BACKEND / DATA ALIGNMENT (REL-505)

```text
REL = REL-505
TITLE = BACKEND_DATA_ALIGNMENT_CERTIFICATION
STATUS = COMPLETED
CERT_ISSUED = 1
PLAN_LOCKED = TRUE
PROTECTED_SCOPE_MUTATION = FALSE
OPEN_CONFLICT = 0
STALE_PENDING_REBASE = 0
REBASE_OWNER = REL-502
CONCEALMENT = 0
ALL_ALIGNED = 0
KNOWN_P0 = 0
KNOWN_P1 = 0
KNOWN_P2 = 0
KNOWN_P3 = 0
ADDITIVE_REL = REL-508
CONTRACT_VERSION = 1.0.1
APPLY_MIGRATION = 0
PROJECT_REF = mgsytcetsiecllmhcyox
```

REL-508 이 `POST /api/v1/me/current-fx/approx` Nest 배선을 열었다. SDK/Nest 충돌은 닫혔다.
`services/api-nest` + `supabase/migrations` protected-scope 변경은 REL-502 formal rebase(`ea-baseline-137241804ff2-83935adcdf57`)에 포함되었고 drift는 0이다.
REL-502 current-epoch QA1~QA9가 공식 경로로 COMPLETE이고 `FINAL_ACCEPTANCE`는 ISSUED다. CERT_ISSUED=1 · STALE_PENDING_REBASE=0. predecessor 인증을 current로 세탁하지 않았다.

## 1. CLOSED CONFLICT

| id | left | right | verdict | owner |
|---|---|---|---|---|
| SDK_NEST_CURRENT_FX_APPROX | SDK `POST /api/v1/me/current-fx/approx` | Nest `CurrentFxApproxUserController` + `approxKrwFromSnapshot` | WIRED | REL-508 |

missing snapshot/amount → null. KRW 0 위조 0. client `Number()*rate` 0.

## 2. 1:1 TABLE (blank cell = FAIL)

| axis | left | right | verdict | owner |
|---|---|---|---|---|
| nest_module_graph | AppModule imports | every `src/**/*.module.ts` reachable | ALIGNED | REL-505 |
| sdk_api_pairs | `@aipo/sdk` live paths | Nest route strings | ALIGNED | REL-505 / REL-508 |
| engine_fsm | fact-state `running,requeue,success,safe_stop` | `trade-execution-state.v1` status | ALIGNED (schema superset + cancelled/failed) | 02-engine |
| result_vs_reason | engine `resultCode` SCREAMING | home-money `reasonCode` `domain.resource.reason` | ALIGNED (two fields, not aliases) | R0 + money |
| money_units | USDT decimal string | home-money-read + trade-execution-state | ALIGNED | money |
| source_asof | home-money-read schema | SDK + Nest mapper | ALIGNED | money |
| idempotency | SDK participate/withdraw keys | Nest participate + wallet withdraw | ALIGNED | money |
| auth_permission | Nest `JwtAuthGuard` | `supabase.auth` 0 in api-nest | ALIGNED | REL-405 |
| rls | REL-408 80/80 ON | `SECURITY_BASELINE.md` | ALIGNED | REL-408 |
| indexes | applied migration `CREATE INDEX` | file-only indexes 0 | ALIGNED (REL-701-DB 2026-09-04 · unapplied 0) | REL-408 / REL-701-DB |
| migration_head | local `20260916033100` | remote applied `20260905110000` | DIVERGED (`20260916033000` · `20260916033100` committedUnapplied · this slice apply 0 · REL-701-DB 실행 이력 유지) | REL-701-DB |
| p0_p3_engine | REL-502 `FINAL_ACCEPTANCE` | DEFECTS_P0/P1 = 0 | ALIGNED (current epoch ISSUED) | REL-502 |
| p0_p3_admin | REL-409 R6 cert | KNOWN_P0~P3 = 0 | ALIGNED | REL-409 |
| ui_truth_home_money | home-money-read contract | Engine todayPossible 0 · fake zero 0 | ALIGNED | money / UI |
| route_contract_100 | R0 matrix (historical missing_fact) | 100% close | DEFERRED not aligned | REL-506 |
| execution_sse | SDK Phase1 SSE comment | Phase0 `POST execute-tick` live | DEFERRED Phase1 | engine Phase1 |
| protected_scope | live hash | baseline | DRIFT 14 · live `77e54a036c46db905040d6254fe8838bac1690e71d2cd3e5eeb8eca5e22a72a3` · ISSUED STALE watch | REL-502 |

## 3. VERIFY

| command | result |
|---|---|
| `pnpm verify:backend-data-alignment` | live table · current-fx wired · Engine rebase state mirrored fail-closed |
| `pnpm verify:rel-505-r7-backend-alignment` | this document |
| `pnpm verify:rel-508-current-fx-approx` | Nest wire |

## EXIT_GATE

- CERT_ISSUED=1 requires STALE_PENDING_REBASE=0 and current-epoch REL-502 ISSUED → otherwise FAIL
- current-fx 를 다시 각주로 숨기면 FAIL
- `apply_migration` FAIL
