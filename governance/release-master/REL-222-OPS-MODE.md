# REL-222 — 3-mode Admin Ops

STATUS: PASS
DATE: 2026-08-22

## Implemented

- LIVE / DRY_RUN / SIMULATION 서버 상태
- LIVE는 confirm 필수
- Preview-As-User: 유저 JWT 발급 0
- Impact preview→confirm→apply→rollback, ledgerWrite=false

## Verify

- `pnpm verify:rel-222-admin-ops-mode`

## Negative

- FAKE_OPS_MODE = 0
- SIMULATION ledger write = 0
