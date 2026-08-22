# REL-219 — /admin/growth/ticker

STATUS: PASS
DATE: 2026-08-22
OWNER: existing `growth_ticker_config` via `GrowthPublicService` + `GrowthTickerAdminController`

## Implemented

- legacy route redirects to `/admin/growth?tab=ticker`
- GET/PATCH `/api/v1/admin/growth/ticker` on the same table as public-surface
- no second ticker engine · no invented performance/trending
- publicSurface.ledgerTotal remains settlement.completed only

## Verify

- `pnpm verify:rel-219-admin-growth-ticker`
- `pnpm verify:growth-public-surface`
- EXIT_GATE: user JWT 200 = 0

## Negative

- FAKE_TICKER_TRUTH = 0
- SECOND_GROWTH_OWNER_CREATED = 0
- USER_JWT_ADMIN_200 = 0
- RUNTIME_QA = NOT_RUN
