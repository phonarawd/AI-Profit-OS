# REL-602 STAGING ROLLBACK PRACTICE

```text
REL = REL-602
TITLE = Rollback 연습 (staging 실실행)
STATUS = COMPLETED
PLAN_LOCKED = TRUE
PROTECTED_SCOPE_MUTATION = FALSE
PRODUCTION_ROLLBACK = 0
PRODUCTION_WORKFLOW_DISPATCH = 0
PAGES_DEPLOY = 0
VERCEL = 0
CLOUDFLARE_VERSION_CONTROL = 1
PRACTICE_DATE = 2026-08-24
RELEASE_ID = 0.0.0+b4f5353
```

## ORIGIN

staging web = https://ai-profit-web-preview.ebay-adapter.workers.dev
staging ops = https://ai-profit-ops-preview.ebay-adapter.workers.dev
wrangler env = preview
version list = `pnpm cf:versions:staging`
rollback = `pnpm cf:rollback:staging -- <web|ops> <version-id>`
practice workflow = `.github/workflows/staging-rollback-practice.yml`

REL-600 known-good baseline (첫 staging deploy):

| surface | KNOWN_GOOD_VERSION_ID (REL-600) |
|---|---|
| web | a85bfa7b-639a-4ad1-b1f3-1ca5f35fb40f |
| ops | 81d9b6a2-c5ef-42da-b2e2-46e7af2d4b10 |

release id 형식 = `{semver}+{gitSha7}` · `pnpm release:id`

## PRACTICE LOG

| step | surface | VERSION_BEFORE_ROLLBACK | KNOWN_GOOD_VERSION_ID | VERSION_AFTER_ROLLBACK | FORWARD_DEPLOY | smoke | run |
|---|---|---|---|---|---|---|---|
| rollback | web | ac624265-b475-4c06-b0e2-6aed7e78607e | a85bfa7b-639a-4ad1-b1f3-1ca5f35fb40f | a85bfa7b-639a-4ad1-b1f3-1ca5f35fb40f | | PASS 200 | local `cf-worker-rollback.cjs` |
| forward | web | a85bfa7b-639a-4ad1-b1f3-1ca5f35fb40f | ac624265-b475-4c06-b0e2-6aed7e78607e | ac624265-b475-4c06-b0e2-6aed7e78607e | version promote (no rebuild) | PASS 200 | local `cf-worker-rollback.cjs` |
| rollback | ops | 4a6125d4-9793-4101-89dc-be37972a7d00 | 81d9b6a2-c5ef-42da-b2e2-46e7af2d4b10 | 81d9b6a2-c5ef-42da-b2e2-46e7af2d4b10 | | PASS 307 | local `cf-worker-rollback.cjs` |
| forward | ops | 81d9b6a2-c5ef-42da-b2e2-46e7af2d4b10 | 4a6125d4-9793-4101-89dc-be37972a7d00 | 4a6125d4-9793-4101-89dc-be37972a7d00 | version promote (no rebuild) | PASS 307 | local `cf-worker-rollback.cjs` |

forward deploy = Cloudflare `wrangler rollback <newer-version-id>` 로 이전 active 버전 복귀.
Windows local OpenNext rebuild = BLOCKED_LOCAL_ENVIRONMENT — 버전 UUID 승격으로 forward 검증.

## LIVE AFTER PRACTICE

| url | status | x-opennext |
|---|---|---|
| https://ai-profit-web-preview.ebay-adapter.workers.dev/ | 200 | 1 |
| https://ai-profit-ops-preview.ebay-adapter.workers.dev/ | 307 | 1 |

## EXIT_GATE

credential guess/hardcode = 0
production rollback = 0
production custom domain deploy = 0
rollback 전후 version id 공란 = 0
pages deploy = 0
