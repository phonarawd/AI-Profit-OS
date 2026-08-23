# R7 BACKEND / DATA ALIGNMENT (REL-505)

```text
REL = REL-505
TITLE = BACKEND_DATA_ALIGNMENT_CERTIFICATION
STATUS = BLOCKED_OPEN_CONFLICT
CERT_ISSUED = 0
PLAN_LOCKED = TRUE
PROTECTED_SCOPE_MUTATION = FALSE
OPEN_CONFLICT = SDK_NEST_CURRENT_FX_APPROX
OPEN_CONFLICT_OWNER = REL-508
CONCEALMENT = 0
ALL_ALIGNED = 0
KNOWN_P0 = 0
KNOWN_P1 = 0
KNOWN_P2 = 0
KNOWN_P3 = 0
ADDITIVE_REL = REL-508
CONTRACT_VERSION = 1.0.0
APPLY_MIGRATION = 0
PROJECT_REF = mgsytcetsiecllmhcyox
```

이 문서는 대조 결과다. CERT_ISSUED=1 이 아니다. 열린 충돌을 각주로 숨기지 않는다.

## 1. OPEN CONFLICT (not a footnote)

| id | left | right | verdict | owner |
|---|---|---|---|---|
| SDK_NEST_CURRENT_FX_APPROX | SDK `POST /api/v1/me/current-fx/approx` · Home/Profits/Room `.catch(() => null)` | Nest controller / route **absent** | CONFLICT | REL-508 |

UI 는 실패 시 null 로 받는다 (KRW missing → 0 금지). 그 실패폐쇄를 1:1 정렬로 쓰지 않는다.

REL-508 은 Nest 배선을 연다. `services/api-nest` + `schemas` 는 protected-scope root 이므로 REL-508 은 `PROTECTED_SCOPE_MUTATION=true` 이고 ISSUED 인증은 STALE → REL-502 rebase 가 뒤따른다. 이 슬라이스에서 그 mutation 을 하지 않는다.

## 2. 1:1 TABLE (blank cell = FAIL)

| axis | left | right | verdict | owner |
|---|---|---|---|---|
| nest_module_graph | AppModule imports | every `src/**/*.module.ts` reachable | ALIGNED | REL-505 |
| sdk_api_pairs | `@aipo/sdk` live paths | Nest route strings | ALIGNED except current-fx | REL-505 / REL-508 |
| engine_fsm | fact-state `running,requeue,success,safe_stop` | `trade-execution-state.v1` status | ALIGNED (schema superset + cancelled/failed) | 02-engine |
| result_vs_reason | engine `resultCode` SCREAMING | home-money `reasonCode` `domain.resource.reason` | ALIGNED (two fields, not aliases) | R0 + money |
| money_units | USDT decimal string | home-money-read + trade-execution-state | ALIGNED | money |
| source_asof | home-money-read schema | SDK + Nest mapper | ALIGNED | money |
| idempotency | SDK participate/withdraw keys | Nest participate + wallet withdraw | ALIGNED | money |
| auth_permission | Nest `JwtAuthGuard` | `supabase.auth` 0 in api-nest | ALIGNED | REL-405 |
| rls | REL-408 80/80 ON | `SECURITY_BASELINE.md` | ALIGNED | REL-408 |
| indexes | applied migration `CREATE INDEX` | unapplied file-only indexes | MEASURED · unapplied owner REL-701-DB | REL-408 / REL-701-DB |
| migration_head | local `20260823210000` | remote applied `20260814140000` | DIVERGE deferred | REL-701-DB |
| p0_p3_engine | REL-502 `FINAL_ACCEPTANCE` | DEFECTS_P0/P1 = 0 | ALIGNED | REL-502 |
| p0_p3_admin | REL-409 R6 cert | KNOWN_P0~P3 = 0 | ALIGNED | REL-409 |
| ui_truth_home_money | home-money-read contract | Engine todayPossible 0 · fake zero 0 | ALIGNED | money / UI |
| route_contract_100 | R0 matrix (historical missing_fact) | 100% close | DEFERRED not aligned | REL-506 |
| execution_sse | SDK Phase1 SSE comment | Phase0 `POST execute-tick` live | DEFERRED Phase1 | engine Phase1 |

## 3. VERIFY

| command | result |
|---|---|
| `pnpm verify:backend-data-alignment` | live table + open conflict |
| `pnpm verify:rel-505-r7-backend-alignment` | this document |

## EXIT_GATE

- CERT_ISSUED=1 while OPEN_CONFLICT 가 있으면 FAIL
- 충돌을 각주/ALIGNED 로 바꾸면 FAIL
- 이 슬라이스 `apply_migration` / protected-scope mutation FAIL
