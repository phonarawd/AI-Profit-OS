# REL-407 PRICE OVERRIDE ENGINE EVIDENCE

```text
REL = REL-407
TITLE = Price Override Engine (4레이어)
STATUS = COMPLETED
PLAN_LOCKED = TRUE
PROTECTED_SCOPE_MUTATION = TRUE
LOCKED_LAYERS = 4
INVENTED_LAYERS = 0
SERVER_ENFORCE = 1
PRODUCTION_DB_APPLY = 0
HOME_GEOMETRY_DIFF = 0
```

## IMPLEMENTATION

- 4레이어 상수: `schemas/price-override-layers.v1.json` + `price-override.core.cjs`
- SOURCE = listings 읽기 전용. OVERRIDE = 전용 테이블 + `useAdminOverride`
- EFFECTIVE = 기존 `computeOpportunityPricing` (공식 재발명 0)
- USER_VISIBLE = EFFECTIVE only · 유저 detail `pricing` 에서 SOURCE/OVERRIDE 키 strip
- override write: reason ≥ 10 + frozen reason code + audit `applied` (금액 키 0)
- migration file-only: `20260823180000_opportunity_price_overrides.sql` (REL-701-DB apply)

## VERIFY

| command | result |
|---|---|
| `node tooling/verify/rel-407-price-override.cjs` | PASS (4 layers · mix 0 · reason/audit · user reads EFFECTIVE) |

## ACCEPTANCE

가격 오너 4단 유지. 유저 화면이 observed 를 임의 표시하지 않음.

## EXIT_GATE

유저 화면이 SOURCE를 꾸미면 FAIL — `projectUserVisible` + user service 배선이 있다.
