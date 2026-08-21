# REL-119 TransactionDetail (`/wallet/history/[journalId]`)

BASE: `rel/REL-111-119-money-loop` from `origin/main` `da2cca0`
DATE: 2026-08-21
STATUS: PRODUCTION_READY_CANDIDATE (Founder visual approval pending)
FIGMA: no §2 frame — node-id not invented

## Route

- ONE ROUTE: `/wallet/history/[journalId]`
- Owner = REL-015 `GET /api/v1/me/ledger/journals/:id`

## Data truth

- own slip only
- 403 = `다른 분의 내역은 볼 수 없어요.`
- field recalc 0

## Verify

- `verify:transaction-detail-closure`

## Screenshots

`governance/release-master/rel-119-history-detail/`
