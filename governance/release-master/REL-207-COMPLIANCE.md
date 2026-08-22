# REL-207 — /admin/compliance

STATUS: PASS
DATE: 2026-08-22
OWNER: existing `KycAdminController` + `KycService` (Money §42)

## Implemented

- `apps/admin/app/admin/compliance/page.tsx` wires `GET /api/v1/admin/compliance/kyc`
- approve/reject POST with Admin bearer + idempotency; reject reason min 10
- signed doc URL on demand; R2 keys not rendered
- loading / unauthorized / unavailable / honest empty
- no invented KYC approved state

## Verify

- `pnpm verify:rel-207-admin-compliance`
- EXIT_GATE: user JWT 200 = 0 (`AdminGuard` + `admin-guard.selftest` user JWT → 401)

## Negative

- FAKE_COMPLIANCE_TRUTH = 0
- USER_JWT_ADMIN_200 = 0
- SECOND_MONEY_OWNER_CREATED = 0
