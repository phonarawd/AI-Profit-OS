# REL-110 Matching Result (`/trades`)

BASE: `rel/REL-105-110-core-opportunity-loop` after REL-109 `d9c9184`
DATE: 2026-08-21
STATUS: PRODUCTION_READY_CANDIDATE (Founder visual approval pending)
FIGMA: no §2 frame — node-id not invented

## Route

- ONE ROUTE: `/trades`
- Presentation: `TradesClient` + `trades.module.css`
- Item CTA → `/trades/:tradeId/execute`

## Data truth

- List owner = `GET /api/v1/trades` via `fetchTradeList`
- Nest list = existing `toState` projection, session `user_id`, `LIMIT 50`
- Wallet profit owner = `fetchWalletBuckets.profitUsdt` (not a client sum)
- 401 → unauthorized (not empty)
- 5xx/network → unavailable (not empty)
- `items: []` → empty
- missing wallet profit → `확인할 수 없음` (not 0)
- Settled row requires `success` + `settledProfitUsdt`
- success without settled profit → 「처리 중이에요」
- expected profit is not shown as confirmed

## Figma

- Registry `frameKeys: []` for REL-110
- Visual language aligned to Spark Dash / REL-109 execute
- Not declared Approved / Locked

## Verify

- `verify:trades-web-wire`
- `verify:trades-live-wire` (Playwright)

## Screenshots

`governance/release-master/rel-110-trades/`

## Protected

- HomeDesktop/HomeMobile/spark-dash-home.css not modified
- no engine-rust / migration mutation
- Nest change = read-only list projection only
