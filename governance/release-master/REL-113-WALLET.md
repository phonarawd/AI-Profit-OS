# REL-113 Wallet (`/wallet`)

BASE: `rel/REL-111-119-money-loop` after REL-112
DATE: 2026-08-21
STATUS: PRODUCTION_READY_CANDIDATE (Founder visual approval pending)
FIGMA: no §2 frame — cux-007 not in registry — node-id not invented

## Route

- ONE ROUTE: `/wallet`
- Presentation: `WalletClient` + `wallet.module.css`
- leftover 5-tab `LegacyAppShell` removed from wallet layout

## Data truth

- Owner = `GET /api/v1/wallet/buckets` via `fetchWalletBuckets`
- Client bucket sum is not authority
- 401 → unauthorized (not zero buckets)
- 5xx → unavailable (`확인할 수 없음`)
- real ledger `0` still displays after a successful fetch
- SafeStop invented count removed
- deposit/withdraw/history deep links kept

## Verify

- `verify:wallet-live-wire`
- `verify:wallet-closure`

## Protected

- no Nest / engine / migration mutation
- Home freeze 0
