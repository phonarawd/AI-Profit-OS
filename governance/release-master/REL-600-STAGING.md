# REL-600 STAGING DEPLOY

```text
REL = REL-600
TITLE = Staging 배포
STATUS = PENDING
PLAN_LOCKED = TRUE
PROTECTED_SCOPE_MUTATION = FALSE
PRODUCTION_DOMAIN_UNCHANGED = 1
PRODUCTION_WORKFLOW_DISPATCH = 0
PAGES_DEPLOY = 0
VERCEL = 0
SECRET_HARDCODED = 0
WINDOWS_LOCAL_OPENNEXT = BLOCKED_LOCAL_ENVIRONMENT
```

## ORIGIN

staging web = https://ai-profit-web-preview.ebay-adapter.workers.dev
staging ops = https://ai-profit-ops-preview.ebay-adapter.workers.dev
wrangler env = preview
deploy command = `pnpm cf:deploy:staging`

production web = https://ai-profit-web.ebay-adapter.workers.dev
production app = https://app.hiptk.app
production ops origin = https://ai-profit-ops.ebay-adapter.workers.dev
production ops host = https://ops.hiptk.app

Deploy log and live smoke will be recorded after Linux CI preview deploy.
This file stays PENDING until those URLs respond.
