# R8 INFRA RELEASE CERTIFICATION CORE (REL-506)

```text
REL = REL-506
TITLE = INFRA_RELEASE_CERTIFICATION_CORE
STATUS = COMPLETED
CERT_ISSUED = 1
PLAN_LOCKED = TRUE
PROTECTED_SCOPE_MUTATION = FALSE
PAGES_DEPLOY = 0
VERCEL = 0
ADS_EXCLUDED = 1
AUTONOMOUS_OPS_COMPLETE = 0
ADS_OWNER = POST-012
ALL_ALIGNED = 0
KNOWN_P0 = 0
KNOWN_P1 = 0
KNOWN_P2 = 0
KNOWN_P3 = 0
WEB_VITALS_RUM = 0
WEB_VITALS_RUM_OWNER = REL-703
DYNAMIC_CACHE_RULES = 0
CACHE_CONTROL_INVENTORY = 0
PRODUCTION_ANNOTATED_TAG = 0
KNOWN_GOOD_SCHEME = REL-403
KNOWN_GOOD_PRACTICE = REL-602
KNOWN_GOOD_POINTER = pnpm release:id
CURRENT_RELEASE_ID_PINNED = 0
RUNTIME_P3_EKS_OTEL = 0
CONCEALMENT = 0
```

R8 Core 는 OpenNext Workers origin / pages deploy 0 / R2 실사 / 에러추적 경로 / 세션 쿠키 / rollback 체계 를 인증한다.
Ads 자동운영 과 최종 자동운영 완료 문구 는 POST-012 만. 이 문서로 대체하면 FAIL.
Web Vitals 수치 SLO 창작 0 (REL-404). RUM 파이프 는 코드에 없다. 없다고 쓰지 않으면 FAIL.
프로덕션 annotated tag 가 없는데 known-good tag 를 주장하면 FAIL. 연습 실행 은 REL-602.

## 1. ALIGNED (live re-run)

| axis | left | right | verdict | owner |
|---|---|---|---|---|
| openNext_runtime | domain.manifest openNext.runtime | workers | ALIGNED | REL-506 |
| workers_origin_web | openNext.web.workersDev | ai-profit-web.ebay-adapter.workers.dev | ALIGNED | REL-506 |
| workers_origin_ops | openNext.ops.workersDev | ai-profit-ops.ebay-adapter.workers.dev | ALIGNED | REL-506 |
| hosts | manifest env APP/OPS/API | app.hiptk.app / ops.hiptk.app / api.hiptk.app | ALIGNED | REL-506 |
| pages_deploy_path | deploy scripts + wrangler | wrangler pages deploy 0 | ALIGNED | REL-506 |
| vercel | error-sink + stack lock | Vercel 0 | ALIGNED | REL-506 |
| openNext_assets_web | infra/web/wrangler.toml [assets] | ASSETS + .open-next/assets | ALIGNED | REL-506 |
| openNext_assets_ops | infra/ops/wrangler.toml [assets] | ASSETS + .open-next/assets | ALIGNED | REL-506 |
| r2_kyc | infra/r2/kyc-docs.toml | kyc-docs public_access=false | ALIGNED | REL-016 / money |
| r2_asset_images | infra/r2/asset-images.toml | asset-images public_access=true | ALIGNED | REL-506 |
| error_tracking | REL-016 sink | cloudflare-workers-console vercel=0 | ALIGNED | REL-016 |
| session_cookie | Nest aipo_session | httpOnly Set-Cookie | ALIGNED | auth |
| rollback_scheme | VERSIONING.md + release:id | semver + HUMAN tag | ALIGNED | REL-403 |
| rollback_runbook | ROLLBACK_RUNBOOK.md | DRAFT_FOR_REL_602 | ALIGNED | REL-408 |
| web_vitals_lab | REL-404 lighthouse budget | NUMERIC_SLO_INVENTED=0 | ALIGNED | REL-404 |
| p0_p3_engine | FINAL_ACCEPTANCE | DEFECTS_P0/P1=0 · current epoch NOT_ISSUED | STALE_PENDING_REBASE | REL-502 |
| p0_p3_admin | R6_CERTIFICATION | KNOWN_P0~P3=0 | ALIGNED | REL-409 |

## 2. DEFERRED (blank cell = FAIL · ALIGNED 세탁 금지)

| axis | fact | verdict | owner |
|---|---|---|---|
| web_vitals_rum | PerformanceObserver / web-vitals reporter 0 | DEFERRED not aligned | REL-703 |
| cache_rules_full | wrangler dynamic cache / Cache-Control inventory 0 | DEFERRED not aligned | REL-703 |
| known_good_production_tag | annotated v{semver} after HUMAN deploy 0 | DEFERRED not aligned | REL-602 |
| rollback_practice | staging known-good 되돌림 증거 0 | DEFERRED not aligned | REL-602 |
| staging_obs_sample | production/staging 수신 1건 | DEFERRED not aligned | REL-600 / REL-703 |
| route_contract_100 | R7 historical missing_fact | DEFERRED not aligned · not R8 Core | R7 residual |
| ads_autonomous | Ads Autonomous Ops | EXCLUDED not R8 Core | POST-012 |
| runtime_p3 | EKS / OTel full | DEFERRED Phase3 | phase-activation |

## 3. KNOWN-GOOD RECORD

- scheme = REL-403 `governance/release-master/VERSIONING.md`
- live id command = `pnpm release:id` (`{semver}+{gitSha7|local}`)
- pin 0 — HEAD sha 를 이 문서에 박으면 다음 커밋이 문서를 STALE 로 만든다
- production annotated tag = 0 — 태그 없이 known-good 주장 금지
- practice owner = REL-602

## 4. VERIFY

| command | result |
|---|---|
| `pnpm verify:opennext-workers-origin` | Workers SSOT · pages deploy 0 |
| `pnpm verify:observability` | CF console sink · Vercel 0 |
| `pnpm verify:auth-session-cookie` | aipo_session httpOnly |
| `pnpm verify:kyc-r2-only` | private kyc-docs |
| `pnpm verify:rel-403-versioning` | known-good scheme |
| `pnpm verify:rel-404-lighthouse-budget` | lab budget · SLO invent 0 |
| `pnpm verify:rel-506-r8-infra-core` | this document |

## EXIT_GATE

- R8 을 자동운영 완료 / Ads Autonomous Ops 완료 로 쓰면 FAIL
- `PAGES_DEPLOY = 1` 또는 wrangler pages deploy 경로 허용 = FAIL
- `VERCEL = 1` = FAIL
- `WEB_VITALS_RUM = 1` 이면서 reporter 코드 0 = FAIL
- `PRODUCTION_ANNOTATED_TAG = 1` 이면서 태그 0 = FAIL
- `CERT_ISSUED = 1` 이면서 DEFERRED 행을 ALIGNED 로 바꾸면 FAIL
