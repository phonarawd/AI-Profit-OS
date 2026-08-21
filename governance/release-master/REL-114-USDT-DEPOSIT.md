# REL-114 UsdtDeposit (`/wallet/deposit`)

BASE: `rel/REL-111-119-money-loop` from `origin/main` `da2cca0`
DATE: 2026-08-21
STATUS: PRODUCTION_READY_CANDIDATE (Founder visual approval pending)
FIGMA: no §2 frame — node-id not invented

## Route

- ONE ROUTE: `/wallet/deposit` (`?tab=usdt`)
- Presentation: `DepositClient` + `wallet.module.css`

## Data truth

- Owner = `GET /api/v1/wallet/my-deposit-address` → `trc20Address`
- Continue never credits (`data-credited="false"`)
- 401 = unauthorized · 403 = denied · 5xx = unavailable
- missing address ≠ invented address
- client bucket mutation = 0

## Figma

- Registry `frameKeys: []` for REL-114
- Not declared Approved / Locked

## Verify

- `verify:usdt-deposit-closure`
- `verify:stub-page-actions`

## Screenshots

`governance/release-master/rel-114-usdt-deposit/`

## Protected

- HomeDesktop/HomeMobile not modified
- no engine-rust / migration / api-nest mutation
