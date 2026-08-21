# REL-115 KrwDeposit (`/wallet/deposit?tab=krw`)

BASE: `rel/REL-111-119-money-loop` from `origin/main` `da2cca0`
DATE: 2026-08-21
STATUS: PRODUCTION_READY_CANDIDATE (Founder visual approval pending)
FIGMA: no §2 frame — node-id not invented

## Route

- ONE ROUTE: `/wallet/deposit` (`?tab=krw`)
- Presentation: same `DepositClient` as REL-114

## Data truth

- Owner = `POST /api/v1/wallet/krw-deposit-requests`
- Success = server `status === "pending"` only
- pending ≠ credit · PG사 0
- 401 = unauthorized · 403 = denied · 5xx = unavailable

## Figma

- Registry `frameKeys: []` for REL-115
- Not declared Approved / Locked

## Verify

- `verify:krw-deposit-closure`

## Screenshots

`governance/release-master/rel-115-krw-deposit/`

## Protected

- HomeDesktop/HomeMobile not modified
- no engine-rust / migration / api-nest mutation
