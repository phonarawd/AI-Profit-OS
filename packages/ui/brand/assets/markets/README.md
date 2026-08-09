# Market Partner logos (§38.10.3 · ADR-011)

**Blocking sub-deliverable:** `market-partner-logo-svgs` · **status = unblocked**

| file | status |
|------|--------|
| `ebay.svg` | **ready** |
| `amazon.svg` | **ready** |
| `yahoo-jp.svg` | **ready** |
| `pokemontcg.svg` | **ready** |
| `ygoprodeck.svg` | **ready** |
| `coingecko.svg` | **ready** |
| `frankfurter.svg` | **ready** |

## Rules

- SSOT list = `manifest.json` (must stay in sync with `schemas/market-partner.registry.json` `logoAsset`)
- Render only `status=ready` + file on disk
- Lux Dark = official **monochrome/light** variant only (`#F2F4F8`) · arbitrary recolor **forbidden**
- CDN hotlink **0** · Brand Kit path only
- `yahoo_jp` adapter Day-1 auto-publish = 0 does **not** mean label/logo OFF (표기 필수)

## Acceptance

1. Seven SVGs on disk under this folder
2. Each logo `status` → `ready` in `manifest.json` (+ `brand/markets.ts` mirror)
3. `blockingSubDeliverable.status` → `unblocked`
4. `pnpm verify:market-partner-trust` PASS with **no BLOCKER** line
5. Optional hard close: `MARKET_PARTNER_LOGOS_REQUIRE_READY=1 pnpm verify:market-partner-trust`
