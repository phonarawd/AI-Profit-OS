# REL-216 — /admin/reports/financial

STATUS: PASS
DATE: 2026-08-22
OWNER: existing `LedgerAdminController.financialReport` + `LedgerAdminService.financialReport`

## Implemented

- `apps/admin/app/admin/reports/financial/page.tsx` wires `GET /api/v1/admin/reports/financial`
- period buckets display server strings only (deposit/withdraw/admin adjust/settled profit/fee/journalCount)
- `expectedProfitUsdt` stays 확인할 수 없음 (this owner does not emit expected)
- `settledProfitUsdt` ≠ expected · missing ≠ 0 · client sum 0
- loading / unauthorized / unavailable / honest empty

## Verify

- `pnpm verify:rel-216-admin-financial-report`
- EXIT_GATE: user JWT 200 = 0 (`AdminGuard` + `admin-guard.selftest` user JWT → 401)

## Negative

- FAKE_FINANCIAL_TRUTH = 0
- SECOND_FINANCIAL_REPORT_TRUTH_OWNER = 0
- SECOND_LEDGER_OWNER_CREATED = 0
- USER_JWT_ADMIN_200 = 0
- RUNTIME_QA = NOT_RUN
