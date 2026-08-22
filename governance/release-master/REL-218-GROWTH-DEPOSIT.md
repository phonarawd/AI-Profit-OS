# REL-218 — /admin/growth/deposit

STATUS: PASS
DATE: 2026-08-22
OWNER: existing `KrwDepositAdminController` + `LedgerAdminController.financialReport`

## Implemented

- legacy route redirects to `/admin/growth?tab=deposit` (이중 IA 금지)
- pending / approved / rejected fetched separately
- only `approved` is labeled success · pending/rejected ≠ success
- ledger `depositUsdt` displayed per period · no conversion rate invented
- approve/reject remain on `/admin/wallet?tab=krw-pending`

## Verify

- `pnpm verify:rel-218-admin-growth-deposit`
- EXIT_GATE: user JWT 200 = 0

## Negative

- FAKE_DEPOSIT_GROWTH_TRUTH = 0
- BALANCE_UPDATE_OWNER_CREATED = 0
- USER_JWT_ADMIN_200 = 0
- RUNTIME_QA = NOT_RUN
