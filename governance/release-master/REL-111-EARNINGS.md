# REL-111 Earnings (`/trades` embed)

BASE: `rel/REL-111-119-money-loop` from `origin/main` `da2cca0`
DATE: 2026-08-21
STATUS: PRODUCTION_READY_CANDIDATE (Founder visual approval pending)
FIGMA: no §2 frame — node-id not invented

## Route

- ONE ROUTE: `/trades` earnings embed (not a new product route)
- Presentation: `EarningsEmbed` + existing `trades.module.css`

## Data truth

- Owner = `GET /api/v1/wallet/buckets` → `profitUsdt`
- Client sum of `settledProfitUsdt` = 0
- KRW omitted (no FX owner on this embed)
- missing / 5xx → `확인할 수 없음`
- mismatch proof: wallet `4.00` + settled row `12.50` → embed shows `4.00 USDT`

## Figma

- Registry `frameKeys: []` for REL-111
- Not declared Approved / Locked

## Verify

- `verify:earnings-embed`
- `verify:trades-web-wire`
- `verify:trades-live-wire`

## Screenshots

`governance/release-master/rel-111-earnings/`

## Protected

- HomeDesktop/HomeMobile not modified
- no engine-rust / migration / api-nest mutation
