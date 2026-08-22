# REL-211 — /admin/adapters

STATUS: PASS
DATE: 2026-08-22
OWNER: existing `AdaptersAdminController` + `AdaptersAdminService`

## Implemented

- `apps/admin/app/admin/adapters/page.tsx` wires `GET /api/v1/admin/adapters`
- listing-legs + identity-review-queue from the same owner
- KPI rates use `readObservedRate` (attempts=0 → 확인할 수 없음)
- yahoo0 lock kept · Yahoo runtime activate 0 · secrets 0
- no UI `recordMatchAttempts` (KPI 위조 0)

## Verify

- `pnpm verify:rel-211-admin-adapters`
- EXIT_GATE: user JWT 200 = 0 (`AdminGuard` + `admin-guard.selftest` user JWT → 401)

## Negative

- FAKE_ADAPTER_TRUTH = 0
- SECRET_EXPOSURE_CREATED = 0
- USER_JWT_ADMIN_200 = 0
