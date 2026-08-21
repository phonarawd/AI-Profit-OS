# REL-112 SettlementDetail

BASE: `rel/REL-111-119-money-loop` after REL-111
DATE: 2026-08-21
STATUS: PRODUCTION_READY_CANDIDATE (Founder visual approval pending)
FIGMA: no §2 frame — node-id not invented

## Route

- ONE ROUTE: `/trades/[id]/settlement`
- Presentation: `SettlementClient` + `settlement.module.css`

## Data truth

- Trade owner = `GET /api/v1/trades/:id` via `fetchTrade`
- Journal owner = REL-015 `GET /api/v1/me/ledger/journals` + `/:journalId`
- Match by server `referenceId === tradeId`
- No client sum / recalc
- 401 unauthorized · 403 forbidden · 404 missing · 5xx unavailable
- missing money → `확인할 수 없음`

## Verify

- `verify:settlement-detail`
- Playwright `settlement-closure.spec.cjs`

## Protected

- no engine-rust / migration / Nest mutation
- Home freeze 0
