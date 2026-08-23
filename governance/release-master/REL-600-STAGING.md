# REL-600 STAGING DEPLOY

```text
REL = REL-600
TITLE = Staging 배포
STATUS = COMPLETED
PLAN_LOCKED = TRUE
PROTECTED_SCOPE_MUTATION = FALSE
PRODUCTION_DOMAIN_UNCHANGED = 1
PRODUCTION_WORKFLOW_DISPATCH = 0
PAGES_DEPLOY = 0
VERCEL = 0
SECRET_HARDCODED = 0
WINDOWS_LOCAL_OPENNEXT = BLOCKED_LOCAL_ENVIRONMENT
STAGING_OBS_SAMPLE = 1
WRANGLER_TAIL_CAPTURE = 0
```

## ORIGIN

staging web = https://ai-profit-web-preview.ebay-adapter.workers.dev
staging ops = https://ai-profit-ops-preview.ebay-adapter.workers.dev
wrangler env = preview
deploy command = `pnpm cf:deploy:staging`
dedicated workflow = `.github/workflows/deploy-staging.yml` (dispatch after merge to default)

production web = https://ai-profit-web.ebay-adapter.workers.dev
production app = https://app.hiptk.app
production ops origin = https://ai-profit-ops.ebay-adapter.workers.dev
production ops host = https://ops.hiptk.app

## DEPLOY LOG

Windows local `opennextjs-cloudflare build` = BLOCKED_LOCAL_ENVIRONMENT
(T2 `verify:opennext-build` already SKIP on win32 · typecheck/prerender fail).

Linux CI used existing `deploy-cloudflare.yml` with `target=preview` only.
`target=production` = 0. Production GitHub environment secrets were reused for the token;
the worker names and custom domains were not the production slot.

| surface | run | version | smoke |
|---|---|---|---|
| web preview | https://github.com/phonarawd/AI-Profit-OS/actions/runs/32658478446 | a85bfa7b-639a-4ad1-b1f3-1ca5f35fb40f | live 200 x-opennext=1 (first smoke 404 then ready) |
| ops preview | https://github.com/phonarawd/AI-Profit-OS/actions/runs/32658798096 | 81d9b6a2-c5ef-42da-b2e2-46e7af2d4b10 | CI PASS 307 x-opennext=1 |

phase0 `push-dispatcher` preview was also uploaded by the first `surface=all` run.
Bridge/proxy workers with `app.hiptk.app` custom domains were not in that phase0 list.

## LIVE AFTER DEPLOY

| url | status | x-opennext |
|---|---|---|
| https://ai-profit-web-preview.ebay-adapter.workers.dev/ | 200 | 1 |
| https://ai-profit-ops-preview.ebay-adapter.workers.dev/ | 307 | 1 |
| https://ai-profit-web.ebay-adapter.workers.dev/ | 200 | 1 |
| https://ai-profit-ops.ebay-adapter.workers.dev/ | 307 | 1 |
| https://app.hiptk.app/ | 200 | 1 |
| https://ops.hiptk.app/ | 307 | 1 |

## OBS SAMPLE

One GET to staging web returned `200` + `x-opennext=1`.
That is a Worker execution on the REL-016 Cloudflare console sink path.
`wrangler tail` was not captured on this Windows session.

## EXIT_GATE

credential guess/hardcode = 0
pages deploy = 0
production custom domain deploy = 0
production workflow target=production = 0
