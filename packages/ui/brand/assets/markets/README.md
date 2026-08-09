# Market Partner logos (§38.10.3 · ADR-011)

**Blocking sub-deliverable:** `market-partner-logo-svgs`

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
- Render only `status=ready` + file on disk
- Lux Dark = official **monochrome/light** variant only · arbitrary recolor **forbidden**
- Do **not** invent trademark marks · wait for Brand/Design official assets
- `yahoo_jp` adapter Day-1 auto-publish = 0 does **not** mean label/logo OFF (표기 필수)

## Unblock checklist

1. Drop the 7 official SVGs into this folder
2. Set each logo `status` → `ready` in `manifest.json`
3. Clear `blockingSubDeliverable.status` → `unblocked` (or remove blocker field)
4. `pnpm verify:market-partner-trust` PASS with no BLOCKER line
