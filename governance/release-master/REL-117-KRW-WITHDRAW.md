# REL-117 KrwWithdraw (`/wallet/withdraw/krw`)

BASE: `rel/REL-111-119-money-loop` from `origin/main` `da2cca0`
DATE: 2026-08-21
STATUS: PRODUCTION_READY_CANDIDATE (Founder visual approval pending)
FIGMA: no §2 frame — node-id not invented

## Route

- ONE ROUTE: `/wallet/withdraw/krw`
- Presentation: same `WithdrawLiveForm` as REL-116

## Data truth

- Owner = `POST /api/v1/wallet/withdraw` `asset=KRW`
- PG사 0
- Success = accepted request · credit 0

## Verify

- `verify:krw-withdraw-closure`

## Screenshots

`governance/release-master/rel-117-krw-withdraw/`
