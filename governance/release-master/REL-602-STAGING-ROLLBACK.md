# REL-602 STAGING ROLLBACK PRACTICE

```text
REL = REL-602
TITLE = Rollback 연습 (staging 실실행)
STATUS = PENDING
ACCEPTANCE_MET = 0
ROLLBACK_EXECUTED = 0
FORWARD_DEPLOY_EXECUTED = 0
FAKE_PASS = 0
PLAN_LOCKED = TRUE
PROTECTED_SCOPE_MUTATION = FALSE
HOME_RETROACTIVE_VISUAL_REDESIGN = NO
HOME_GEOMETRY_DIFF = 0
LEDGER_BALANCE_UPDATE = 0
PG_SDK = 0
MONEY_MUTATION = 0
PRODUCTION_DOMAIN_UNCHANGED = 1
PRODUCTION_WORKFLOW_DISPATCH = 0
PAGES_DEPLOY = 0
VERCEL = 0
SECRET_HARDCODED = 0
CURSOR_SYNC_PLANS = 0
PUTDUK_POINTERS_UPDATED = 0
KNOWN_GOOD_PRODUCTION_TAG = 0
STAGING_SLOT_CONTROL = 0
CLOUDFLARE_API_TOKEN_IN_AGENT = 0
WRANGLER_SESSION_IN_AGENT = 0
RUNTIME_RELEASE_ID_HEADER = 0
```

REL-408 runbook was followed as far as this session can go. ACCEPTANCE ("롤백이 실동작") is not met. This is not a paper PASS.

## ORIGIN

staging web = https://ai-profit-web-preview.ebay-adapter.workers.dev
staging ops = https://ai-profit-ops-preview.ebay-adapter.workers.dev
wrangler env = preview
deploy command (forward) = `pnpm cf:deploy:staging`
rollback command (preview only) = `pnpm cf:rollback:staging`
dedicated staging workflow = `.github/workflows/deploy-staging.yml` (not on `origin/main`)

production web = https://ai-profit-web.ebay-adapter.workers.dev
production app = https://app.hiptk.app
production ops origin = https://ai-profit-ops.ebay-adapter.workers.dev
production ops host = https://ops.hiptk.app

This REL did not deploy. Production hosts were not overwritten. `workflow_dispatch` `target=production` = 0.

## RUNBOOK STEPS (REL-408)

| step | result |
|---|---|
| 1. Record current release id | `0.0.0+8d2b654` (`pnpm release:id` on starting_ref `8d2b654`) |
| 2. Confirm known-good tag / release id | STOP. Production annotated `v{semver}` tag = 0 (remote + local). Staging candidate ids exist (below) but were not applied. |
| 3. Worker rollback to known-good (staging) | NOT_RUN — no staging slot control in this agent |
| 4. New version id == known-good | NOT_PROVEN |
| 5. DB rollback | NOT_RUN (Founder only · this REL does not apply) |
| 6. Smoke health / login / 기회 / 지갑 읽기 | HTTP guest smoke only (below). money mutation 0 |
| Forward deploy | NOT_RUN |

## STAGING KNOWN-GOOD CANDIDATES (not applied)

REL-600 recorded Cloudflare Worker version ids after preview deploy. Those are the only concrete staging version ids. They are **candidates**, not a practiced rollback.

| surface | REL-600 version id | REL-600 run |
|---|---|---|
| web preview | `a85bfa7b-639a-4ad1-b1f3-1ca5f35fb40f` | https://github.com/phonarawd/AI-Profit-OS/actions/runs/32658478446 |
| ops preview | `81d9b6a2-c5ef-42da-b2e2-46e7af2d4b10` | https://github.com/phonarawd/AI-Profit-OS/actions/runs/32658798096 |

Observability read (2026-08-23) could list scripts, not wrangler version ids:

| worker | script id | created | modified |
|---|---|---|---|
| ai-profit-web-preview | `c188fad8ec744f008286e499fdfe559f` | 2026-08-23T18:35:41Z | 2026-08-23T18:35:47Z |
| ai-profit-ops-preview | `bafb2e56f3b141b7828c78be9581780b` | 2026-08-23T18:41:30Z | 2026-08-23T18:41:35Z |
| ai-profit-web | `2cc7d8ea57864eb6bb2a0ddd46cddd26` | 2026-08-10T00:00:38Z | 2026-08-10T00:00:45Z |
| ai-profit-ops | `9f3af400497749efacde1e23e163961a` | 2026-08-10T00:01:02Z | 2026-08-10T00:01:08Z |

Preview workers were created in REL-600 (single create/modify window). A rollback practice needs a **second** preview version first, then `wrangler rollback` / `wrangler versions deploy <id>@100%` on `*-preview` only. That second version was not uploaded here.

Production workers last-modified 2026-08-10. This REL did not touch them.

## LIVE AFTER INVESTIGATION (read-only)

Method = HTTP GET `redirect=manual`. No Playwright. No money mutation.

| url | status | x-opennext | note |
|---|---|---|---|
| https://ai-profit-web-preview.ebay-adapter.workers.dev/ | 200 | 1 | live · ETag `em78qxd9907nk` |
| https://ai-profit-ops-preview.ebay-adapter.workers.dev/ | 307 | 1 | live · ETag `x1ejgx5xsu6pe` |
| https://ai-profit-web.ebay-adapter.workers.dev/ | 200 | 1 | production unchanged check |
| https://ai-profit-ops.ebay-adapter.workers.dev/ | 307 | 1 | production unchanged check |
| https://app.hiptk.app/ | 200 | 1 | production unchanged check |
| https://ops.hiptk.app/ | 307 | 1 | production unchanged check |

No `PUTDUK_RELEASE_ID` / `x-putduk-release` header (REL-403 `RUNTIME_INJECTION_THIS_REL: 0`). HTTP alone cannot prove a Worker version id change. VERIFY requires wrangler version ids before/after.

## BLOCKERS (honest)

1. **No staging slot control in this agent.** `CLOUDFLARE_API_TOKEN` and `CLOUDFLARE_ACCOUNT_ID` unset. No wrangler login session. `pnpm cf:rollback:staging` cannot list or move versions.
2. **Cloudflare-bindings MCP = needsAuth.** Observability MCP can list script names only. It cannot `wrangler rollback` / versions deploy.
3. **This session cannot `workflow_dispatch`.** `gh` is read-only here. User ban: no `workflow_dispatch` `target=production`. Preview dispatch was not invented via another API.
4. **Production annotated tag = 0.** `git ls-remote --tags origin 'v*'` empty. VERSIONING.md / runbook: known-good for production = last annotated `v{semver}`. Tag-less 「known-good」 claim = FAIL. Staging still has REL-600 version-id candidates (above) but they were not applied.
5. **Preview workers look single-version.** Created and modified in the REL-600 window. Rollback-to-previous needs a prior version or a marker deploy first. Neither was executed.
6. **Runtime release id not exposed.** Even after a future rollback, guest HTTP cannot show `{semver}+{sha7}` until a later deploy slice injects `PUTDUK_RELEASE_ID`.

Missing token / missing tag / no slot control are the reasons named in the execution brief. They are not waived.

## WHAT WAS NOT DONE

- `wrangler rollback` / `wrangler versions deploy` on any worker
- `pnpm cf:deploy:staging` / `cf:deploy:*:prod`
- `workflow_dispatch` on `deploy-cloudflare.yml` (any target)
- overwrite of `app.hiptk.app` / `ops.hiptk.app` / `ai-profit-web` / `ai-profit-ops` (non-preview)
- Vercel · Pages · `.env` commit · `git add -A` · `--no-verify` · `pnpm cursor:sync-plans`
- Home visual redesign · ledger balance UPDATE · PG SDK
- PUTDUK pointer advance (`FIRST_EXECUTION_TODO` stays REL-602 · YAML STATUS stays PENDING)
- REL-603 / REL-700+ / POST-* / production deploy / merge to main

## HOW A LATER SESSION CAN CLOSE THIS REL

All of the following, on **preview workers only**, then rewrite this file:

1. Token that can `wrangler versions list` + `wrangler rollback` for `ai-profit-web-preview` and `ai-profit-ops-preview` (not production names).
2. If versions.length < 2: marker deploy via `pnpm cf:deploy:staging` or `deploy-staging.yml` / `deploy-cloudflare.yml` `target=preview` only. Record the new version ids.
3. `pnpm cf:rollback:staging` (or `wrangler rollback --env preview --name <preview-worker> --message REL-602`) onto the REL-600 candidate ids. Record before/after ids.
4. After rollback, live preview still 200/307 + `x-opennext=1`. Production hosts unchanged (same last-modified / same smoke).
5. Forward deploy back to the intended staging head. Record the new version ids.
6. Only then: `STATUS = COMPLETED`, `ACCEPTANCE_MET = 1`, PUTDUK pointers.

Until that evidence exists, REL-602 stays PENDING.

## EXIT_GATE

미연습 상태로 auto-deploy 금지 (we have no auto-deploy). Fake PASS = FAIL. Pointer update without rollback = FAIL.
