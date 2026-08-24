# Market Partner logos (§38.10.3 · ADR-011)

**Blocking sub-deliverable:** `market-partner-logo-svgs` · **status = blocked**

The seven partner identities remain tracked, but the current SVG marks are not approved for runtime display. Until verified official originals are supplied, UI surfaces must render partner names instead of these image marks.

| file | status |
|------|--------|
| `ebay.svg` | **blocked** |
| `amazon.svg` | **blocked** |
| `yahoo-jp.svg` | **blocked** |
| `pokemontcg.svg` | **blocked** |
| `ygoprodeck.svg` | **blocked** |
| `coingecko.svg` | **blocked** |
| `frankfurter.svg` | **blocked** |

## Rules

- SSOT list = `manifest.json` (must stay in sync with `schemas/market-partner.registry.json` `logoAsset`)
- Render image marks only when `status=ready` and the verified file is on disk
- `status=blocked` means the partner name remains visible but the SVG mark must not render
- Do not infer, redraw, recolor, or recreate a trademark mark to clear this blocker
- CDN hotlink **0** · Brand Kit path only after verified original intake
- `yahoo_jp` adapter Day-1 auto-publish = 0 does **not** mean partner label OFF (표기 유지)

## Acceptance

1. Verified official originals are obtained for all seven tracked partners
2. Each accepted logo `status` → `ready` in `manifest.json` (+ `brand/markets.ts` mirror)
3. `blockingSubDeliverable.status` → `unblocked`
4. `pnpm verify:market-partner-trust` PASS with **no BLOCKER** line
5. Optional hard close: `MARKET_PARTNER_LOGOS_REQUIRE_READY=1 pnpm verify:market-partner-trust`
