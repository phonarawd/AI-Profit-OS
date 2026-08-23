# Admin Price Override Layers (REL-407)

STATUS: LOCKED
LOCKED_LAYERS = 4
INVENTED_LAYERS = 0
SERVER_ENFORCE = 1
PRODUCTION_DB_APPLY = 0
HOME_GEOMETRY_DIFF = 0

관측가와 노출가를 섞지 않는다.

| layer | owner | user screen |
|---|---|---|
| `SOURCE_OBSERVED` | `public.listings` 읽기 | 0 |
| `OVERRIDE` | `opportunity_price_overrides` + audit + reason code | 0 |
| `EFFECTIVE` | `computeOpportunityPricing` | 읽기 전용 원천 |
| `USER_VISIBLE` | EFFECTIVE projection | 1 |

## EXIT_GATE

유저 화면이 SOURCE를 임의 표시하면 FAIL. `projectUserVisible` 결과에
`nativeAmount` / `adminBuyUsdt` / `useAdminOverride` 가 있으면 FAIL.

## Rules

- 5번째 레이어 창작 금지
- listings in-place overwrite 금지
- override write = reason ≥ 10 + frozen reason code + audit `applied`
- 원장 credit/debit 0
- production apply = REL-701-DB
