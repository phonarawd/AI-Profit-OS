# REL-013 REMOTE PATTERNS EVIDENCE

```text
REL = REL-013
TITLE = apps/web next.config.ts images.remotePatterns 확인/수정
STATUS = COMPLETED
PLAN_LOCKED = TRUE
PROTECTED_SCOPE_MUTATION = FALSE
HTTPS_ALLOW_ALL = 0
HOME_VISUAL_REOPEN = 0
```

## Used hosts (code-collected)

- `i.ebayimg.com` — ebay identity / catalog seed
- `images.pokemontcg.io` — trading card seed
- `images.ygoprodeck.com` — ygo seed
- `asset-images.r2.dev` — watch/bag seed
- `**.r2.cloudflarestorage.com` — `asset-image-r2.service.ts` constructed URL only

No extra wildcard. Opportunity card/room uses `ProductImage` + this allowlist.

## Changed paths

- `packages/ui/components/product/image-hosts.ts` — USED_HOSTS + wildcard lock
- `apps/web/next.config.ts` — REL-013 comment, shared list only
- `tooling/verify/web-remote-patterns.cjs`
- `tooling/verify/domain-by-path.cjs`
- `tooling/verify/CATALOG.md`
- `package.json`

## VERIFY

| command | result |
|---|---|
| `node tooling/verify/web-remote-patterns.cjs` | PASS |
| `node tooling/verify/product-image.cjs` | PASS |
| `CI=true pnpm verify:gate:fast` | PASS (10 steps) |

## ACCEPTANCE

remotePatterns가 최소 allowlist. 임의 https 전체 허용 0.
