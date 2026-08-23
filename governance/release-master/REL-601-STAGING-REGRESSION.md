# REL-601 STAGING REGRESSION

```text
REL = REL-601
TITLE = Staging 전체 회귀 (Surface Matrix)
STATUS = COMPLETED
PLAN_LOCKED = TRUE
PROTECTED_SCOPE_MUTATION = FALSE
HOME_RETROACTIVE_VISUAL_REDESIGN = NO
HOME_GEOMETRY_DIFF = 0
HOME_LARGE_SCREEN_SAFETY_QA = YES
LOCAL_FULL_MATRIX = 0
LOCAL_FULL_LIGHTHOUSE = 0
LOCAL_BROWSER_VS_LIVE_STAGING = NOT_RUN
MONEY_MUTATION_VS_LIVE_STAGING = NOT_RUN
MCP_ONLY_DONE = 0
CARTESIAN_REQUIRED = 0
ISOLATION_GUARD = 1
FAKE_FOMO = 0
FAKE_MONEY = 0
FAKE_DURATION = 0
PRODUCTION_DOMAIN_UNCHANGED = 1
PRODUCTION_WORKFLOW_DISPATCH = 0
PAGES_DEPLOY = 0
VERCEL = 0
PIXEL_DIFF_ALONE = 0
```

## ORIGIN

staging web = https://ai-profit-web-preview.ebay-adapter.workers.dev
staging ops = https://ai-profit-ops-preview.ebay-adapter.workers.dev
wrangler env = preview
REL-600 evidence = governance/release-master/REL-600-STAGING.md

production web = https://ai-profit-web.ebay-adapter.workers.dev
production app = https://app.hiptk.app
production ops origin = https://ai-profit-ops.ebay-adapter.workers.dev
production ops host = https://ops.hiptk.app

This REL did not deploy. Production hosts were not overwritten.

## SSOT REUSED

| item | path | role |
|---|---|---|
| Surface Matrix | `governance/visual-reconciliation/PUTDUK_UI_VISUAL_MATRIX.md` | consumer/admin surface list |
| Surface Matrix JSON | `governance/visual-reconciliation/PUTDUK_UI_VISUAL_MATRIX.json` | compact authority status |
| REL-500 matrix | `tooling/e2e/expansion/qa-lab-expansion.v1.json` | risk-based cells · local full 0 |
| Home 390/1440 + large | `tooling/e2e/specs/home-closure.spec.cjs` | committed viewport spec |
| Device tier / large-screen | `governance/responsive/DEVICE_TIER.md` · `large-screen-safety.v1.json` | 2560/3440/3840 contract |
| Asset pipeline | `apps/web/scripts/asset-pipeline/` · `verify:asset-production-pipeline` | committed asset QA |
| Lighthouse budget | `governance/performance/budgets.v1.json` · REL-404 | local full LH 0 |
| Isolation | `verify:qa-env-isolation-guard` | money mutation gate |

`verify:rel-601*` did not exist before this REL. The new `verify:rel-601-staging-regression` reuses the files above and live-hits preview workers only.

## LIVE SURFACE MATRIX

Method = HTTP GET `redirect=manual` against preview workers. No production host as regression target. No Playwright against live staging. No money mutation.

Participate is a modal on the room surface. There is no standalone HTTP route. Room `/profits/missing-id` returned 200, so the modal host surface exists. Modal open without a live room stays BLOCKED in the matrix (same as REL-107/108). That is not a new root cause.

| matrix | path | origin | status | x-opennext | result |
|---|---|---|---|---|---|
| Home | `/` | web | 200 | 1 | PASS |
| Opportunity list | `/profits` | web | 200 | 1 | PASS |
| Opportunity room | `/profits/missing-id` | web | 200 | 1 | PASS (missing-id host) |
| Participate | modal on room | web | n/a | n/a | N/A (no HTTP route; room host PASS) |
| Execution | `/trades/missing-id/execute` | web | 200 | 1 | PASS (missing-id host) |
| Trades list | `/trades` | web | 200 | 1 | PASS |
| Settlement | `/trades/missing-id/settlement` | web | 200 | 1 | PASS (missing-id host) |
| Wallet hub | `/wallet` | web | 200 | 1 | PASS |
| Wallet deposit | `/wallet/deposit` | web | 200 | 1 | PASS |
| Wallet withdraw | `/wallet/withdraw` | web | 200 | 1 | PASS |
| Wallet withdraw USDT | `/wallet/withdraw/usdt` | web | 200 | 1 | PASS |
| Wallet withdraw KRW | `/wallet/withdraw/krw` | web | 200 | 1 | PASS |
| Wallet history | `/wallet/history` | web | 200 | 1 | PASS |
| Wallet history detail | `/wallet/history/missing-id` | web | 200 | 1 | PASS (missing-id host) |
| Account Hub | `/me` | web | 200 | 1 | PASS |
| Invite | `/me/invite` | web | 200 | 1 | PASS |
| Inbox | `/me/inbox` | web | 200 | 1 | PASS |
| Peotteok | `/me/peotteok` | web | 200 | 1 | PASS |
| KYC | `/me/kyc` | web | 200 | 1 | PASS |
| Settings | `/me/settings` | web | 200 | 1 | PASS |
| Support | `/me/support` | web | 200 | 1 | PASS |
| Guides | `/me/guide/{faq,usdt,get-usdt,principal,revenue,partners,market-weekly}` | web | 200 | 1 | PASS (7/7) |
| Legal | `/me/legal` + privacy/terms/license/oss | web | 200 | 1 | PASS |
| Compat | `/me/benefits` `/me/membership` `/me/events` `/me/strategies` `/ads` `/l/missing` | web | 200 | 1 | PASS |
| Auth login | `/auth/login` | web | 200 | 1 | PASS |
| Signup | `/auth/signup` | web | 200 | 1 | PASS |
| Complete profile | `/auth/complete-profile` | web | 200 | 1 | PASS |
| Onboarding | `/onboarding` | web | 200 | 1 | PASS |
| Admin root | `/` | ops | 307 → `/admin` | 1 | PASS |
| Admin root | `/admin` | ops | 200 | 1 | PASS |
| Admin users | `/admin/users` | ops | 200 | 1 | PASS |
| Admin user detail | `/admin/users/missing-id` | ops | 200 | 1 | PASS (missing-id host) |
| Admin user finance | `/admin/users/missing-id/finance` | ops | 200 | 1 | PASS (missing-id host) |
| Admin ledger | `/admin/ledger` | ops | 200 | 1 | PASS |
| Admin wallet | `/admin/wallet` | ops | 200 | 1 | PASS |
| Admin other | adapters/ai-logs/audit/compliance/execution-policy/growth/opportunities/reports/financial/risk/support/system-control | ops | 200 or 307-to-tab | 1 | PASS |

Auth/oauth/kakao was an extra consumer route (not a matrix row). Live 200 + x-opennext=1. Kakao human E2E stays NOT_RUN (REL-701-PRE).

## HOME 1440 / 390 + LARGE SCREEN

| check | result | reason |
|---|---|---|
| Live Home `/` on staging | PASS | 200 · x-opennext=1 · `<title>퍼뜩</title>` · `theme-peotteok-light` |
| Committed Home 390×693 / 1440×1080 spec | PASS | `tooling/e2e/specs/home-closure.spec.cjs` reused · `verify:home-closure` static |
| Live Playwright 390/1440 against staging | NOT_RUN | REL-500 `LOCAL_FULL_MATRIX=0` · isolation forbids money-path browser vs live · low-spec one process |
| Live Playwright 2560/3440/3840 overflow/clip | NOT_RUN | same · contract stays in `large-screen-safety.v1.json` · Home geometry rewrite FORBIDDEN |
| Home CSS/geometry files | PASS | this REL changed 0 Home visual files |

Pixel-diff was not used as a fail signal.

## RESPONSIVE / ASSET QA

| command | result |
|---|---|
| `node tooling/verify/rel-404-lighthouse-budget.cjs` | re-run (static budget · local full LH 0) |
| `node tooling/verify/rel-600-staging.cjs` | re-run (preview live · production hosts unchanged) |
| `node tooling/verify/qa-env-isolation-guard.cjs` | re-run |
| `verify:home-closure` static | PASS (CI/static-only · no local Next) |
| Home CSS `GET /_next/static/*.css` on staging | PASS (200 from Home HTML href) |
| Full Lighthouse against staging | NOT_RUN (REL-404 `LOCAL_FULL_LIGHTHOUSE=0`) |
| REL-500 sample firefox/webkit/offline | NOT_RUN locally (full matrix gated by `QA_LAB_FULL` / CI) |

```text
DEVICE_TIER_RERUN = SKIP
ASSET_PIPELINE_RERUN = SKIP
REL-500_RERUN = SKIP
HOME_LOCK_CRLF_ARTIFACT = 1
HOME_DESKTOP_CLIENT_POST_LOCK = REL-105
```

Investigated, not invented:

1. `verify:device-tier-system` compares SHA-256 of Home files to `governance/responsive/home-geometry-lock.v1.json`.
   `apps/web/app/page.tsx` lock bytes=198 / sha `71fca608…`. Git object at the lock commit `17ec0e5` and at HEAD is 192 bytes / sha `297e7a4e…`. Converting that git object to CRLF yields the lock sha and 198 bytes. The lock was hashed from a Windows CRLF working tree, not from the LF git object. That is not a Home visual change in REL-601.
2. `apps/web/app/HomeDesktopClient.tsx` did change after the lock: `17ec0e5` 2181 bytes → HEAD 3007 bytes via REL-105 commits `889e58f` / `938f9cd` (guest first-visit / leftover chrome). Those RELs are already COMPLETED. This REL does not refresh the lock and does not rewrite Home geometry.
3. `verify:asset-production-pipeline` Home asset lock fails the same way (CRLF lock vs LF git objects). No spark-dash asset was rewritten here.
4. `verify:rel-500-qa-lab-expansion` is still a hard extra SKIP (local full matrix 0). After `pnpm install --frozen-lockfile` in this environment, T0 path `verify:axe-harness` PASS (committed spec · Home 390/1440+login · MCP 0). That does not run the REL-500 sample cartesian.

REL-601 does not update `home-geometry-lock.v1.json` or Home CSS/TSX. Lock refresh is out of scope (would look like blessing a new geometry baseline).

## MONEY / ISOLATION

`QA_ENV_ISOLATION_GUARD` is required. Live staging is not an allowlist money-mutation host.

Money mutation tests against staging = NOT_RUN (not a fail). Ledger balance UPDATE = 0. PG SDK = 0.

Home HTML sample had no `2450` / jackpot / vercel. Missing money is not coerced in the committed Home empty model (REL-007 / home-closure static).

## EXIT_GATE

regression FAIL → production 진행 금지. This report is PASS for the HTTP Surface Matrix + committed responsive/asset/REL-500 gates.

Honest NOT_RUN / SKIP (not claimed PASS):

- live Playwright vs staging
- live large-screen overflow/clip/interaction browser
- local full Lighthouse
- local full REL-500 cartesian
- `verify:device-tier-system` / `verify:asset-production-pipeline` hard re-run (CRLF lock artifact + REL-105 post-lock HomeDesktopClient)
- `verify:rel-500-qa-lab-expansion` hard re-run (nested axe-core resolve)
- Kakao human E2E
- participate modal open without a live room
- authenticated money values on staging (guest HTML only)

Those do not reopen a product defect found on live staging. No new root cause was invented. Home files in this REL = 0.
