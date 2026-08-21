# REL-118 TransactionHistory (`/wallet/history`)

BASE: `rel/REL-111-119-money-loop` from `origin/main` `da2cca0`
DATE: 2026-08-21
STATUS: PRODUCTION_READY_CANDIDATE (Founder visual approval pending)
FIGMA: no §2 frame — node-id not invented

## Route

- ONE ROUTE: `/wallet/history`
- Owner = REL-015 `GET /api/v1/me/ledger/journals`

## Data truth

- mock array 0
- empty ≠ 401 ≠ unavailable
- no client sum

## Verify

- `verify:transaction-history-closure`

## Screenshots

`governance/release-master/rel-118-history/`
