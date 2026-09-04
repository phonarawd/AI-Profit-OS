# REL-508 CURRENT FX APPROX NEST WIRE

```text
REL = REL-508
TITLE = CURRENT_FX_APPROX_NEST_WIRE
STATUS = COMPLETED
PLAN_LOCKED = TRUE
PROTECTED_SCOPE_MUTATION = TRUE
CERT_ISSUED = 1
STALE_PENDING_REBASE = 0
REBASE_OWNER = REL-502
APPLY_MIGRATION = 0
CLIENT_FX_MATH = 0
FABRICATE_KRW_ZERO = 0
PROJECT_REF = mgsytcetsiecllmhcyox
```

SDK `POST /api/v1/me/current-fx/approx` 에 Nest handler 를 연다.
공식 = 기존 `approxKrwFromSnapshot` + latest `fx_snapshots.usd_krw`.
snapshot/amount 없으면 해당 KRW 필드 null. 0 으로 채우지 않는다.

## FILES

- `services/api-nest/src/opportunities/current-fx-approx.user.routes.ts`
- `services/api-nest/src/opportunities/current-fx-approx.user.controller.ts`
- `services/api-nest/src/opportunities/current-fx-approx.service.ts`
- `services/api-nest/src/opportunities/current-fx-approx.map.ts`
- `services/api-nest/src/opportunities/fx-snapshot.service.ts` (`getLatestKrwDisplaySnapshot`)
- `schemas/current-fx-approx.v1.json`

## EXIT_GATE

- client `Number()*rate` FAIL
- missing → `"0"` FAIL
- ISSUED 를 STALE 인 채 유지 FAIL — rebase 는 REL-502
