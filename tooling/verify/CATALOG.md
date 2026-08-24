# verify:* Catalog (ADR-016 · §19 pointer)

**3-tier gate** — commit/push/CI 분리.

| tier | 명령 | 시점 | SSOT |
|------|------|------|------|
| **T0** | `pnpm verify:gate:fast` | commit · Husky pre-commit | `gate-fast.cjs` · `domain-by-path.cjs` |
| **T1** | `pnpm verify:gate:push` | push · Husky pre-push | `gate-push.cjs` (= T0 + infra + stubs) |
| **T2** | `pnpm verify:gate` | CI · main merge | `gate.cjs` (= T1 + next-build + opennext-build) |

경로 기반 T0 도메인 = `tooling/verify/domain-by-path.cjs` (변경 파일 → 해당 `verify:*`만).

## T1 push tier (infra · domain stubs)

| id | 스크립트 | tier | 상태 |
|----|----------|------|------|
| stack-lock | `verify:stack-lock` | T0 | ✅ live |
| secrets | `verify:secrets` | T0 | ✅ live |
| plans-ssot | `verify:plans-ssot` | T0 | ✅ live |
| brand-consumer | `verify:brand-consumer` | T0 | ✅ live |
| pg-module-scan | `verify:pg-module-scan` | T1 | ✅ live |
| brand-assets | `verify:brand-assets` | T1 | ✅ live (visual_kit_v1) |
| cf-infra | `verify:cf-infra` | T1 | ✅ live |
| workers-types | `verify:workers-types` | T1 | ✅ live |
| phase0-bootstrap | `verify:phase0-bootstrap` | T1 | ✅ live |
| root-domain-env | `verify:root-domain-env` | T1 | ✅ live |
| domain-bootstrap | `verify:domain-bootstrap` | T1 | ✅ live |
| opennext-workers-origin | `verify:opennext-workers-origin` | T1 | ✅ live (Workers SSOT · pages deploy 0 · proxy/manifest lock · deploy smoke hook) |
| next-major-pin | `verify:next-major-pin` | T1 | ✅ live |
| tailwind-v4 | `verify:tailwind-v4` | T1 | ✅ live |
| lux-theme-sync | `verify:lux-theme-sync` | T1 | ✅ live |
| dark-leak-guard | `verify:dark-leak-guard` | T1 | ✅ live (peotteok-light 단일 출시 · prefers-color-scheme 0 · lux-dark archive 활성참조 0) |
| cf-deploy-packages | `verify:cf-deploy-packages` | T1 | ✅ live |
| no-admin-in-web | `verify:no-admin-in-web` | T1 | ✅ live |
| ia-tabs | `verify:ia-tabs` | T1 | ✅ live |
| admin-routes | `verify:admin-routes` | T1 | ✅ live |
| admin-novice-ui | `verify:admin-novice-ui` | T0 path | ✅ live (초보 관리자용 한국어 · 반응형 셸 · 접근성 · 상태 진실성) |
| api-nest-build | `verify:api-nest-build` | T1 | ✅ live |
| stubs/run-all | domain stubs | T1 | ✅ live |
| settlement-rule-parity | `verify:settlement-rule-parity` | T0 path + T1 always | ✅ live (REL-008 · rust==cjs golden vectors · REL-502 대체 0) |
| web-lint | `verify:web-lint` | T0 path | ✅ live (REL-011 · apps/web eslint 실검사 · no-op echo 0 · 구문 오류 FAIL) |
| axe-harness | `verify:axe-harness` | T0 path | ✅ live (REL-012 · axe-core committed Playwright spec · Home 390/1440+login · MCP 0 · Home freeze 0) |
| rel-402-dependency-audit | `verify:rel-402-dependency-audit` | T0 path + CI | ✅ live (REL-402 · pnpm audit high+ · local full scan 0 · exception ledger) |
| rel-403-versioning | `verify:rel-403-versioning` | T0 path | ✅ live (REL-403 · semver + manual tag · HUMAN deploy · REL-602) |
| rel-404-lighthouse-budget | `verify:rel-404-lighthouse-budget` | T0 path + CI | ✅ live (REL-404 · bundle/image/lazy budget · local full LH 0 · Home freeze) |
| rel-405-rbac-audit | `verify:rel-405-rbac-audit` | T0 path + CI | ✅ live (REL-405 · 5-role lock · audit write/deny · invented roles 0) |
| rel-406-kill-switch | `verify:rel-406-kill-switch` | T0 path + CI | live (REL-406 · 9 kill IDs · path enforce · audit · invented switches 0) |
| rel-407-price-override | `verify:rel-407-price-override` | T0 path + CI | live (REL-407 · 4 price layers · mix 0 · reason/audit · USER_VISIBLE=EFFECTIVE) |
| rel-408-security-baseline | `verify:rel-408-security-baseline` | T0 path + CI | live (REL-408 · RLS 80/80 · secrets · rollback runbook · apply 0) |
| rel-222-admin-ops | `verify:rel-222-admin-ops` | T0 path + CI | live (REL-222 · 3 modes · LIVE confirm · ledger 0 · JWT mint 0) |
| rel-223-match-control | `verify:rel-223-match-control` | T0 path + CI | live (REL-223 · 5 verbs · preview LIVE · ledger verbs 0) |
| rel-224-source-policy | `verify:rel-224-source-policy` | T0 path + CI | live (REL-224 · V1-V3 · overwrite 0 · founder HIGH) |
| rel-409-r6-cert | `verify:rel-409-r6-cert` | T0 path + CI | live (REL-409 · 12+2b · deps re-run · P0-P3 0) |
| rel-500-qa-lab-expansion | `verify:rel-500-qa-lab-expansion` | T0 path + CI | live (REL-500 · risk-based matrix · MCP-only 0 · local full 0) |
| rel-501-money-red-team | `verify:rel-501-money-red-team` | T0 path + CI | live (REL-501 · 7 money modes · guard abort · ledger write 0) |
| rel-502-final-engine-acceptance | `verify:rel-502-final-engine-acceptance` | T0 path + CI | live (REL-502 · PSM collect · drift fail-closed · REL-004 substitute 0) |
| rel-503-protected-scope-watch | `verify:rel-503-protected-scope-watch` | T0 path + CI | live (REL-503 · ISSUED+drift=STALE · simulated 1-file · concealment 0) |
| rel-504-migration-readiness | `verify:rel-504-migration-readiness` | T0 path + CI | live (REL-504 · READY · apply 0 · Track A files · REL-701-DB owner) |
| backend-data-alignment | `verify:backend-data-alignment` | T0 path | live (R7 table · blank cell FAIL) |
| rel-505-r7-backend-alignment | `verify:rel-505-r7-backend-alignment` | T0 path + CI | live (REL-505 · CERT_ISSUED 0 · current-fx wired · STALE pending rebase) |
| rel-508-current-fx-approx | `verify:rel-508-current-fx-approx` | T0 path + CI | live (REL-508 · Nest approx · null not 0 · STALE pending REL-502) |
| rel-506-r8-infra-core | `verify:rel-506-r8-infra-core` | T0 path + CI | live (REL-506 · R8 Core · pages deploy 0 · Ads excluded · rum/tag deferred) |
| rel-507-production-e2e | `verify:rel-507-production-e2e` | T0 path + CI | live (REL-507 · production-loop · isolation · invented success 0) |
| rel-600-staging | `verify:rel-600-staging` | T0 path + CI | live (REL-600 staging preview workers) |
| rel-601-staging-regression | `verify:rel-601-staging-regression` | T0 path + CI | live (REL-601 Surface Matrix staging preview · Home redesign 0 · local full 0) |
| rel-602-staging-rollback | `verify:rel-602-staging-rollback` | T0 path + CI | live (REL-602 real preview rollback + read-only regression + forward deploy · production/DB/money 0) |
| rel-603-age-usability-spotcheck | `verify:rel-603-age-usability-spotcheck` | T0 path + CI | live (REL-603 automated 9 cohort x 4 staging Playwright · human 0 · production/money 0) |
| web-remote-patterns | `verify:web-remote-patterns` | T0 path | ✅ live (REL-013 · next/image 최소 allowlist · used hosts match · https-all 0) |
| pwa-native-shell | `verify:pwa-native-shell` | T0 path | ✅ live (REL-014 · E-PWA-001 · manifest+icons+동등 SW+install/update · store-bridge 0 · push=REL-020) |
| pwa-push-badge | `verify:pwa-push-badge` | T0 path | ✅ live (REL-020 · E-PWA-002 · VAPID path · dispatcher 실연결 · subscribe+SW badge · Admin kill · secret 0) |
| push-channel-prefs | `verify:push-channel-prefs` | T0 path | ✅ live (REL-021 · E-PWA-003 · notice/campaign/opportunity 격리 · pref=false enqueue 0) |
| webauthn-ux-rp | `verify:webauthn-ux-rp` | T0 path | ✅ live (REL-022 · E-PWA-004 · CF RP · support+fallback · haptic optional · money owner 0) |
| pwa-day1-certification | `verify:pwa-day1-certification` | T0 path | ✅ live (REL-023 · E-PWA-007 · 014/020/021/022 · store-bridge 0 · Lighthouse CI-delegated) |
| user-ledger-query | `verify:user-ledger-query` | T0 path | ✅ live (REL-015 · 유저 JWT 본인 전표 · 403 타인 · decimal string · GET-only · UPDATE 0) |
| earnings-embed | `verify:earnings-embed` | T0 path | ✅ live (REL-111 · /trades earnings owner=wallet.profitUsdt · client sum 0 · KRW 0) |
| observability | `verify:observability` | T0 path | ✅ live (REL-016 · CF Workers console sink · money/KYC mask · 5xx/ledger/auth alerts · Vercel 0) |
| legacy-plan-migration | `verify:legacy-plan-migration` | T0 path | ✅ live (REL-017 · 21파일 권위 스탬프 · sync-plans 0 · Home mirror 0) |
| asset-production-pipeline | `verify:asset-production-pipeline` | T0 path | ✅ live (REL-018 · source→optimize→hash→public→review · partner AI 0 · Home lock) |
| device-tier-system | `verify:device-tier-system` | T0 path | ✅ live (REL-019 · detectDeviceTier 재사용 · 2560/3440/3840 안전 문서 · Home geometry lock) |

## T2 CI-only (heavy build)

| id | 스크립트 | tier | 상태 |
|----|----------|------|------|
| next-build | `verify:next-build` | T2 | ✅ live (web + admin `next build`) |
| opennext-build | `verify:opennext-build` | T2 | ✅ live (Windows=SKIP · CI ubuntu=full) |

## T0 path-trigger domain (변경 시에만)

| 경로 패턴 | verify |
|-----------|--------|
| `governance/platform-redesign/**` · `schemas/governance-observation.v1.json` · `tooling/verify/platform-redesign-inventory.cjs` · `tooling/verify/platform-fact-state-registry.cjs` · `tooling/verify/platform-change-control.cjs` · `tooling/verify/governance-observation-registry.cjs` · `tooling/verify/lib/platform-redesign-measure.cjs` | platform-redesign-inventory · platform-fact-state-registry · platform-change-control · governance-observation-registry |
| `governance/engine-acceptance/**` (FINAL_ACCEPTANCE.md 제외) · `tooling/engine-acceptance/**` · `tooling/verify/engine-acceptance.cjs` · `.github/workflows/engine-acceptance.yml` | engine-acceptance |
| `governance/figma/**` · `tooling/verify/figma-project-registry.cjs` | figma-project-registry |
| `governance/visual-reconciliation/**` · `tooling/verify/locked-visual-reconciliation.cjs` · locked Account Hub `/me` | locked-visual-reconciliation |
| `tooling/e2e/**` · `tooling/verify/qa-env-isolation-guard.cjs` | qa-env-isolation-guard |
| `tooling/e2e/lib/axe-scan.cjs` · `tooling/e2e/specs/axe-a11y.spec.cjs` · `tooling/verify/axe-harness.cjs` | axe-harness |
| `apps/web/lib/opportunity-card-map.ts` · `apps/web/components/spark-dash-home/format.ts` · `packages/ui/components/opportunity/money-display.ts` · `tooling/e2e/lib/money-unavailable.cjs` · `tooling/e2e/specs/money-unavailable.spec.cjs` · `tooling/verify/money-unavailable.cjs` | money-unavailable |
| `packages/ui/**` · `apps/web/**` | no-it-jargon · mockup-governance · canon-surfaces |
| `apps/web/**` · `tooling/verify/web-lint.cjs` | web-lint |
| `apps/web/next.config.ts` · `packages/ui/components/product/image-hosts.ts` · `tooling/verify/web-remote-patterns.cjs` | web-remote-patterns · product-image |
| `apps/web/public/manifest.webmanifest` · `apps/web/public/sw.js` · `apps/web/public/icons/**` · `apps/web/app/pwa-shell.css` · `apps/web/components/pwa/**` · `tooling/verify/pwa-native-shell.cjs` | pwa-native-shell |
| `workers/push-dispatcher/**` · `services/api-nest/src/push/**` · `packages/sdk/src/push/**` · `governance/pwa/**` · `schemas/push-*.json` · `tooling/pwa/**` · `tooling/verify/pwa-push-badge.cjs` | pwa-push-badge · push-channel-prefs |
| `services/api-nest/src/auth/webauthn-rp.ts` · `packages/ui/components/auth/webauthn-ready.ts` · `packages/ui/components/auth/AuthLogin.tsx` · `governance/pwa/webauthn-rp.v1.json` · `tooling/pwa/webauthn-*` · `tooling/verify/webauthn-ux-rp.cjs` | webauthn-ux-rp · webauthn-fallback-pointer · pwa-native-shell |
| `governance/pwa/DAY1_CERTIFICATION.md` · `governance/pwa/day1-checklist.v1.json` · `tooling/pwa/pwa-day1-*` · `tooling/pwa/lighthouse-pwa.ci.cjs` · `tooling/verify/pwa-day1-certification.cjs` | pwa-day1-certification |
| `services/api-nest/src/ledger/ledger.user*` · `services/api-nest/ledger-user-query.core.cjs` · `tooling/e2e/**/ledger-user-query*` · `tooling/verify/user-ledger-query.cjs` | user-ledger-query |
| `governance/observability/**` · `packages/observability/**` · `services/api-nest/src/observability/**` · `apps/web/components/observability/**` · `tooling/verify/observability.cjs` | observability |
| `governance/legacy-plan-migration/**` · `tooling/legacy-plan-stamp.cjs` · `tooling/verify/legacy-plan-migration.cjs` · `.cursor/plans/*.plan.md` | legacy-plan-migration |
| `apps/web/scripts/asset-pipeline/**` · `tooling/verify/asset-production-pipeline.cjs` | asset-production-pipeline |
| `packages/sdk/src/device-tier.ts` · `packages/ui/tokens/device-tier-contract.ts` · `governance/responsive/**` · `tooling/verify/device-tier-system.cjs` · `tooling/verify/ux-design-system.cjs` | device-tier-system · ux-design-system |
| `governance/admin/**` · `tooling/verify/rel-400-admin-control-plane.cjs` | rel-400-admin-control-plane |
| `governance/security/http-headers` · `tooling/security/http-headers.cjs` · web/admin next.config · api-nest security-headers | rel-401-security-headers |
| `governance/security/dependency-audit` · `governance/security/AUDIT_EXCEPTIONS.md` · `tooling/security/dependency-audit.cjs` · `.github/workflows/gate.yml` | rel-402-dependency-audit |
| `governance/release-master/VERSIONING.md` · `governance/release-master/versioning.v1.json` · `tooling/release/version-id.cjs` | rel-403-versioning |
| `governance/performance/**` · `tooling/perf/lighthouse.ci.cjs` · `.github/workflows/lighthouse.yml` | rel-404-lighthouse-budget |
| `schemas/admin-audit.v1.json` · `services/api-nest/admin-audit.core.cjs` · `services/api-nest/src/audit/**` · `governance/admin/rbac-audit*` | rel-405-rbac-audit |
| `schemas/admin-kill-switch.v1.json` · `services/api-nest/admin-kill-switch.core.cjs` · `services/api-nest/src/kill-switch/**` · `governance/admin/kill-switch*` | rel-406-kill-switch |
| `schemas/price-override-layers.v1.json` · `services/api-nest/price-override.core.cjs` · `services/api-nest/src/price-override/**` · `governance/admin/price-override*` | rel-407-price-override |
| `governance/release-master/SECURITY_BASELINE.md` · `governance/release-master/ROLLBACK_RUNBOOK.md` · `tooling/verify/rel-408-security-baseline.cjs` | rel-408-security-baseline |
| `schemas/admin-ops-mode.v1.json` · `services/api-nest/admin-ops.core.cjs` · `services/api-nest/src/admin-ops/**` · `governance/admin/admin-ops*` | rel-222-admin-ops |
| `schemas/admin-match-control.v1.json` · `services/api-nest/admin-match-control.core.cjs` · `services/api-nest/src/match-control/**` · `governance/admin/match-control*` | rel-223-match-control |
| `schemas/admin-policy-version.v1.json` · `services/api-nest/admin-policy-version.core.cjs` · `services/api-nest/src/source-policy/**` · `governance/admin/source-policy*` | rel-224-source-policy |
| `governance/admin/R6_CERTIFICATION.md` · `tooling/verify/rel-409-r6-cert.cjs` | rel-409-r6-cert |
| `tooling/e2e/expansion/**` · `tooling/e2e/lib/qa-lab-expansion.cjs` · `tooling/verify/rel-500-qa-lab-expansion.cjs` | rel-500-qa-lab-expansion |
| `tooling/e2e/money/**` · `tooling/e2e/lib/money-red-team.cjs` · `tooling/verify/rel-501-money-red-team.cjs` | rel-501-money-red-team |
| `governance/engine-acceptance/FINAL_ACCEPTANCE.md` · `tooling/verify/rel-502-final-engine-acceptance.cjs` · `tooling/verify/lib/rel-502-psm.cjs` | rel-502-final-engine-acceptance |
| `governance/engine-acceptance/PROTECTED_SCOPE_STALE_WATCH.md` · `tooling/engine-acceptance/protected-scope-watch.cjs` · `tooling/verify/rel-503-protected-scope-watch.cjs` | rel-503-protected-scope-watch |
| `governance/release-master/MIGRATION_READINESS.md` · `tooling/verify/rel-504-migration-readiness.cjs` | rel-504-migration-readiness |
| `governance/release-master/R7_BACKEND_ALIGNMENT.md` · `tooling/verify/backend-data-alignment.cjs` · `tooling/verify/rel-505-r7-backend-alignment.cjs` | backend-data-alignment · rel-505-r7-backend-alignment |
| `governance/release-master/REL-508-CURRENT-FX-APPROX.md` · `services/api-nest/src/opportunities/current-fx-approx*` · `schemas/current-fx-approx.v1.json` | rel-508-current-fx-approx |
| `governance/release-master/R8_INFRA_CORE.md` · `governance/release-master/r8-cache-inventory.v1.json` · `tooling/verify/rel-506-r8-infra-core.cjs` | rel-506-r8-infra-core |
| `tooling/e2e/specs/production-loop.spec.cjs` · `tooling/e2e/lib/production-loop.cjs` · `tooling/verify/rel-507-production-e2e.cjs` | rel-507-production-e2e |
| `governance/release-master/REL-600-STAGING.md` · staging origin · `tooling/verify/rel-600-staging.cjs` | rel-600-staging |
| `governance/release-master/REL-601-STAGING-REGRESSION.md` · Surface Matrix · `tooling/verify/rel-601-staging-regression.cjs` | rel-601-staging-regression |
| `governance/release-master/REL-602-STAGING-ROLLBACK.md` · `tooling/deploy/cf-rollback-staging.cjs` · `tooling/verify/rel-602-staging-rollback.cjs` | rel-602-staging-rollback |
| `governance/release-master/AGE_SPOTCHECK.md` · `tooling/e2e/specs/rel-603-age-usability-spotcheck.spec.cjs` · `tooling/verify/rel-603-age-usability-spotcheck.cjs` | rel-603-age-usability-spotcheck |
| `apps/admin/**` | no-admin-in-web · admin-routes · admin-novice-ui · rel-201-admin-dashboard · rel-202-admin-users · rel-203-admin-user-detail · rel-204-admin-user-finance · rel-205-admin-ledger · rel-206-admin-wallet · rel-207-admin-compliance · rel-208-admin-risk · rel-209-admin-execution-policy · rel-210-admin-opportunities · rel-211-admin-adapters · rel-212-admin-support · rel-213-admin-system-control · rel-214-admin-audit · rel-215-admin-ai-logs · rel-216-admin-financial · rel-217-admin-growth · rel-218-admin-growth-deposit · rel-219-admin-growth-ticker · rel-220-admin-growth-whale · rel-221-admin-growth-content |
| `tooling/verify/rel-2xx-admin-*` · `admin-entry-e2e` · `tooling/e2e/specs/admin-entry-closure.spec.cjs` | same REL-201~221 verifiers · admin-entry-e2e |
| opportunity UI/copy/canon | balance-aware-feed · opportunity-scan · margin-compare · asset-image · cta-earn-profit |
| `supabase/migrations/**` · migrations-applied fixture | migrations-applied-parity |
| `apps/web/app/page.tsx` · `HomePageClient` · `HomeDesktopClient` · `packages/sdk/src/user-feed/**` · `HomePrincipalRail` · `home-principal-slots` · sdk/api growth | home-live-wire · sdk-user-feed · home-principal-slots · growth-public-surface · ticker-pii-0 · home-closure |
| `apps/web/app/profits/**` · `ProfitsDesktopClient` · `spark-dash-profits` | profits-live-wire · sdk-user-feed |
| `apps/web/app/profits/[id]/**` · `spark-dash-room` · `packages/sdk/src/participate` | opportunity-detail-live-wire · participate-web-wire · sdk-user-feed |
| `apps/web/app/wallet/page.tsx` · `packages/sdk/src/wallet/**` | wallet-live-wire |
| `apps/web/app/trades/EarningsEmbed.tsx` | earnings-embed · trades-live-wire |
| `apps/web/app/wallet/deposit/**` · `me/kyc` · `me/support` · `KycFlow` | stub-page-actions · usdt-deposit-closure · krw-deposit-closure |
| money api-nest | pg-module-scan · bucket-invariant |
| `schemas/home-money-read.v1.json` · `wallet/home-money-read*` · `packages/sdk/src/home-money-read/**` | home-money-read-contract |
| engine-rust · trade/opportunity api | match-success-rule · settlement-rule-parity · participate-http · execute-rule-loop |
| auth/jwt | auth-jwt-runtime · auth-flows · auth-session-cookie · auth-rate-limit |
| `api-nest` wallet · kyc.controller | wallet-kyc-session-auth |

## Domain gates (T1 `stubs/run-all` · 구현되면 hard)

| id | 도메인 |
|----|--------|
| bucket-invariant · withdraw-mode-default · principal-withdraw-reachable · principal-profit-abuse · balance-aware-feed · practice-non-withdrawable | Money §49/§51.7 — **live** (posting·ASC FOR UPDATE·idempotency·provision·recon · default mode=profit · 원금 CTA·시트·3CTA · Admin finance?tab=buckets · §49.9 P1~P24/E1~E12 risk queue·freeze·circuit · §49.2a suggest deeplink·principal Fact·Engine pointer · practice welcome 1회·7d expire·Banner·403) |
| home-money-read-contract | Money v7.23 R1 — **live** (`schemas/home-money-read.v1.json` · `GET /api/v1/me/home-money-read` · principalUsdt+settlementCompletedTodayCount · per-field asOf/source/state · Engine todayPossibleProfitUsdt 0 · availableUsdt/todayPossible 0 · zero≠absent · mutation/DDL 0) |
| home-state-truth | Engine v7.23 R1 — **live** (`schemas/home-read-model.v1.json` · `GET /api/v1/me/home-read` · Money+opportunity+growth+session mapper · todayPossible=server_derived affordable∧available∧compareReady · ledgerTotal=settlement COUNT · viewState · domainFsm null · App/React/CSS 0) |
| no-fake-zero-status | Engine v7.23 R1 — **live** (unauthorized/guest/expired → Fact null · ready_data requires authenticated · deny availableUsdt/staticScanClaim · recoverable_error not coerced to ready_*) |
| idempotency-conflict-detection | Money post-r0 — **live** (same key+different payload → 409 · fingerprint · ledger+participate · mig request_fingerprint) |
| committed-event-publication-durability | Money post-r0 — **live** (ledger TX outbox intent · emit≠ack · poller replay · Phase0 Postgres) |
| money-wallet-auth-remediation | Money post-r0 Finding A+B — **live** (practiceWelcome JWT+sessionUserId · practiceExpireTick fail-closed machine-auth · Adapters fail-open 복제0) |
| withdraw-fee-ledger · min-holding-scope | Money §11.1/§11.2 — **live** (deposit-config fee/minHolding · FEE_REVENUE · profit-only exempt) |
| match-success-rule · simulation-gate | Engine §48/§51 — match-success-rule **live** · simulation-gate **live** (M0.5 S1~S4 · platform_reserve · Growth ON ≤24h · Admin growth?tab=simulation · system-control?tab=reserve) |
| ai-feature-platform · shadow-replay-drift · no-success-rate-as-rule · no-ai-data-in-git | Engine ai-feature-platform — feature-platform + ai-platform L1/L2 · AI PICK · AI_LOG/Eval · L3 money0 · offline shadow-replay drift **0.000%** · failAction=`block_settlement`(persisted) + `ADVISORY_LABEL`=`drift_advisory_only`(settlement unwired · §47.16.6) · sellSuccessRate≠Rule/PICK · GitHub AI data0 — **live** |
| twin-fact-separation | Engine §47 Personal AI — Twin≠money Fact · Memory+pgvector · Fact freshness · Answer Guard · P/G/S router — **live** |
| no-it-jargon · toast-emoji · korean-ui · cute-emoji-palette | UI §50 · §27.10 — **live** (copy/ko skeleton · voice.* · toast 1~2 · palette/caps) |
| ticker-pii-0 · legal-plain-ko · part5-shell-toast | UI PART5 §33.2a·§50.1/§50.3·§8.2 — **live** (LivePayoutTicker PII0 · CountUp ledger-only · 약관4종 · BottomNav5+ToastHost+nested routes) |
| age-tone-surfaces · font-scale-three · deposit-network-plain-ko | UI §38.9·§50.1 · Money §41.6 — **age-tone-surfaces · font-scale-three live** · **deposit-network-plain-ko live** (트론 경고 · TRC20 유저0 · wrong-chain→CS+disputes) (v7.22.10) |
| ux-design-system | UI PART1d — Lux fontScale/spacing · MotionCTA · PPE ladder · breakpoints/test-points · device-tier S/A/B — **live** |
| responsive | UI audit §45 · PART8c — Playwright multi-viewport harness `390/430/768/1024/1366/1440/1920/2560/3440/3840` · Canon structure diff (`data-canon-block` vs wire `blocks[]`) · fluid/touch-target/device-tier S/A/B · VirtualList/VirtualOpportunityList/VirtualTicker · `DeviceTierApply` `data-tier` · pixel/screenshot QA 0 by default (ADR-013) · **Owner-approved Visual Master + LOCK 예외** = `packages/ui/canon/visual-locks.v1.json`(`visual-master-intake.mdc`, 레지스트리 비면 예외 0) · local=Node structure · `RESPONSIVE_PW=1`=browsers — **live** |
| onboarding-experiential · auth-surfaces · landing-3s · kyc-surfaces | UI §6.4~6.4d · Infra §31.2a/b · Money §42 (v7.22.11) — **onboarding-experiential · auth-surfaces · landing-3s · kyc-surfaces live** (Canon Lux3면 · RRN0) |
| trust-copy · tax-disclaimer · objection4 | UI §38 PART6b — **live** (금지어0 · 면책 입금/guide · Guest onboarding 면책0=v7.22.55 utility · Admin content 잠금 · Objection Q1~Q4 온보딩·입금게이트·FAQ·상세) |
| auth-flows | Infra §51.9+§51.9.1 — Nest JWT only · Stage A/B · OAuth/Passkey · session · 탈퇴 · **live** |
| auth-session-cookie | UI PART9-pre2 — httpOnly `aipo_session` Set-Cookie · cookie-parser · JwtAuthGuard cookie fallback · JSON accessToken 유지 — **live** |
| wallet-kyc-session-auth | UI PART9-pre2 — Wallet/Kyc 유저 라우트 JwtAuthGuard + session userId (IDOR query/body userId 0) — **live** |
| home-live-wire | UI PART9b/9c — `/` page↔`@aipo/sdk/user-feed`↔DayPulse · nearMissExtraCount · 401 graceful — **live** |
| home-principal-slots | UI PART9d — §5.3 B/D `HomePrincipalRail` + Canon `home-principal-slots` + `home-money-grid`(v1.3, 구 `lux-feed-grid` 공유 분리) · principalUsdt/todayPossibleProfitUsdt — **live** |
| profits-live-wire | REL-106 — `/profits` live feed · error≠empty · requiredCapital · Playwright profits-closure — **live** |
| opportunity-detail-live-wire | REL-107 — `/profits/[id]` live detail · error≠empty/404 · requiredCapital continuity · preflight before execute · Playwright opportunity-detail-closure — **live** |
| participate-web-wire | REL-107 — `@aipo/sdk/participate` issuePreflight+postParticipate · `/profits/[id]` 실연결 · amountUsdt=requiredCapitalUsdt · 목록 POST 0 — **live** |
| participate-sheet-live-wire | REL-108 — ParticipateConfirmSheet 11-state · failure≠closed · accepted after server · Playwright participate-sheet-closure — **live** |
| execute-web-wire | REL-109 — `useTradeExecution` · `/trades/[id]/execute` 실데이터 · cookie session tick · consumer 상태 테이블 · progressPct 표시 0 — **live** |
| execute-live-wire | REL-109 — server state owner · query-fake success 0 · settledProfit required · Playwright execute-closure — **live** |
| trades-web-wire | REL-110 — `GET /api/v1/trades` session list · `@aipo/sdk/trades` fetchTradeList · `/trades` · buckets.profitUsdt · progressPct 표시 0 — **live** |
| trades-live-wire | REL-110 — live list · error≠empty · wallet profit unavailable≠0 · Playwright trades-closure — **live** |
| earnings-embed | REL-111 — `/trades` earnings owner=`wallet.profitUsdt` · client sum 0 · KRW 0 · missing≠0 — **live** |
| settlement-detail | REL-112 — `/trades/[id]/settlement` · REL-015 journal · 재계산 0 · own/other/missing — **live** |
| core-opportunity-journey | REL-106~110 DEV/TEST Home→List→Detail→Confirm→Execute→Result · production money mutation 0 — **live** |
| wallet-live-wire | UI PART9b/9f — `/wallet` buckets + `@aipo/sdk/wallet` `fetchWalletBuckets` (출금≠9f2) — **live** |
| wallet-closure | REL-113 — `/wallet` unauthorized/ready · missing≠0 · leftover 5-tab chrome 0 — **live** |
| invite-closure | REL-120 — `/me/invite` GET `/api/v1/referral/me` · unauthorized≠empty · leftover 5-tab chrome 0 — **live** |
| inbox-closure | REL-121 — `/me/inbox` GET `/api/v1/me/inbox` · 401≠empty — **live** |
| peotteok-closure | REL-122 — `/me/peotteok` fact-only · spark-dash ai-orb reuse — **live** |
| profile-closure | REL-123 — `/me` session owner · leftover chrome 0 · fake zero 0 — **live** |
| kyc-closure | REL-124 — `/me/kyc` status owner · fake approved 0 — **live** |
| settings-closure | REL-125 — `/me/settings` prefs persist · logout/delete owners — **live** |
| support-closure | REL-126 — `/me/support` deposit-disputes · fake chat 0 — **live** |
| guides-closure | REL-127 — `/me/guide/*` 7 routes — **live** |
| legal-closure | REL-128 — `/me/legal*` 5 routes · existing legal owner — **live** |
| partner-trust-closure | REL-129 — official partner logos only — **live** |
| account-compat-closure | REL-130 — `/ads` `/l/*` events/strategies/membership/benefits — **live** |
| account-hub-batch | REL-120~130 static contract — **live** |
| account-journey | REL-120~130 Account journey Playwright — **live** |
| usdt-deposit-closure | REL-114 — `/wallet/deposit` USDT address owner · credit 0 · happy+deny — **live** |
| krw-deposit-closure | REL-115 — `/wallet/deposit?tab=krw` pending≠credit · PG 0 · happy+deny — **live** |
| withdraw-flow-wire | UI PART9f2 — WithdrawAmountPanel + step-up challenge/verify + POST `/wallet/withdraw` idempotencyKey · PrincipalConfirmSheet client token pointer — **live** |
| usdt-withdraw-closure | REL-116 — `/wallet/withdraw/usdt` server accept · credit 0 · happy+deny — **live** |
| krw-withdraw-closure | REL-117 — `/wallet/withdraw/krw` server accept · PG 0 · happy+deny — **live** |
| transaction-history-closure | REL-118 — `/wallet/history` REL-015 list · mock 0 · empty≠401 — **live** |
| transaction-detail-closure | REL-119 — `/wallet/history/[journalId]` REL-015 slip · 403 other · recalc 0 — **live** |
| migrations-applied-parity | Supabase — 로컬 `supabase/migrations` 버전 ↔ `fixtures/migrations-applied.v1.json`(원격 applied 스냅샷) 1:1 · path-trigger — **live** |
| growth-public-surface | UI PART9g — `growth_ticker_config` + GET `/growth/public-surface` · ledgerTotal=settlement.completed · Admin PATCH pointer — **live** |
| stub-page-actions | UI PART9i — deposit `my-deposit-address`+copy · KYC multipart submit · support `deposit-disputes` POST+idempotencyKey — **live** |
| ai-coach-runtime | REL-300~305 Coach runtime reconfirm -- P UNAVAILABLE · G tools=[] · S safe-refuse · red-team fixture · stale != current · bounded PII -- **live** |
| ai-coach-fact-only · ai-coach-no-autonomy · ai-coach-ui | Engine §47.12~15 · UI §6.4e/§27.10 — **P레인** Fact-only · 전레인 자율집행 0 · FactToolService+CoachOrchestrator+SSE — **live** · **ai-coach-ui live** (`/me/peotteok` Canon · SSE client · P칩 · S거절 deep-link · degrade toast · voice pace) |
| ai-general-no-money-tools · ai-lane-router · llm-adapter-contract | Engine §47.8·47.13~15 — G tools=[] · P/G/S router · **live** · ai-lane-router는 `expectToolsAny`→`tools_called` 실검증 |
| routing-coverage | Engine §47.16.3 — `/지갑/`+`EXECUTION_PATTERNS`→P · `defaultToolsForText`→`getExecution` 도달(opportunity fallback 전) · eval/p_fact getExecution 3케이스 · S/G safe fallback · numeric 비침범 — **live** |
| ai-scope-guard | Engine §47.16.4 — `OFF_TOPIC_PATTERNS`→`scope_redirect`(LLM0·tools=[]) · meta residual guard · G프롬프트 1줄 · eval/g_scope_escape §H 7 · assurance 3단계(complete=NOT_PROVEN) — **live** |
| ai-guard-authority | Engine §47.16.4/§47.8 — post-generation authority lock · terminal `scope_redirect` no P-tool escalate · G output money cue != P tools · user-intent G->P kept — **live** |
| numeric-grounding | Engine §47.16.5 — `numeric-grounding.cjs` currency/percent/quantity/date(platform) · ordinal/bare exclude · serverDerivedAllowlist · `ungrounded` guard(P·llm_p) · CoachOrchestrator `renderFactAnswer` fallback · GROUNDED_NUMERIC_JSON prompt · date 회귀 — **live** |
| llm-quota-degrade | Engine §47.13 — 429→G busy·P Fact · 자동 failover 0 · toast `PEOTTEOK_LLM_BUSY` — **live** |
| fact-freshness · answer-trace | Engine §47.4·47.5·47.15 — stale Fact refresh · lane+trace 100% · **live** |
| conversation-state-bounded | Engine §47.16.2 (HARDENING V1 conv-state slice) — Redis working-state userId+conversationId 바인딩 · ownership fail-closed · TTL config-driven(`aiConvStateTtlSec`=3600·`aiConvStateAbsoluteLifetimeSec`=43200 12h) · bounded turns/history · F14 credentials 정합 · ConversationStateService durable-memory 비소유 · routing/scope/numeric 비침범 가드 — **live** |
| reference-resolution | Engine §47.16.2 — `reference-resolver.cjs` resultRef hint-only resolve(resolved/ambiguous/not_found/unavailable) · getExecution `user_id+$id` 소유권 재검증 · normalized preference `ai_memory.append` 최초 연결 · unresolved≠REFERENCE_JSON · fact-only/no-autonomy 유지 — **live** |
| pwa-manifest · pwa-serwist-single · pwa-brand-icons | PWA §23.1·25·26 — historical ids. Day-1 shell = **pwa-native-shell** (REL-014). Push/cert = REL-020~023 |
| push-dedup · pwa-phase0-bus | PWA §23.5 — source_event_id · Phase0 NATS 0 |
| webauthn-fallback-pointer · email-provider-resend | Money §43.6 Owns · PWA §23.6 UX only · Resend SSOT — **live** |
| lighthouse-pwa | PWA §26 — CI ≥90 · local 8GB stub OK |
| assetlinks | PWA §24.3 — `/.well-known/assetlinks.json` · package↔SHA-256 · TWA ready (v7.22.49 · v2 `store-bridge-scaffold`) — **planned** |
| store-bridge-artifacts | PWA §24.3 — Play=`.aab` · Uptodown=`.apk`\|`.xapk` · 혼용 제출 문서/스크립트 0 (v7.22.49 · v2) — **planned** |
| store-uptodown-listing | PWA §24.3b — listing 한도·webview/VT/배포권 체크리스트 · Console Owns=PWA (v7.22.49 · v2 `store-bridge-uptodown-listing`) — **planned** |
| attribution-chain · capi-consent · capi-config · capi-smoke · seo-schema | Infra §31.2c~§31.4 · UI §6.4c.1 (v7.22.55) — **planned** · D1~D3 dedup · consent=false send0 · capi-config/smoke · METRICS.md · Admin Worker health pointer |
| marketing-compliance · operator-footer | Infra §31.4/§31.7 · UI §6.4c.1 (v7.22.55) — **live** · **marketing-compliance**=landing 금지어(수익·투자·USDT·테더·보장·차익·**괴리율**·재테크·알바 1:1)+`/l/*` auto fbq/ttq 0 · Lead emit=`consentMarketing===true` · **operator-footer**=schema↔instance **supportEmail**↔LandingOperatorFooter↔legal 3면 · UI PART2c 게이트 |
| platform-redesign-inventory | Index v7.23 R0-1 — Forensic baseline+route-contract-matrix · `governance/platform-redesign/*.v1.json` · classification=`defect\|intentional\|deferred\|missing_fact` only · 구현코드0 · path-trigger — **live** |
| platform-fact-state-registry | Index v7.23 R0-2 — `fact-state-registry.v1.json` · Fact↔State 반복검증 · commonViewStates⊥domain FSM · reasonCode=`domain.resource.reason` · source/asOf/freshness/owner/provenance 필수 · 구현코드0 · path-trigger — **live** |
| platform-change-control | Index v7.23 R0-3 — `change-control.v1.md` · L1/L2/L3+version bump · ADR-017 Light+Purple·IA 새 라벨·OpenNext Workers before/after/영향/rollback/승인 증거 · d903eef7 REFERENCE ONLY 흡수 crosswalk · 구현코드0 · path-trigger — **live** |
| governance-observation-registry | Index v7.23 R0-4 + post-r0 — schema+registry · status enum · currentlyOccurring⊥reviewTrigger · R0 AtR0 locks=0 불변 · post-r0 Money wave1 promote4/materialize3 · Engine observed2 · Change Control `cc.money.r0-obs-promote-wave1` · path-trigger — **live** |
| qa-env-isolation-guard | REL-006 QA Lab — **live** (production ref `mgsytcetsiecllmhcyox` throw · money mutation fail-closed · committed Playwright spec · MCP-only DONE 0) |
| money-unavailable | REL-007 — **live** (missing money → UNAVAILABLE · 실제 0 유지 · Home geometry 0) |
| figma-project-registry | REL-009 + REL-131 — **live** (fileKey locked · REL-131 Desktop 192:194 + Mobile 192:434 FOUNDER_APPROVED_LOCKED · approvedAuthority=2 · V1/V2 SUPERSEDED preserved · other frames candidate · Home 46:2 BACKUP · Code Connect candidate-only · REL-131 apply 0) |
| auth-rate-limit | REL-010 — **live** (auth 라우트 서버 fixed-window · 429 + 한국어 · QA 가드 안 · 프로덕션 폭격 0) |
| landing-guest-closure | REL-100 — **live** (guest `/` empty money truth · Landing3s CTA · Home freeze · Playwright landing-guest) |
| home-closure | REL-105 — **live** (Home freeze · root legacy chrome 0 · guest+member single chrome · /dev isolation · 390/1440 + 2560/3440/3840 overflow · axe REL-012 · missing money ≠ 0 · /profits nav · production URL 0) |
| acquisition-release | REL-101 — **live** (Canon signup/login/profile wired to Nest SDK · Kakao live NOT_RUN · PendingFigma 0) |
| login-kakao-closure | REL-102 — **live** (login session/magic-link · LIVE_KAKAO_HUMAN_E2E=NOT_RUN 위조 0) |
| complete-profile-closure | REL-103 — **live** (Stage B PATCH · gender 0) |
| onboarding-journey-closure | REL-104 — **live** (experiential OnboardingFlow · demo label · deposit funnel 0) |
| settlement-rule-parity | REL-008 — **live** (`settlement_rule.rs` == `settlement_rule.cjs` on golden vectors · T0 path + T1 · `cargo build --release` 0 · REL-502 대체 0) |
| engine-acceptance | 02.5 PRE-UI Engine Acceptance QA — QA-0..QA-6 **live** (`governance/engine-acceptance/**` · Dual Dirty baseline · severity 선고정 · kill-switch before tiny-smoke/QA1..QA6 · schemas+routes · DB consistency · idempotency INV-01/03 분리 · personas×journeys×coverage · Dirty>Happy · isolation interleave/token_cross/IDOR · seed+rng+clock+request_seq evidence · QA3 fast-check · QA4 multi-day+KST · `BLOCKED_NO_CLOCK_HOOK` · QA5 Failure World 축1 degradation/fallback + 축2 post-recovery · `BLOCKED_NO_FAULT_HOOK` · QA6 k6 scenario mix + tag threshold 메커니즘 · `UNSPECIFIED_PERF_BUDGET`(수치 SLO 창작 금지) · CI-only heavy · aggregator `if: always()` · artifact retention ≥90d · 실패=rich evidence+defects(제품수정0) · KPI 케이스수 금지 · REPORT · `ENGINE_ACCEPTED_FOR_UI` 발급 금지 until QA1..QA8) · heavy suites = `.github/workflows/engine-acceptance.yml` only (T2 gate 편입 금지) · path-trigger |
| mockup-governance · canon-surfaces · brand-assets · brand-logo-single | UI ADR-013/011 — **live** (photo mockup 0 · Canon wire checklist · Admin owns execution-policy · single Brand Kit · Visual Contract/Approved Visual Master 예외 = `visual-master-intake.mdc`+`visual-locks.v1.json`) |
| asset-image-surface · execution-surfaces | Engine §0.0.6 · UI §48.3a — category thumb · `시세 불러오는 중...` (v7.22.20) — **asset-image-surface live** (hydrate·SKU1:1·공개가드·R2·Admin tab=assets · Canon4면) · **execution-surfaces live** (Canon library 3면 유지 · 프로덕션 execute = TradeExecuteClient · 레거시 AiProgressRoom remount 0) |
| trade-execution-hook | UI §29.6/§30 · Engine §0.9.2 — `useTradeExecution` Phase0=`POST …/execute-tick` polling · Phase1+ SSE swap inside hook only · StreamPolicy `executionTickMs` · execute page wire — **live** |
| product-image | UI audit §26/§37 · PART3 — source-agnostic `ProductImage` (`ebay`\|`pokemontcg`\|`ygoprodeck`\|`admin_r2`) · loading/loaded/error/missing · `sizes`/lazy/priority · `ProductThumb` · next remotePatterns — **live** |
| trading-card-vertical | Engine §0.0 / §51.12 — trading_card 시드20~40 · pokemontcg/ygoprodeck 메타 · ebay 호가 · 등급매칭 · 소액 SKU · Admin gradeMismatch 배지 — **live** |
| luxury-bag-vertical | Engine §0.0 — luxury_bag 시드10~25 · Asset Master admin_r2 이미지 · ebay 멀티\|admin 호가 · brand+model 매칭 · 필터칩 `가방` — **live** |
| ultra-watch-whale | Engine §0.0 — watch 시드40~80 · PP/AP/Rolex · whale≥100k Ultra 경로 · Day-1 카탈로그 소액공존(≥40%) · brand+reference 매칭 · 필터칩 `시계` — **live** |
| balance-aware-feed | Engine §0.0.5.1 · Money §49.2a · UI §5.3a — **live** (Engine classify affordable/nearMiss/lockedHigh · suggestDeposit ceil_to_tick · nearMissCap=`execution-policy.feed.nearMissCapUsdt` · override hide 100% · Money suggest query·principal Fact·deposit prefill·feed invalidate · UI `T.feed`+BalanceAwareHome 슬롯 affordable/nearMiss/lockedHigh·입금 suggest CTA) |
| user-opportunity-feed | Engine §0.9 E-R3 — **live** (`GET /api/v1/opportunities(+/:id)` · `OpportunitiesUserController`≠admin · `OPPORTUNITY_USER_ROUTES` · `buildBalanceAwareFeedWithOverrides` · `executionPlatforms` 유저0 · `arbitrageTypeKo` DB pass-through · JWT session userId only) |
| participate-http | Engine §0.9 E-R4 · §48.13.1 — **live** (`POST /api/v1/opportunities/:id/participate` · P0b~P5 · `participate_requests`+`trade_executions` · idempotency · KYC0 · practice/circuit/principal · JWT session userId only · external HTTP 0) |
| execute-rule-loop | Engine §0.9 E-R5 · §48.13 — **live** (`GET/POST /api/v1/trades/:id(/execute-tick)` · Nest→`settlement_rule.cjs` · Soft60/Hard90/REQUEUE/MATCH_TIMEOUT · MATCH_SUCCESS→settlement journal · `SettlementCompletedFanout` 소비 · ticker/mission/demo Rule입력0 · FFI0 · Phase0 polling) |
| catalog-runtime-seed | Engine §0.9 E-R6 — **live** (Admin seed trading_card/luxury_bag/watch + ebay ingest-shaped listings→opportunities available≥1 · compareReady 일부 true · assetImageUrl 가드 · Day-1 ebay\|admin · amazon/yahoo INSERT 0 · `seed:catalog-runtime`) |
| ebay-identity-ingest | Engine §0.10 U15 — ebay ingest `query:*` → Asset Master exact match(watch/card/bag) · imageSource=ebay · i.ebayimg.com · unmatched Admin identity-review-queue · silent drop 0 · amazon/yahoo INSERT 0 — **live** |
| admin-user-opportunity-override | Admin §9.8.9 — 유저별 숨김/핀/마진 · ledger 불변 (v7.22.21) — **live** (DDL↔schema forceShow/pinOrder/marginPct/expectedProfit · Nest CRUD · merge · RBAC) |
| referral-unlimited-invites · referral-pool-fifo · referral-ledger · referral-ladder · referral-idempotency · share-copy | Money §51.5 — **live** 월간초대캡0 · Pool FIFO · clawback · 0원 rewardsEnabled · Admin growth?tab=referral · UI§5.9.1a pointer (v7.22.22) |
| invite-explain-surfaces | UI §5.9.1a — **live** (KR 20~70 설명·toneBand·noCap·Canon invite-home · Money §51.5 pointer) (v7.22.22) |
| match-strictness · no-success-rate-percent | Engine §48.13.3 · §0.9 E-R2 · UI §48.6 — 엄격도 조절 · 난수 성공률 0 (v7.22.23) — **live** (preset→policy 맵 스냅샷 · Soft60/Hard90 · Admin GET/PUT `/api/v1/admin/execution-policy` + stats/today readOnly · active-row seed/ensure `matchStrictness=standard`+`feed.nearMissCapUsdt` · ensure insert-only≠Admin PUT · goldens tight/lenient · successRatePercent 0) |
| membership-ladder · membership-daily-cap · no-fulfill-rate-as-rule | Engine §0.0.7 — 등급·일일캡 · fulfillRate≠Rule (v7.22.24) — **live** (ladder snapshot · 승급 max(입금,성공)·adminForce · overlay merge · participate 가드 · Admin `/users/:id` membership·match-policy · **GET `/api/v1/me/membership`** 유저 읽기(ladder·aiPerkFlags·fulfillRate 표시전용·Rule입력0) · fulfillRate 표시전용) |
| membership-surfaces | UI §5.9.2c · Canon membership-home — 100%보장0 · 고액희소 (v7.22.24) — **live** (MembershipHome·Badge·copy·GET `/me/membership` · Admin §9.8.10 pointer) |
| admin-user-credentials · admin-user-ban · admin-user-match-override | Admin §9.8.10 — 비번/PIN·밴·유저별엄격도 (v7.22.24) |
| admin-user-capability-block | Admin §9.8.4a — 매칭/출금신청 개별차단 (v7.22.25) |
| ops-inbox · notification-prefs-default-on | UI §5.9.4·§50.1n — 쪽지함 · 가입알림전부ON (v7.22.25) — **live** (OpsInbox·prefs signup ALL true·Admin ops-messages Nest·toast MATCH/WITHDRAW_BLOCK) |
| push-channel-prefs | PWA §23.5a — notice/campaign/opp prefs 필터 (v7.22.25) — **live** (REL-021 · E-PWA-003 · dispatcher enqueue 0 · 세 채널 격리) |
| membership-badge-assets | UI §5.9.2c — Brand membership SVG 5종 · 사진목업0 (v7.22.25) — **live** (`assets/membership/{sprout…vip}.svg` · manifest ready) |
| opportunity-scan-surface · arbitrage-type-label | UI §5.3b · Engine §4.2a — 홈기회스캔·타입뱃지 (v7.22.26) · arbitrage-type-label=**live** · opportunity-scan-surface=**live** (BalanceAwareHome·OpportunityCard·ScanBadge·PartnerTrustStrip/Leg·feed homeTitle/scanSub) |
| margin-compare-surface | UI §5.3 · Engine §0.0.4 — **PriceCompareMargin** 홈/상세/확인/영수증 4면 · compareReady 가드 · UI 재계산0 · **live** (컴포넌트+`tooling/verify/margin-compare-surface.cjs`+CATALOG 3종 세트) |
| cta-earn-profit · user-trader-jargon-0 | Index §20.2 · UI §48 · Engine §4.2b — 유저 CTA=`수익 벌기` · domain=`participate` · `이 상품으로…`/구매/판매/유저메인`매칭 참여`/판매성공률/executionPlatforms·expectedSellDays 유저0 · 대기Fact 소스가드 · INTERNAL↔USER 맵 · 면책+배지 (v7.22.28) · 구명 `cta-match-participate`=alias · **both live** |
| soft-hard-requeue-sla | Index §20.2 · Engine §48.13 · UI §48 — Soft60/Hard90 · `MATCH_TIMEOUT` · 카피3줄(보통1분/다시맞추는중/시간지나안전정지) · presentation≠SLA (v7.22.29) · Audit A4 · **copy/Canon live** |
| match-tension-surface | Index §20.2 · UI §48.3b — Soft/Hard전등급동일 · 긴장감=과정Fact · 등급≠대기특권 · slaAlmost/priceNearMiss · 난수틱·가짜대기·당첨게이지0 (v7.22.30) · Audit A6 · **copy/Canon live** |
| listing-legs-day1 | Engine §0.0.1a/§0.0.2 — ebay 멀티marketplace\|admin only · yahoo_jp Day-1 auto-publish FORBIDDEN · §38.10 partner 표기 OK(카피금지 supersede) · KR/Chrono24대체0 — **live** — **live** |
| signup-ready-adapters | Engine §0.0 — ebay 멀티marketplaceId · pokemontcg+ygoprodeck · coingecko+frankfurter · yahoo-jp경로0 · Phase1 deploy (phase0 0) · Admin `/admin/adapters` health — **live** |
| adapter-matching-kpi | Engine §51.12+§51.15 — 등급매칭·SKU실패율 KPI(>15%/24h 알림·자동공개축소) · compareReady false>40% 시드점검 · stale>TTL 적색 · Admin `/admin/adapters` KPI·알림 · yahoo0 · Simulation S4 `adapterMatchFailureRate` 선행 — **live** |
| kyc-withdraw-only · kyc-redirect · kyc-r2-only | Money §42 — **live** (출금1회게이트 · toast→/me/kyc@800ms · R2 kyc-docs private) |
| krw-admin-decide | Money §41.3·§43.3 — **live** approve credit1 / reject0 · TRC20 address · PG사0 · CSV=L2+ (v7.22.12) |
| deposit-confirm-stages · no-per-address-poll | Money §41·§43.1 — **live** 1conf UI/no ledger · 19conf deposit_usdt · single stream · Phase0 in-process · Phase1 deploy |
| sweeper-trx-guard | Money §43.2 — **live** Energy+TRX min→sweep 0 · Admin deposit-settings pause · Phase0 in-process ≠NATS |
| admin-user-360 | Admin §9.8.7·§9.8.8 — netInflowUsdt · 유저360 탭 · notify audit (v7.22.13) |
| match-success-rule | Engine §48.13.2 golden 6 · Soft60/Hard90 · REQUEUE/MATCH_TIMEOUT · P0b · random/timer 0 · presentation≠credit (v7.22.14) — **live** |
| pricing-formula · fx-snapshot-formula · market-intel-engine | Engine §0.0 / §0.0.4.1~4.2 — Asset Master·pipeline·FORBIDDEN0 · Admin opportunities §36 · yahoo_jp0 — **live** |
| capital-tier-catalog | Engine §0.0.5 — capitalBand enum·시드≥40%소액·필터칩·CONSTITUTION/46 · Admin opportunities 밴드필터 — **live** |
| referral-ledger · notice-campaign-split | Money/Marketing |
| loop-psychology · day-pulse-live-only · preflight-may-stop | UI **§51.24** DayPulse·PreCTA·L1~L24 (v7.22.15 Owns 복원) — **live** (DayPulse GET `/me/day-pulse` · PreCTA mayStop · Nest HMAC preflightToken · 412 PREFLIGHT_REQUIRED · G4 merge0 · presence default OFF · Canon day-pulse/preflight-confirm) |
| market-briefing-no-investment-advice · participate-proof · deposit-ai-template-path | UI **§51.16~21** PART8b — **live** (Proof/SafeStop/Journey/AdapterHealth/WeeklyMarketBriefing/DepositConsult · `/me/guide/market-weekly`+Canon · Nest proofHash SHA256 · Q2/Q4 template·LLM0 · 투자권유0) |
| ticker-mode-audit · ticker-pii-0 · ticker-organic-hybrid | Admin §35.4 Organic Hybrid G4 · UI §33.2a |
| market-partner-trust · market-partner-adapters | UI **§38.10** 공식협력 로고 · Engine **§0.0.1c** amazon/yahoo adapter Phase1+ (v7.22.41 Founder lock) — market-partner-adapters **live** · market-partner-trust **live** (Canon+copy+route+MarketPartner* · 7 SVGs `status=ready` · BLOCKER cleared · `MARKET_PARTNER_LOGOS_REQUIRE_READY=1` PASS) |
| brand-asset-provenance | UI **Redesign R1-2** `redesign-r1-home-brand-assets` Part A + `redesign-r1-home-visual-asset-production` Part B V2(ADR-018) — standalone/manual(**not** T0/T1/T2-wired · market-partner-trust와 동일 축) · Brand Kit+markets(+membership)+`assets/ai/home-v2` SHA-256/size/PNG dims·RGBA/SVG 원장 · home-v2 SVG root `width`/`height`/`viewBox` ↔ manifest dimensions · canonical↔`apps/web/public/brand` 미러 byte-diff · 중복 id/file/partnerId 스캔 · ADR-018 §13 legacy avatar/hero 비-authority + Part B `legacyUntouched` hash lock — **live** (2026-08-16 Part A 신설 · Part B V2 확장 · SVG root dim lock) |
| home-product-contract | UI **Redesign R1 H4** `redesign-r1-home-product-contract`(ADR-018 Functional Authority) — standalone/manual(**not** T0/T1/T2-wired) · `peotteok-home-product-contract.v1.md` 15섹션+5-taxonomy(MATCH/FUNCTIONAL_BINDING_REQUIRED/VISUAL_ONLY_EXAMPLE/NOT_SUPPORTED/FUNCTIONAL_BINDING_UNRESOLVED) 사용 확인 · governance 경계 마커(runtime0·fake binding0·H5/H6/H7 미착수) · Canon wire(home-visual-v2/home-principal-slots) cross-ref · Visual Master 예시 리터럴이 `apps/web`/`packages/ui` runtime에 하드코딩되지 않았는지 스캔 — **live** (2026-08-16 신설) |
| mission-auto-payout · mission-idempotency · mission-no-manual-grant · benefit-hub-surfaces · benefit-no-credits-currency · benefit-g4-ledger-separation | Money **§51.8a** · UI **§5.9.5** · Engine **§48.13.4** fanout0 · Admin **§35.7** (v7.22.42) — **live** SSOT · `benefit-hub-surfaces` = deep UI(BenefitHub Hero/Carousel/D·M·W·S)+Money GET+Credits0 (≠ API-only) |
| peotteok-chat · auth-complete-profile (canon) | UI §6.4b/e · canon-surfaces |
| auth-jwt-runtime | Infra §51.9 · ADR-006 — Engine Final Re-Verification Audit P0-1 (v7.22.50) — **live** (real HS256 sign/verify/tamper/expiry/issuer/audience round-trip against `jwt.core.cjs` + real Nest HTTP boot of `JwtAuthGuard` via `jwt-guard.selftest.ts` (no DB/Redis) + 6 session-protected controllers wired · AuthService fake-identity regression guard) |

**P0-2 (v7.22.50):** `user-opportunity-feed` · `participate-http` · `execute-rule-loop` · `catalog-runtime-seed` · `benefit-hub-surfaces` were implemented but never enforced by `verify:gate` (only reachable via manual `pnpm verify:<id>`). Now wired into `tooling/verify/stubs/run-all.cjs`'s `live` array alongside `auth-jwt-runtime` — a future regression in any of the six now fails CI, not just a one-time manual claim.

Stub = `tooling/verify/stubs/*.cjs` — 해당 코드 경로가 생기면 FAIL로 승격.
