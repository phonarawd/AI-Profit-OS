# REL-212 — /admin/support

STATUS: PASS
DATE: 2026-08-22
OWNER: existing `DepositDisputeAdminController` + `OpsInboxAdminController`

## Implemented

- `apps/admin/app/admin/support/page.tsx` `?tab=queue` wires `GET /api/v1/admin/wallet/deposit-disputes`
- credit/reject reuse wallet owner + idempotency + reason min 10
- ops-messages list/send for a known user only (no global fake inbox)
- user jump reuses `/admin/users/:id`
- loading / unauthorized / unavailable / honest empty
- no invented ticket/priority/SLA/live chat

## Verify

- `pnpm verify:rel-212-admin-support`
- EXIT_GATE: user JWT 200 = 0 (`AdminGuard` + `admin-guard.selftest` user JWT → 401)

## Negative

- FAKE_SUPPORT_TRUTH = 0
- SECOND_MONEY_OWNER_CREATED = 0
- BALANCE_UPDATE_OWNER_CREATED = 0
- USER_JWT_ADMIN_200 = 0
