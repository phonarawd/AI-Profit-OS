# R7 BACKEND / DATA ALIGNMENT (REL-505)

```text
REL = REL-505
TITLE = BACKEND_DATA_ALIGNMENT_CERTIFICATION
STATUS = COMPLETED
CERT_ISSUED = 0
PLAN_LOCKED = TRUE
PROTECTED_SCOPE_MUTATION = FALSE
OPEN_CONFLICT = 0
STALE_PENDING_REBASE = 1
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
`services/api-nest` + `schemas` protected-scope 변경은 REL-502 formal rebase(`ea-rebase-ec3c9604d2ab-5ac0f4291966`)에 포함되어 current baseline으로 재고정된 바 있었다.

**D1-S1E 정정 (2026-09-05):** 그 baseline 고정 이후 같은 D1 audit lineage의 commit `a1d5c151`
(CodeQL js/regex/missing-regexp-anchor 51/52 수정 — `services/api-nest/clock.core.cjs`)가
`services/api-nest` protected-scope root를 다시 변경해 live aggregate가 baseline과 달라졌다
(`governance/engine-acceptance/FINAL_ACCEPTANCE.md` 참조). 그 결과 REL-502는 현재
`STATUS=NOT_ISSUED · CERT_ISSUED=0`이며 이 문서의 `CERT_ISSUED`/`STALE_PENDING_REBASE`도
그 사실을 그대로 따른다. predecessor 인증을 current로 세탁하지 않는다 — 위 rebase 자체의
history는 지우지 않고, 그 rebase가 더 이상 live 상태를 대표하지 않는다는 사실만 추가한다.

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
| migration_head | local `20260902155632` | remote applied `20260902155632` | ALIGNED (REL-701-DB executed 2026-09-04 02:34 UTC · `--include-all` · remote raw 43 → 55 · unapplied 12 → 0 · alias 5 intact · head unchanged) | REL-701-DB |
| p0_p3_engine | REL-502 `FINAL_ACCEPTANCE` | DEFECTS_P0/P1 = 0 | STALE_PENDING_REBASE (D1-S1E: services/api-nest/clock.core.cjs drift, NOT_ISSUED) | REL-502 |
| p0_p3_admin | REL-409 R6 cert | KNOWN_P0~P3 = 0 | ALIGNED | REL-409 |
| ui_truth_home_money | home-money-read contract | Engine todayPossible 0 · fake zero 0 | ALIGNED | money / UI |
| route_contract_100 | R0 matrix (historical missing_fact) | 100% close | DEFERRED not aligned | REL-506 |
| execution_sse | SDK Phase1 SSE comment | Phase0 `POST execute-tick` live | DEFERRED Phase1 | engine Phase1 |
| protected_scope | live hash | baseline | STALE_PENDING_REBASE · aggregate MISMATCH (1 path: services/api-nest/clock.core.cjs) | REL-502 |

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
