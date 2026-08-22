# REL-213 — /admin/system-control

STATUS: PASS
DATE: 2026-08-22
OWNER: existing `PushKillService` + `PlatformReserveAdminService` + `MoneyCircuitService` (read)
RUNTIME_QA: NOT_RUN

## Implemented

- circuit tab: push GET/PUT with preview→confirm
- money circuit read-only + `/admin/risk` link
- REL-406 catalog GET → honest unavailable when missing
- reserve tab: real GET/PUT/audit. `isSet=false`면 목표 0 위조 없음

## Verify

- `pnpm verify:rel-213-admin-system-control`
- EXIT_GATE: user JWT 200 = 0

## Negative

- USER_JWT_ADMIN_200 = 0
- FAKE_SYSTEM_STATE = 0
- CLIENT_ONLY_CONTROL_AUTHORITY = 0
- SECOND_MONEY_OWNER_CREATED = 0
