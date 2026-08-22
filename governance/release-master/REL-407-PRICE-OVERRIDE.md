# REL-407 — Price Override Engine (4레이어)

STATUS: PASS
DATE: 2026-08-22

OWNER: existing `OpportunitiesAdminService` + `price-layers.ts`

## Layers

SOURCE_OBSERVED → OVERRIDE → EFFECTIVE → USER_VISIBLE

## Verify

- `pnpm verify:rel-407-price-override`

## Negative

- SECOND_PRICING_OWNER_CREATED = 0
- FAKE_PRICE_OVERRIDE = 0
- missing price = 0 금지
