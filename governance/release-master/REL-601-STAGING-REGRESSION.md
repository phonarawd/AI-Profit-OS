# REL-601 STAGING SURFACE REGRESSION

```text
REL = REL-601
TITLE = Staging 전체 회귀 (Surface Matrix)
STATUS = COMPLETED
PLAN_LOCKED = TRUE
PROTECTED_SCOPE_MUTATION = FALSE
HOME_GEOMETRY_PATCH = 0
PIXEL_DIFF_ALONE_FAIL = 0
PRODUCTION_HOST = 0
MCP_ONLY_DONE = 0
SURFACE_MATRIX_PASS = 1
LARGE_SCREEN_SAFETY = 1
REGRESSION_DATE = 2026-08-24
```

## ORIGIN

staging web = https://ai-profit-web-preview.ebay-adapter.workers.dev
staging ops = https://ai-profit-ops-preview.ebay-adapter.workers.dev
matrix = `tooling/e2e/expansion/staging-regression-matrix.v1.json`
runner = `pnpm staging:regression`
verify = `pnpm verify:rel-601-staging-regression`

## SCOPE

Surface Matrix 전량 (consumer 39 + admin 22 + dynamic smoke 4 = 61 routes).
PWA asset QA 3 (manifest + icon-192 + icon-512).
Home viewport overflow 5 (390 · 1440 · 2560 · 3440 · 3840).
Home 시각 재설계 0. pixel-diff 단독 실패 0.

## REGRESSION LOG

| layer | pass | total | note |
|---|---|---|---|
| HTTP smoke (web+ops surfaces) | 61 | 61 | x-opennext=1 on 200 web · ops 200/307 |
| asset QA | 3 | 3 | manifest JSON + PNG icons 200 |
| Playwright home overflow | 5 | 5 | preview workers direct · no local OpenNext |

machine report = `governance/release-master/REL-601-STAGING-REGRESSION.json`

## HOME LARGE SCREEN SAFETY

| viewport | overflow | pageerror |
|---|---|---|
| 390×693 | PASS | 0 |
| 1440×1080 | PASS | 0 |
| 2560×1440 | PASS | 0 |
| 3440×1440 | PASS | 0 |
| 3840×2160 | PASS | 0 |

## SAMPLE SURFACE STATUS

| surface | route | status |
|---|---|---|
| home | `/` | 200 |
| profits | `/profits` | 200 |
| wallet | `/wallet` | 200 |
| auth-login | `/auth/login` | 200 |
| admin-users | `/admin/users` | 307 |
| admin-ledger | `/admin/ledger` | 307 |

## EXIT_GATE

credential guess/hardcode = 0
production host regression = 0
Home geometry patch = 0
pixel-diff alone fail = 0
surface matrix FAIL with production proceed = blocked (REL-700/701 deps)
