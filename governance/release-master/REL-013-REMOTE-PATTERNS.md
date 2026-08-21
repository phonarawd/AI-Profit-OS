# REL-013 REMOTE PATTERNS EVIDENCE

```text
REL = REL-013
TITLE = apps/web next.config.ts images.remotePatterns 확인/수정
STATUS = COMPLETED
PLAN_LOCKED = TRUE
MASTER_STATUS_UPDATED = TRUE
LAST_COMPLETED_TODO = REL-013
FIRST_EXECUTION_TODO = REL-014
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
| GitHub `gate.yml` | SUCCESS `32398523305` |

## ACCEPTANCE

remotePatterns가 최소 allowlist. 임의 https 전체 허용 0.

## Git

```text
REMOTE_MAIN_BEFORE = 4abd51cb2166ddbadb14fa8c43aba8f6576c45e1
BRANCH = rel/REL-013-remote-patterns
HEAD_SHA = 1907732
PR = https://github.com/phonarawd/AI-Profit-OS/pull/12
CI_RUN = https://github.com/phonarawd/AI-Profit-OS/actions/runs/32398523305
MERGE_METHOD = merge
MERGE_COMMIT = 2ab2b717f279c029b451fe7fa9009d98236ab729
REMOTE_MAIN_AFTER = 2ab2b717f279c029b451fe7fa9009d98236ab729
ADMIN_BYPASS_USED = 0
FORCE_PUSH_USAGE = 0
GIT_ADD_A_USAGE = 0
SECRET_CONTENT_READ_COUNT = 0
SECRET_RISK_STAGED = 0
PRODUCTION_DB_MUTATION = 0
PRODUCTION_DEPLOY = 0
```
