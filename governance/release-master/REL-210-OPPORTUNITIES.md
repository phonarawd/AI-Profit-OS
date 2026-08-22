# REL-210 — /admin/opportunities

STATUS: PASS
DATE: 2026-08-22
OWNER: existing `OpportunitiesAdminController` + `OpportunitiesAdminService` (`public.opportunities`)

## Implemented

- `apps/admin/app/admin/opportunities/page.tsx` wires `GET /api/v1/admin/opportunities`
- assets tab wires `GET /api/v1/admin/opportunities/assets`
- PATCH `.../:id/pricing` with Admin bearer + expectedPricingVersion (server compute)
- loading / unauthorized / unavailable / honest empty
- missing profit/capital stay 확인할 수 없음 (0 위조 0)
- no second opportunity table/API

## Verify

- `pnpm verify:rel-210-admin-opportunities`
- `pnpm verify:capital-tier-catalog`
- EXIT_GATE: user JWT 200 = 0 (`AdminGuard` + `admin-guard.selftest` user JWT → 401)

## Negative

- FAKE_OPPORTUNITY_TRUTH = 0
- SECOND_OPPORTUNITY_OWNER_CREATED = 0
- USER_JWT_ADMIN_200 = 0
