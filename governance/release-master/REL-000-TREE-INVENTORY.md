# REL-000 TREE INVENTORY

```text
REL = REL-000
BRANCH = main
COLLECTED_AT = 2026-08-20T14:00:04.113Z
GIT_ADD_A_USED = FALSE
STAGED_COUNT = 0
SECRET_RISK_STAGED = 0
PRODUCT_CODE_MUTATED_BY_REL000 = FALSE
DB_MUTATION = FALSE
HOME_PLAN_READ = FALSE
```

Execution authority = `.cursor/plans/PUTDUK_RELEASE_MASTER.plan.md` only.
This file is the input table for REL-001. REL-001 must not `git add -A`.

## 1. Counts

| class | count |
|---|---|
| tracked-modified | 54 |
| untracked | 287 |
| secret-risk (worktree status) | 0 |
| tmp | 74 |
| plan-meta | 81 |
| recoverable (explicit flags) | 151 |
| other-work | 35 |
| protected-scope dirty | 17 |
| ignored secret-risk scan | 3 |
| inventory rows (untracked+modified+outputs) | 341 |

## 2. Secret-risk (path only · contents not read · EXCLUDE from any commit)

- `.cursor/secrets/github-ai-profit-os.pat` — EXCLUDE. Do not open, copy, or stage.
- `.cursor/secrets/github-clime.pat` — EXCLUDE. Do not open, copy, or stage.
- `.env` — EXCLUDE. Do not open, copy, or stage.

Notes:
- `.env` / `.cursor/secrets/*` are gitignored. REL-001 must keep them untracked.
- `.cursor/secrets/github-clime.pat` is a foreign-token filename inside this workspace. Isolation: do not read it, do not open any clime project, do not compare. EXCLUDE only.
- `.env.example` is a template (not listed as secret-risk).

## 3. Recoverable candidates (REL-001/002/003 input)

### home-freeze
- `.cursor/rules/home-presentation-freeze.mdc`
- `apps/web/app/HomeDesktopClient.tsx`
- `apps/web/app/page.tsx`
- `apps/web/components/spark-dash-home/assets.ts`
- `apps/web/components/spark-dash-home/format.ts`
- `apps/web/components/spark-dash-home/HomeDesktop.tsx`
- `apps/web/components/spark-dash-home/HomeMobile.tsx`
- `apps/web/components/spark-dash-home/map-runtime.ts`
- `apps/web/components/spark-dash-home/spark-dash-home.css`
- `apps/web/components/spark-dash-home/spark-dash-mobile.css`
- `apps/web/components/spark-dash-home/types.ts`
- `apps/web/components/spark-dash-home/visual-fixture.ts`
- `apps/web/scripts/freeze-home-qa.mjs`
- `governance/consumer-home-approval/baselines/approved-home-desktop-1280.png`
- `governance/consumer-home-approval/baselines/approved-home-desktop-1366.png`
- `governance/consumer-home-approval/baselines/approved-home-desktop-1440.png`
- `governance/consumer-home-approval/baselines/approved-home-desktop-1680.png`
- `governance/consumer-home-approval/baselines/approved-home-desktop-1920.png`
- `governance/consumer-home-approval/baselines/approved-home-mobile-320.png`
- `governance/consumer-home-approval/baselines/approved-home-mobile-360.png`
- `governance/consumer-home-approval/baselines/approved-home-mobile-375.png`
- `governance/consumer-home-approval/baselines/approved-home-mobile-390.png`
- `governance/consumer-home-approval/baselines/approved-home-mobile-412.png`
- `governance/consumer-home-approval/baselines/approved-home-mobile-430.png`
- `governance/consumer-home-approval/baselines/approved-home-mobile-ai.png`
- `governance/consumer-home-approval/baselines/approved-home-mobile-hero.png`
- `governance/consumer-home-approval/freeze-qa.v1.json`
- `governance/consumer-home-approval/home-approval-freeze.v1.json`

### spark-dash
- `apps/web/app/dev/spark-dash-desktop/page.tsx`
- `apps/web/app/dev/spark-dash-mobile/page.tsx`
- `apps/web/app/dev/spark-dash-profits/page.tsx`
- `apps/web/app/dev/spark-dash-profits/SparkDashProfitsPreviewClient.tsx`
- `apps/web/app/dev/spark-dash-room/SparkDashRoomPreviewClient.tsx`
- `apps/web/components/spark-dash-home/assets.ts`
- `apps/web/components/spark-dash-home/format.ts`
- `apps/web/components/spark-dash-home/HomeDesktop.tsx`
- `apps/web/components/spark-dash-home/HomeMobile.tsx`
- `apps/web/components/spark-dash-home/map-runtime.ts`
- `apps/web/components/spark-dash-home/spark-dash-home.css`
- `apps/web/components/spark-dash-home/spark-dash-mobile.css`
- `apps/web/components/spark-dash-home/types.ts`
- `apps/web/components/spark-dash-home/visual-fixture.ts`
- `apps/web/components/spark-dash-profits/map-runtime.ts`
- `apps/web/components/spark-dash-profits/OpportunityCard.tsx`
- `apps/web/components/spark-dash-profits/OpportunityCompareGuide.tsx`
- `apps/web/components/spark-dash-profits/OpportunityGrid.tsx`
- `apps/web/components/spark-dash-profits/OpportunityMedia.tsx`
- `apps/web/components/spark-dash-profits/OpportunityMetrics.tsx`
- `apps/web/components/spark-dash-profits/OpportunityToolbar.tsx`
- `apps/web/components/spark-dash-profits/ProfitsDesktop.tsx`
- `apps/web/components/spark-dash-profits/ProfitsDiscoveryHeader.tsx`
- `apps/web/components/spark-dash-profits/ProfitsMobile.tsx`
- `apps/web/components/spark-dash-profits/ProfitsShell.tsx`
- `apps/web/components/spark-dash-profits/spark-dash-profits-mobile.css`
- `apps/web/components/spark-dash-profits/spark-dash-profits.css`
- `apps/web/components/spark-dash-profits/types.ts`
- `apps/web/components/spark-dash-profits/visual-fixture.ts`
- `apps/web/components/spark-dash-room/OpportunityRoomMedia.tsx`
- `apps/web/components/spark-dash-room/OpportunityRoomMobile.tsx`
- `apps/web/components/spark-dash-room/spark-dash-room-mobile.css`
- `apps/web/public/spark-dash/ai-eye-right.svg`
- `apps/web/public/spark-dash/ai-orb.svg`
- `apps/web/public/spark-dash/ai-pink-glow.svg`
- `apps/web/public/spark-dash/ai-ring.svg`
- `apps/web/public/spark-dash/ambient-glow.svg`
- `apps/web/public/spark-dash/avatar-body.svg`
- `apps/web/public/spark-dash/avatar-face.svg`
- `apps/web/public/spark-dash/avatar-online.svg`
- `apps/web/public/spark-dash/brand-spark.svg`
- `apps/web/public/spark-dash/energy-bloom-1.svg`
- `apps/web/public/spark-dash/energy-bloom-2.svg`
- `apps/web/public/spark-dash/energy-bloom-3.svg`
- `apps/web/public/spark-dash/energy-streaks.svg`
- `apps/web/public/spark-dash/header-bell.svg`
- `apps/web/public/spark-dash/header-signal.svg`
- `apps/web/public/spark-dash/headline-spark.svg`
- `apps/web/public/spark-dash/hero-halo.svg`
- `apps/web/public/spark-dash/hero-lightning-neon.svg`
- `apps/web/public/spark-dash/hero-lightning-outline.svg`
- `apps/web/public/spark-dash/hero-lightning-raster.png`
- `apps/web/public/spark-dash/hero-lightning.svg`
- `apps/web/public/spark-dash/icon-bell.svg`
- `apps/web/public/spark-dash/icon-home.svg`
- `apps/web/public/spark-dash/icon-opportunity.svg`
- `apps/web/public/spark-dash/icon-partner.svg`
- `apps/web/public/spark-dash/icon-settings.svg`
- `apps/web/public/spark-dash/icon-wallet.svg`
- `apps/web/public/spark-dash/mini-spark.svg`
- `apps/web/public/spark-dash/mobile-ai-agent.svg`
- `apps/web/public/spark-dash/mobile-ai-orb.svg`
- `apps/web/public/spark-dash/mobile-brand-spark.svg`
- `apps/web/public/spark-dash/mobile-hero-energy.svg`
- `apps/web/public/spark-dash/mobile-hero-lightning.svg`
- `apps/web/public/spark-dash/mobile-icon-clock.svg`
- `apps/web/public/spark-dash/mobile-icon-explore.svg`
- `apps/web/public/spark-dash/mobile-icon-home.svg`
- `apps/web/public/spark-dash/mobile-icon-lightning.svg`
- `apps/web/public/spark-dash/mobile-icon-nav-bell.svg`
- `apps/web/public/spark-dash/mobile-icon-nav-explore.svg`
- `apps/web/public/spark-dash/mobile-icon-nav-wallet.svg`
- `apps/web/public/spark-dash/mobile-icon-notification.svg`
- `apps/web/public/spark-dash/mobile-icon-trend.svg`
- `apps/web/public/spark-dash/mobile-icon-trophy.svg`
- `apps/web/public/spark-dash/mobile-icon-wallet.svg`
- `apps/web/public/spark-dash/mobile-product-sneaker.png`
- `apps/web/public/spark-dash/opportunity-energy.png`
- `apps/web/public/spark-dash/product-sneaker-cutout.png`
- `apps/web/public/spark-dash/product-sneaker-hero.png`
- `apps/web/public/spark-dash/product-sneaker-mask.svg`
- `apps/web/public/spark-dash/product-sneaker-source.png`
- `apps/web/public/spark-dash/product-sneaker.png`
- `apps/web/public/spark-dash/spark-mark.svg`
- `apps/web/scripts/capture-spark-dash-desktop.mjs`
- `apps/web/scripts/capture-spark-dash-home-regression.mjs`
- `apps/web/scripts/capture-spark-dash-hotfix.mjs`
- `apps/web/scripts/capture-spark-dash-mobile-polish.mjs`
- `apps/web/scripts/capture-spark-dash-mobile-scroll.mjs`
- `apps/web/scripts/capture-spark-dash-mobile.mjs`
- `apps/web/scripts/capture-spark-dash-profile-hotfix.mjs`
- `apps/web/scripts/capture-spark-dash-profits-runtime.mjs`
- `apps/web/scripts/capture-spark-dash-profits-states.mjs`
- `apps/web/scripts/capture-spark-dash-profits.mjs`
- `apps/web/scripts/download-spark-dash-assets.mjs`
- `apps/web/scripts/download-spark-dash-mobile-assets.mjs`
- `apps/web/scripts/overlay-spark-dash.mjs`

### opportunities
- `services/api-nest/src/opportunities/catalog-runtime-seed.service.ts`
- `services/api-nest/src/opportunities/index.ts`
- `services/api-nest/src/opportunities/opportunities.admin.service.ts`
- `services/api-nest/src/opportunities/opportunities.mi.ts`
- `services/api-nest/src/opportunities/opportunities.module.ts`
- `services/api-nest/src/opportunities/opportunity-reprice.service.ts`

### opportunity-reprice
- `services/api-nest/src/opportunities/opportunity-reprice.service.ts`

### migrations
- `supabase/migrations/20260819210000_source_observations.sql`
- `supabase/migrations/20260819220000_canonical_products.sql`
- `supabase/migrations/20260820013000_match_results.sql`

### profits-ui
- `apps/web/app/profits/[id]/OpportunityDetailClient.tsx`
- `apps/web/app/profits/page.tsx`
- `apps/web/components/spark-dash-profits/map-runtime.ts`
- `apps/web/components/spark-dash-profits/OpportunityCard.tsx`
- `apps/web/components/spark-dash-profits/OpportunityCompareGuide.tsx`
- `apps/web/components/spark-dash-profits/OpportunityGrid.tsx`
- `apps/web/components/spark-dash-profits/OpportunityMedia.tsx`
- `apps/web/components/spark-dash-profits/OpportunityMetrics.tsx`
- `apps/web/components/spark-dash-profits/OpportunityToolbar.tsx`
- `apps/web/components/spark-dash-profits/ProfitsDesktop.tsx`
- `apps/web/components/spark-dash-profits/ProfitsDiscoveryHeader.tsx`
- `apps/web/components/spark-dash-profits/ProfitsMobile.tsx`
- `apps/web/components/spark-dash-profits/ProfitsShell.tsx`
- `apps/web/components/spark-dash-profits/spark-dash-profits-mobile.css`
- `apps/web/components/spark-dash-profits/spark-dash-profits.css`
- `apps/web/components/spark-dash-profits/types.ts`
- `apps/web/components/spark-dash-profits/visual-fixture.ts`

### execution-ssot
- `.cursor/plans/PUTDUK_RELEASE_MASTER.plan.md`

## 4. Protected-scope dirty (informational · REL-000 did not mutate these)

These paths sit under engine-acceptance protected roots. REL-000 did not edit them.
REL-003 / later REL must treat them as HIGH. If a later REL edits them unexpectedly, set `PROTECTED_SCOPE_MUTATION=TRUE`.

- `schemas/opportunity-card.v1.json` (tracked-modified)
- `services/api-nest/src/ledger/index.ts` (tracked-modified)
- `services/api-nest/src/ledger/ledger.module.ts` (tracked-modified)
- `services/api-nest/src/ledger/ledger.types.ts` (tracked-modified)
- `services/api-nest/src/ledger/ledger.user-journal.project.ts` (untracked)
- `services/api-nest/src/ledger/ledger.user-journal.service.ts` (untracked)
- `services/api-nest/src/opportunities/catalog-runtime-seed.service.ts` (tracked-modified)
- `services/api-nest/src/opportunities/index.ts` (tracked-modified)
- `services/api-nest/src/opportunities/opportunities.admin.service.ts` (tracked-modified)
- `services/api-nest/src/opportunities/opportunities.mi.ts` (tracked-modified)
- `services/api-nest/src/opportunities/opportunities.module.ts` (tracked-modified)
- `services/api-nest/src/opportunities/opportunity-reprice.service.ts` (untracked)
- `services/api-nest/src/wallet/wallet.controller.ts` (tracked-modified)
- `services/api-nest/src/wallet/wallet.routes.ts` (tracked-modified)
- `supabase/migrations/20260819210000_source_observations.sql` (untracked)
- `supabase/migrations/20260819220000_canonical_products.sql` (untracked)
- `supabase/migrations/20260820013000_match_results.sql` (untracked)

## 5. Full path table (every untracked + modified path exactly once)

| path | git | class | bucket | rel001 | flags | protected |
|---|---|---|---|---|---|---|
| .cursor/plans/_external_intake/02.5_engine_acceptance_qa_fd1cd7cc.plan.md | ?? | untracked | plan-meta | REVIEW | - | false |
| .cursor/plans/_external_intake/3ì¼_ui_ì°ì _ì¶ì_0d19fb61.plan.md | ?? | untracked | plan-meta | REVIEW | - | false |
| .cursor/plans/_external_intake/account_hub_figma_23be13c4.plan.md | ?? | untracked | plan-meta | REVIEW | - | false |
| .cursor/plans/_external_intake/ai_profit_pivot_docs_a2f2ebb9.plan.md | ?? | untracked | plan-meta | REVIEW | - | false |
| .cursor/plans/_external_intake/archive/2026-08-08T22-54-57-251Z__ai_profit_os_00_index_ssot.plan.md | ?? | untracked | plan-meta | REVIEW | - | false |
| .cursor/plans/_external_intake/archive/2026-08-08T22-54-57-281Z__ai_profit_os_01_engine.plan.md | ?? | untracked | plan-meta | REVIEW | - | false |
| .cursor/plans/_external_intake/archive/2026-08-08T22-54-57-283Z__ai_profit_os_01_engine_b2c3d4e5.plan.md | ?? | untracked | plan-meta | REVIEW | - | false |
| .cursor/plans/_external_intake/archive/2026-08-08T22-54-57-285Z__ai_profit_os_02_money_c3d4e5f6.plan.md | ?? | untracked | plan-meta | REVIEW | - | false |
| .cursor/plans/_external_intake/archive/2026-08-08T22-54-57-285Z__ai_profit_os_02_money_chain.plan.md | ?? | untracked | plan-meta | REVIEW | - | false |
| .cursor/plans/_external_intake/archive/2026-08-08T22-54-57-288Z__ai_profit_os_03_ui_ux.plan.md | ?? | untracked | plan-meta | REVIEW | - | false |
| .cursor/plans/_external_intake/archive/2026-08-08T22-54-57-300Z__ai_profit_os_04_admin_ops.plan.md | ?? | untracked | plan-meta | REVIEW | - | false |
| .cursor/plans/_external_intake/archive/2026-08-08T22-54-57-301Z__ai_profit_os_05_pwa_native.plan.md | ?? | untracked | plan-meta | REVIEW | - | false |
| .cursor/plans/_external_intake/archive/2026-08-08T22-54-57-302Z__ai_profit_os_06_infra_marketing.plan.md | ?? | untracked | plan-meta | REVIEW | - | false |
| .cursor/plans/_external_intake/archive/2026-08-11T21-51-48-774Z__02.5_engine_acceptance_qa_fd1cd7cc.plan.md | ?? | untracked | plan-meta | REVIEW | - | false |
| .cursor/plans/_external_intake/canonical_identity_v2_41da485f.plan.md | ?? | untracked | plan-meta | REVIEW | - | false |
| .cursor/plans/_external_intake/canonical_identity_v2_662a1fcc.plan.md | ?? | untracked | plan-meta | REVIEW | - | false |
| .cursor/plans/_external_intake/canonical_pd_durable_persistence_4af948dc.plan.md | ?? | untracked | plan-meta | REVIEW | - | false |
| .cursor/plans/_external_intake/canonical_product_pd_id_6f82b50e.plan.md | ?? | untracked | plan-meta | REVIEW | - | false |
| .cursor/plans/_external_intake/chrono24_observation_slice_2e325fd3.plan.md | ?? | untracked | plan-meta | REVIEW | - | false |
| .cursor/plans/_external_intake/ebay_observation_bridge_46408cad.plan.md | ?? | untracked | plan-meta | REVIEW | - | false |
| .cursor/plans/_external_intake/ebay_pair_source_select_9e7f8ca9.plan.md | ?? | untracked | plan-meta | REVIEW | - | false |
| .cursor/plans/_external_intake/engine_final_re-verification_audit_15069cca.plan.md | ?? | untracked | plan-meta | REVIEW | - | false |
| .cursor/plans/_external_intake/EXCLUSION_REGISTRY.json | ?? | untracked | plan-meta | REVIEW | - | false |
| .cursor/plans/_external_intake/EXECUTION_AUTHORITY.json | ?? | untracked | plan-meta | REVIEW | - | false |
| .cursor/plans/_external_intake/fashionphile_identity_forensic_a9a039d7.plan.md | ?? | untracked | plan-meta | REVIEW | - | false |
| .cursor/plans/_external_intake/GLOBAL_DISCOVERY_SUMMARY.json | ?? | untracked | plan-meta | REVIEW | - | false |
| .cursor/plans/_external_intake/global_observation_runtime_d6c3eb9c.plan.md | ?? | untracked | plan-meta | REVIEW | - | false |
| .cursor/plans/_external_intake/greenfield_frontend_reset_b5d39a4c.plan.md | ?? | untracked | plan-meta | REVIEW | - | false |
| .cursor/plans/_external_intake/hc6-08_binding_pass1_e28aa3ad.plan.md | ?? | untracked | plan-meta | REVIEW | - | false |
| .cursor/plans/_external_intake/hc6-08_c_impl_plan_d235b8bd.plan.md | ?? | untracked | plan-meta | REVIEW | - | false |
| .cursor/plans/_external_intake/hc6-08_fx_architecture_f3495a7a.plan.md | ?? | untracked | plan-meta | REVIEW | - | false |
| .cursor/plans/_external_intake/hc6-08_krw_approx_1a593a15.plan.md | ?? | untracked | plan-meta | REVIEW | - | false |
| .cursor/plans/_external_intake/heygen_korean_test_de97a481.plan.md | ?? | untracked | plan-meta | REVIEW | - | false |
| .cursor/plans/_external_intake/HOME_TODO_TRACEABILITY.json | ?? | untracked | plan-meta | REVIEW | - | false |
| .cursor/plans/_external_intake/home_visual_lock_875124f2.plan.md | ?? | untracked | plan-meta | REVIEW | - | false |
| .cursor/plans/_external_intake/homecleanv1_clean-room_a7760b61.plan.md | ?? | untracked | plan-meta | REVIEW | - | false |
| .cursor/plans/_external_intake/ì§ê°_ì¸ê³1í°ì´_ìì´ëì´_34db674f.plan.md | ?? | untracked | plan-meta | REVIEW | - | false |
| .cursor/plans/_external_intake/í¼ë©_03_ui_ux_master_plan_be3fa3cc.plan.md | ?? | untracked | plan-meta | REVIEW | - | false |
| .cursor/plans/_external_intake/í¼ë©_master_architecture_65b4f0e4.plan.md | ?? | untracked | plan-meta | REVIEW | - | false |
| .cursor/plans/_external_intake/identity_matching_v1_e9f60503.plan.md | ?? | untracked | plan-meta | REVIEW | - | false |
| .cursor/plans/_external_intake/íë«í¼_ì ì²´_ì¬ì¤ê³_ë¡ëë§µ_d903eef7.plan.md | ?? | untracked | plan-meta | REVIEW | - | false |
| .cursor/plans/_external_intake/INTAKE_MANIFEST.json | ?? | untracked | plan-meta | REVIEW | - | false |
| .cursor/plans/_external_intake/local_test_db_proof_b2e31074.plan.md | ?? | untracked | plan-meta | REVIEW | - | false |
| .cursor/plans/_external_intake/matching_v2_pairwise_a234ee50.plan.md | ?? | untracked | plan-meta | REVIEW | - | false |
| .cursor/plans/_external_intake/mobile-home-polish_d1b87678.plan.md | ?? | untracked | plan-meta | REVIEW | - | false |
| .cursor/plans/_external_intake/opportunity_reprice_lifecycle_a5272af5.plan.md | ?? | untracked | plan-meta | REVIEW | - | false |
| .cursor/plans/_external_intake/parallel_consumer_ui_figma_a10ef910.plan.md | ?? | untracked | plan-meta | REVIEW | - | false |
| .cursor/plans/_external_intake/pc_home_ë°ì¤í¬í±_ê·¸ë¦¬ë_ì¬ì¤ê³_3557c4d1.plan.md | ?? | untracked | plan-meta | REVIEW | - | false |
| .cursor/plans/_external_intake/peotteok_ai_coach_hardening_v1_2969f0aa.plan.md | ?? | untracked | plan-meta | REVIEW | - | false |
| .cursor/plans/_external_intake/plan_a645a0ad.plan.md | ?? | untracked | plan-meta | REVIEW | - | false |
| .cursor/plans/_external_intake/plan_finish_order_8d0ab09d.plan.md | ?? | untracked | plan-meta | REVIEW | - | false |
| .cursor/plans/_external_intake/profits_real_integration_b4a78f72.plan.md | ?? | untracked | plan-meta | REVIEW | - | false |
| .cursor/plans/_external_intake/putduk_release_master_ff3a5134.plan.md | ?? | untracked | plan-meta | REVIEW | - | false |
| .cursor/plans/_external_intake/r0_í¡ì_ë°ì_íë_eaebafd6.plan.md | ?? | untracked | plan-meta | REVIEW | - | false |
| .cursor/plans/_external_intake/README.md | ?? | untracked | plan-meta | REVIEW | - | false |
| .cursor/plans/_external_intake/so_db_runtime_proof_9f3b7b50.plan.md | ?? | untracked | plan-meta | REVIEW | - | false |
| .cursor/plans/_external_intake/so_durable_persistence_175f41f3.plan.md | ?? | untracked | plan-meta | REVIEW | - | false |
| .cursor/plans/_external_intake/TEMP_ALLOWLIST_WORK_COMPLETE.md | ?? | untracked | plan-meta | REVIEW | - | false |
| .cursor/plans/_external_intake/ui_live_wiring_part9_a6643cf7.plan.md | ?? | untracked | plan-meta | REVIEW | - | false |
| .cursor/plans/_external_intake/v2_corroboration_fix_9918eb0e.plan.md | ?? | untracked | plan-meta | REVIEW | - | false |
| .cursor/plans/_external_intake/v2_real_pair_validation_306b7a96.plan.md | ?? | untracked | plan-meta | REVIEW | - | false |
| .cursor/plans/_external_intake/wallet_figma_26_e617909c.plan.md | ?? | untracked | plan-meta | REVIEW | wallet-ui | false |
| .cursor/plans/_external_intake/wallet_master_contract_e889ee56.plan.md | ?? | untracked | plan-meta | REVIEW | wallet-ui | false |
| .cursor/plans/ai_profit_os_00_index_a1b2c3d4.plan.md |  M | tracked-modified | plan-meta | INCLUDE_CANDIDATE | - | false |
| .cursor/plans/ai_profit_os_04_admin_e5f6a7b8.plan.md |  M | tracked-modified | plan-meta | INCLUDE_CANDIDATE | - | false |
| .cursor/plans/ai_profit_os_05_pwa_f6a7b8c9.plan.md |  M | tracked-modified | plan-meta | INCLUDE_CANDIDATE | - | false |
| .cursor/plans/ai_profit_os_ebay_source_observation_bridge.plan.md | ?? | untracked | plan-meta | INCLUDE_CANDIDATE | - | false |
| .cursor/plans/ai_profit_os_global_observation_chrono24.plan.md | ?? | untracked | plan-meta | INCLUDE_CANDIDATE | - | false |
| .cursor/plans/ai_profit_os_global_observation_parser_runtime.plan.md | ?? | untracked | plan-meta | INCLUDE_CANDIDATE | - | false |
| .cursor/plans/ai_profit_os_launch_54c1261e.plan.md |  M | tracked-modified | plan-meta | INCLUDE_CANDIDATE | - | false |
| .cursor/plans/ai_profit_os_opportunity_reprice_freshness.plan.md | ?? | untracked | plan-meta | INCLUDE_CANDIDATE | - | false |
| .cursor/plans/PUTDUK_CURRENT_MASTER_TRACK_B_user_profit_loop.plan.md |  M | tracked-modified | plan-meta | INCLUDE_CANDIDATE | - | false |
| .cursor/plans/PUTDUK_CURRENT_MASTER_TRACK_D_admin_control_plane.plan.md | ?? | untracked | plan-meta | INCLUDE_CANDIDATE | - | false |
| .cursor/plans/PUTDUK_CURRENT_MASTER_TRACK_E_pwa.plan.md | ?? | untracked | plan-meta | INCLUDE_CANDIDATE | - | false |
| .cursor/plans/PUTDUK_CURRENT_MASTER_TRACK_F_production_infra.plan.md | ?? | untracked | plan-meta | INCLUDE_CANDIDATE | - | false |
| .cursor/plans/PUTDUK_CURRENT_MASTER_TRACK_G_growth.plan.md | ?? | untracked | plan-meta | INCLUDE_CANDIDATE | - | false |
| .cursor/plans/PUTDUK_CURRENT_MASTER.plan.md | ?? | untracked | plan-meta | INCLUDE_CANDIDATE | - | false |
| .cursor/plans/putduk_release_master_ff3a5134.plan.md | ?? | untracked | plan-meta | INCLUDE_CANDIDATE | - | false |
| .cursor/plans/PUTDUK_RELEASE_MASTER.plan.md | ?? | untracked | plan-meta | INCLUDE_CANDIDATE | execution-ssot | false |
| .cursor/rules/greenfield-ui.mdc |  M | tracked-modified | other-work | REVIEW | - | false |
| .cursor/rules/home-presentation-freeze.mdc | ?? | untracked | recoverable | INCLUDE_CANDIDATE | home-freeze | false |
| .cursor/rules/phase0-ram.mdc |  M | tracked-modified | other-work | REVIEW | - | false |
| .cursor/tmp/_audit_git_status_full.txt | ?? | untracked | tmp | EXCLUDE | - | false |
| .cursor/tmp/_audit_master_lock.mjs | ?? | untracked | tmp | EXCLUDE | - | false |
| .cursor/tmp/_audit_plan_todos_break.mjs | ?? | untracked | tmp | EXCLUDE | - | false |
| .cursor/tmp/_audit_plan_todos_detail.mjs | ?? | untracked | tmp | EXCLUDE | - | false |
| .cursor/tmp/_audit_plan_todos_full.mjs | ?? | untracked | tmp | EXCLUDE | - | false |
| .cursor/tmp/_audit_plan_todos_ids.mjs | ?? | untracked | tmp | EXCLUDE | - | false |
| .cursor/tmp/_audit_plan_todos.mjs | ?? | untracked | tmp | EXCLUDE | - | false |
| .cursor/tmp/_audit_scope_drift.txt | ?? | untracked | tmp | EXCLUDE | - | false |
| .cursor/tmp/_build_discovery_evidence.mjs | ?? | untracked | tmp | EXCLUDE | - | false |
| .cursor/tmp/_classify_home_plans_pass2.mjs | ?? | untracked | tmp | EXCLUDE | - | false |
| .cursor/tmp/_classify_home_plans.mjs | ?? | untracked | tmp | EXCLUDE | - | false |
| .cursor/tmp/_copy_intake.mjs | ?? | untracked | tmp | EXCLUDE | - | false |
| .cursor/tmp/_discovery_classify.json | ?? | untracked | tmp | EXCLUDE | - | false |
| .cursor/tmp/_home_plans_inventory.json | ?? | untracked | tmp | EXCLUDE | - | false |
| .cursor/tmp/_intake_todos.json | ?? | untracked | tmp | EXCLUDE | - | false |
| .cursor/tmp/_materialize_release_master_rest.mjs | ?? | untracked | tmp | EXCLUDE | - | false |
| .cursor/tmp/_materialize_release_master.mjs | ?? | untracked | tmp | EXCLUDE | - | false |
| .cursor/tmp/_parse_intake_todos.mjs | ?? | untracked | tmp | EXCLUDE | - | false |
| .cursor/tmp/_plan_todos_audit.json | ?? | untracked | tmp | EXCLUDE | - | false |
| .cursor/tmp/_plan_todos_break.json | ?? | untracked | tmp | EXCLUDE | - | false |
| .cursor/tmp/_plan_todos_detail.json | ?? | untracked | tmp | EXCLUDE | - | false |
| .cursor/tmp/_plan_todos_full_audit.json | ?? | untracked | tmp | EXCLUDE | - | false |
| .cursor/tmp/_prev_discovery_home_only.txt | ?? | untracked | tmp | EXCLUDE | - | false |
| .cursor/tmp/_rel000_cached_stat.txt | ?? | untracked | tmp | EXCLUDE | - | false |
| .cursor/tmp/_rel000_classify.mjs | ?? | untracked | tmp | EXCLUDE | - | false |
| .cursor/tmp/_rel000_diff_stat.txt | ?? | untracked | tmp | EXCLUDE | - | false |
| .cursor/tmp/_rel000_independent_verify.mjs | ?? | untracked | tmp | EXCLUDE | - | false |
| .cursor/tmp/_rel000_status_all.txt | ?? | untracked | tmp | EXCLUDE | - | false |
| .cursor/tmp/_rel000_verify.json | ?? | untracked | tmp | EXCLUDE | - | false |
| .cursor/tmp/_validate_release_master.json | ?? | untracked | tmp | EXCLUDE | - | false |
| .cursor/tmp/_validate_release_master.mjs | ?? | untracked | tmp | EXCLUDE | - | false |
| .cursor/tmp/cux-001-time-fix-full.png | ?? | untracked | tmp | EXCLUDE | - | false |
| .cursor/tmp/cux-003-cta.png | ?? | untracked | tmp | EXCLUDE | - | false |
| .cursor/tmp/cux-003-desktop-regression-1440.png | ?? | untracked | tmp | EXCLUDE | - | false |
| .cursor/tmp/cux-003-device.png | ?? | untracked | tmp | EXCLUDE | - | false |
| .cursor/tmp/cux-003-device2.png | ?? | untracked | tmp | EXCLUDE | - | false |
| .cursor/tmp/cux-003-founder-fix-390x693.png | ?? | untracked | tmp | EXCLUDE | - | false |
| .cursor/tmp/cux-003-founder-fix-desktop-1440.png | ?? | untracked | tmp | EXCLUDE | - | false |
| .cursor/tmp/cux-003-founder-fix-report.json | ?? | untracked | tmp | EXCLUDE | - | false |
| .cursor/tmp/cux-003-founder-fix-scrolled.png | ?? | untracked | tmp | EXCLUDE | - | false |
| .cursor/tmp/cux-003-header.png | ?? | untracked | tmp | EXCLUDE | - | false |
| .cursor/tmp/cux-003-identity.png | ?? | untracked | tmp | EXCLUDE | - | false |
| .cursor/tmp/cux-003-identity2.png | ?? | untracked | tmp | EXCLUDE | - | false |
| .cursor/tmp/cux-003-impl-390x693.png | ?? | untracked | tmp | EXCLUDE | - | false |
| .cursor/tmp/cux-003-impl-scrolled.png | ?? | untracked | tmp | EXCLUDE | - | false |
| .cursor/tmp/cux-003-mobile-final-390x693.png | ?? | untracked | tmp | EXCLUDE | - | false |
| .cursor/tmp/cux-003-room-mobile-report.json | ?? | untracked | tmp | EXCLUDE | - | false |
| .cursor/tmp/cux-003-room-mobile.png | ?? | untracked | tmp | EXCLUDE | - | false |
| .cursor/tmp/cux-003-scroll.png | ?? | untracked | tmp | EXCLUDE | - | false |
| .cursor/tmp/cux-003-wrap.png | ?? | untracked | tmp | EXCLUDE | - | false |
| .cursor/tmp/cux-003-wrap2.png | ?? | untracked | tmp | EXCLUDE | - | false |
| .cursor/tmp/cux-004-card-1.png | ?? | untracked | tmp | EXCLUDE | - | false |
| .cursor/tmp/cux-004-card-2.png | ?? | untracked | tmp | EXCLUDE | - | false |
| .cursor/tmp/cux-004-card2-check.png | ?? | untracked | tmp | EXCLUDE | - | false |
| .cursor/tmp/cux-004-card2-full.png | ?? | untracked | tmp | EXCLUDE | - | false |
| .cursor/tmp/cux-004-empty-1.png | ?? | untracked | tmp | EXCLUDE | - | false |
| .cursor/tmp/cux-004-empty-2.png | ?? | untracked | tmp | EXCLUDE | - | false |
| .cursor/tmp/cux-004-fix-card1-2.png | ?? | untracked | tmp | EXCLUDE | - | false |
| .cursor/tmp/cux-004-fix-card2-full.png | ?? | untracked | tmp | EXCLUDE | - | false |
| .cursor/tmp/cux-004-fix-empty-1.png | ?? | untracked | tmp | EXCLUDE | - | false |
| .cursor/tmp/cux-004-fix-main-1.png | ?? | untracked | tmp | EXCLUDE | - | false |
| .cursor/tmp/cux-004-fix-main-FINAL.png | ?? | untracked | tmp | EXCLUDE | - | false |
| .cursor/tmp/cux-004-main-1.png | ?? | untracked | tmp | EXCLUDE | - | false |
| .cursor/tmp/cux-004-main-2.png | ?? | untracked | tmp | EXCLUDE | - | false |
| .cursor/tmp/cux-004-main-3.png | ?? | untracked | tmp | EXCLUDE | - | false |
| .cursor/tmp/cux-004-main-4.png | ?? | untracked | tmp | EXCLUDE | - | false |
| .cursor/tmp/cux-004-main-final.png | ?? | untracked | tmp | EXCLUDE | - | false |
| .cursor/tmp/cux-004-skeleton-1.png | ?? | untracked | tmp | EXCLUDE | - | false |
| .cursor/tmp/cux-005-desktop-running.png | ?? | untracked | tmp | EXCLUDE | - | false |
| .cursor/tmp/cux-005-reduced-motion.png | ?? | untracked | tmp | EXCLUDE | - | false |
| .cursor/tmp/cux-005-requeue.png | ?? | untracked | tmp | EXCLUDE | - | false |
| .cursor/tmp/cux-005-running-final.png | ?? | untracked | tmp | EXCLUDE | - | false |
| .cursor/tmp/cux-005-running-step1.png | ?? | untracked | tmp | EXCLUDE | - | false |
| .cursor/tmp/cux-005-running-step2.png | ?? | untracked | tmp | EXCLUDE | - | false |
| .cursorindexingignore |  M | tracked-modified | other-work | REVIEW | - | false |
| .vscode/settings.json |  M | tracked-modified | other-work | REVIEW | - | false |
| AGENTS.md |  M | tracked-modified | other-work | REVIEW | - | false |
| apps/web/app/dev/spark-dash-desktop/page.tsx | ?? | untracked | recoverable | INCLUDE_CANDIDATE | spark-dash | false |
| apps/web/app/dev/spark-dash-mobile/page.tsx | ?? | untracked | recoverable | INCLUDE_CANDIDATE | spark-dash | false |
| apps/web/app/dev/spark-dash-profits/page.tsx | ?? | untracked | recoverable | INCLUDE_CANDIDATE | spark-dash | false |
| apps/web/app/dev/spark-dash-profits/SparkDashProfitsPreviewClient.tsx | ?? | untracked | recoverable | INCLUDE_CANDIDATE | spark-dash | false |
| apps/web/app/dev/spark-dash-room/SparkDashRoomPreviewClient.tsx |  M | tracked-modified | recoverable | INCLUDE_CANDIDATE | spark-dash | false |
| apps/web/app/globals.css |  M | tracked-modified | other-work | REVIEW | - | false |
| apps/web/app/HomeDesktopClient.tsx | ?? | untracked | recoverable | INCLUDE_CANDIDATE | home-freeze | false |
| apps/web/app/me/benefits/page.tsx |  M | tracked-modified | other-work | REVIEW | - | false |
| apps/web/app/me/events/page.tsx |  M | tracked-modified | other-work | REVIEW | - | false |
| apps/web/app/me/strategies/page.tsx |  M | tracked-modified | other-work | REVIEW | - | false |
| apps/web/app/page.tsx |  M | tracked-modified | recoverable | INCLUDE_CANDIDATE | home-freeze | false |
| apps/web/app/profits/[id]/OpportunityDetailClient.tsx |  M | tracked-modified | recoverable | INCLUDE_CANDIDATE | profits-ui | false |
| apps/web/app/profits/page.tsx |  M | tracked-modified | recoverable | INCLUDE_CANDIDATE | profits-ui | false |
| apps/web/app/ProfitsDesktopClient.tsx | ?? | untracked | other-work | REVIEW | - | false |
| apps/web/app/wallet/deposit/page.tsx |  M | tracked-modified | recoverable | INCLUDE_CANDIDATE | wallet-ui | false |
| apps/web/app/wallet/history/page.tsx |  M | tracked-modified | recoverable | INCLUDE_CANDIDATE | wallet-ui | false |
| apps/web/app/wallet/page.tsx |  M | tracked-modified | recoverable | INCLUDE_CANDIDATE | wallet-ui | false |
| apps/web/app/wallet/withdraw/krw/page.tsx |  M | tracked-modified | recoverable | INCLUDE_CANDIDATE | wallet-ui | false |
| apps/web/app/wallet/withdraw/page.tsx |  M | tracked-modified | recoverable | INCLUDE_CANDIDATE | wallet-ui | false |
| apps/web/app/wallet/withdraw/usdt/page.tsx |  M | tracked-modified | recoverable | INCLUDE_CANDIDATE | wallet-ui | false |
| apps/web/components/spark-dash-home/assets.ts | ?? | untracked | recoverable | INCLUDE_CANDIDATE | home-freeze,spark-dash | false |
| apps/web/components/spark-dash-home/format.ts | ?? | untracked | recoverable | INCLUDE_CANDIDATE | home-freeze,spark-dash | false |
| apps/web/components/spark-dash-home/HomeDesktop.tsx | ?? | untracked | recoverable | INCLUDE_CANDIDATE | home-freeze,spark-dash | false |
| apps/web/components/spark-dash-home/HomeMobile.tsx | ?? | untracked | recoverable | INCLUDE_CANDIDATE | home-freeze,spark-dash | false |
| apps/web/components/spark-dash-home/map-runtime.ts | ?? | untracked | recoverable | INCLUDE_CANDIDATE | home-freeze,spark-dash | false |
| apps/web/components/spark-dash-home/spark-dash-home.css | ?? | untracked | recoverable | INCLUDE_CANDIDATE | home-freeze,spark-dash | false |
| apps/web/components/spark-dash-home/spark-dash-mobile.css | ?? | untracked | recoverable | INCLUDE_CANDIDATE | home-freeze,spark-dash | false |
| apps/web/components/spark-dash-home/types.ts | ?? | untracked | recoverable | INCLUDE_CANDIDATE | home-freeze,spark-dash | false |
| apps/web/components/spark-dash-home/visual-fixture.ts | ?? | untracked | recoverable | INCLUDE_CANDIDATE | home-freeze,spark-dash | false |
| apps/web/components/spark-dash-profits/map-runtime.ts | ?? | untracked | recoverable | INCLUDE_CANDIDATE | spark-dash,profits-ui | false |
| apps/web/components/spark-dash-profits/OpportunityCard.tsx | ?? | untracked | recoverable | INCLUDE_CANDIDATE | spark-dash,profits-ui | false |
| apps/web/components/spark-dash-profits/OpportunityCompareGuide.tsx | ?? | untracked | recoverable | INCLUDE_CANDIDATE | spark-dash,profits-ui | false |
| apps/web/components/spark-dash-profits/OpportunityGrid.tsx | ?? | untracked | recoverable | INCLUDE_CANDIDATE | spark-dash,profits-ui | false |
| apps/web/components/spark-dash-profits/OpportunityMedia.tsx | ?? | untracked | recoverable | INCLUDE_CANDIDATE | spark-dash,profits-ui | false |
| apps/web/components/spark-dash-profits/OpportunityMetrics.tsx | ?? | untracked | recoverable | INCLUDE_CANDIDATE | spark-dash,profits-ui | false |
| apps/web/components/spark-dash-profits/OpportunityToolbar.tsx | ?? | untracked | recoverable | INCLUDE_CANDIDATE | spark-dash,profits-ui | false |
| apps/web/components/spark-dash-profits/ProfitsDesktop.tsx | ?? | untracked | recoverable | INCLUDE_CANDIDATE | spark-dash,profits-ui | false |
| apps/web/components/spark-dash-profits/ProfitsDiscoveryHeader.tsx | ?? | untracked | recoverable | INCLUDE_CANDIDATE | spark-dash,profits-ui | false |
| apps/web/components/spark-dash-profits/ProfitsMobile.tsx | ?? | untracked | recoverable | INCLUDE_CANDIDATE | spark-dash,profits-ui | false |
| apps/web/components/spark-dash-profits/ProfitsShell.tsx | ?? | untracked | recoverable | INCLUDE_CANDIDATE | spark-dash,profits-ui | false |
| apps/web/components/spark-dash-profits/spark-dash-profits-mobile.css | ?? | untracked | recoverable | INCLUDE_CANDIDATE | spark-dash,profits-ui | false |
| apps/web/components/spark-dash-profits/spark-dash-profits.css | ?? | untracked | recoverable | INCLUDE_CANDIDATE | spark-dash,profits-ui | false |
| apps/web/components/spark-dash-profits/types.ts | ?? | untracked | recoverable | INCLUDE_CANDIDATE | spark-dash,profits-ui | false |
| apps/web/components/spark-dash-profits/visual-fixture.ts | ?? | untracked | recoverable | INCLUDE_CANDIDATE | spark-dash,profits-ui | false |
| apps/web/components/spark-dash-room/OpportunityRoomMedia.tsx |  M | tracked-modified | recoverable | INCLUDE_CANDIDATE | spark-dash | false |
| apps/web/components/spark-dash-room/OpportunityRoomMobile.tsx | ?? | untracked | recoverable | INCLUDE_CANDIDATE | spark-dash | false |
| apps/web/components/spark-dash-room/spark-dash-room-mobile.css | ?? | untracked | recoverable | INCLUDE_CANDIDATE | spark-dash | false |
| apps/web/public/spark-dash/ai-eye-right.svg | ?? | untracked | recoverable | INCLUDE_CANDIDATE | spark-dash | false |
| apps/web/public/spark-dash/ai-orb.svg | ?? | untracked | recoverable | INCLUDE_CANDIDATE | spark-dash | false |
| apps/web/public/spark-dash/ai-pink-glow.svg | ?? | untracked | recoverable | INCLUDE_CANDIDATE | spark-dash | false |
| apps/web/public/spark-dash/ai-ring.svg | ?? | untracked | recoverable | INCLUDE_CANDIDATE | spark-dash | false |
| apps/web/public/spark-dash/ambient-glow.svg | ?? | untracked | recoverable | INCLUDE_CANDIDATE | spark-dash | false |
| apps/web/public/spark-dash/avatar-body.svg | ?? | untracked | recoverable | INCLUDE_CANDIDATE | spark-dash | false |
| apps/web/public/spark-dash/avatar-face.svg | ?? | untracked | recoverable | INCLUDE_CANDIDATE | spark-dash | false |
| apps/web/public/spark-dash/avatar-online.svg | ?? | untracked | recoverable | INCLUDE_CANDIDATE | spark-dash | false |
| apps/web/public/spark-dash/brand-spark.svg | ?? | untracked | recoverable | INCLUDE_CANDIDATE | spark-dash | false |
| apps/web/public/spark-dash/energy-bloom-1.svg | ?? | untracked | recoverable | INCLUDE_CANDIDATE | spark-dash | false |
| apps/web/public/spark-dash/energy-bloom-2.svg | ?? | untracked | recoverable | INCLUDE_CANDIDATE | spark-dash | false |
| apps/web/public/spark-dash/energy-bloom-3.svg | ?? | untracked | recoverable | INCLUDE_CANDIDATE | spark-dash | false |
| apps/web/public/spark-dash/energy-streaks.svg | ?? | untracked | recoverable | INCLUDE_CANDIDATE | spark-dash | false |
| apps/web/public/spark-dash/header-bell.svg | ?? | untracked | recoverable | INCLUDE_CANDIDATE | spark-dash | false |
| apps/web/public/spark-dash/header-signal.svg | ?? | untracked | recoverable | INCLUDE_CANDIDATE | spark-dash | false |
| apps/web/public/spark-dash/headline-spark.svg | ?? | untracked | recoverable | INCLUDE_CANDIDATE | spark-dash | false |
| apps/web/public/spark-dash/hero-halo.svg | ?? | untracked | recoverable | INCLUDE_CANDIDATE | spark-dash | false |
| apps/web/public/spark-dash/hero-lightning-neon.svg | ?? | untracked | recoverable | INCLUDE_CANDIDATE | spark-dash | false |
| apps/web/public/spark-dash/hero-lightning-outline.svg | ?? | untracked | recoverable | INCLUDE_CANDIDATE | spark-dash | false |
| apps/web/public/spark-dash/hero-lightning-raster.png | ?? | untracked | recoverable | INCLUDE_CANDIDATE | spark-dash | false |
| apps/web/public/spark-dash/hero-lightning.svg | ?? | untracked | recoverable | INCLUDE_CANDIDATE | spark-dash | false |
| apps/web/public/spark-dash/icon-bell.svg | ?? | untracked | recoverable | INCLUDE_CANDIDATE | spark-dash | false |
| apps/web/public/spark-dash/icon-home.svg | ?? | untracked | recoverable | INCLUDE_CANDIDATE | spark-dash | false |
| apps/web/public/spark-dash/icon-opportunity.svg | ?? | untracked | recoverable | INCLUDE_CANDIDATE | spark-dash | false |
| apps/web/public/spark-dash/icon-partner.svg | ?? | untracked | recoverable | INCLUDE_CANDIDATE | spark-dash | false |
| apps/web/public/spark-dash/icon-settings.svg | ?? | untracked | recoverable | INCLUDE_CANDIDATE | spark-dash | false |
| apps/web/public/spark-dash/icon-wallet.svg | ?? | untracked | recoverable | INCLUDE_CANDIDATE | spark-dash,wallet-ui | false |
| apps/web/public/spark-dash/mini-spark.svg | ?? | untracked | recoverable | INCLUDE_CANDIDATE | spark-dash | false |
| apps/web/public/spark-dash/mobile-ai-agent.svg | ?? | untracked | recoverable | INCLUDE_CANDIDATE | spark-dash | false |
| apps/web/public/spark-dash/mobile-ai-orb.svg | ?? | untracked | recoverable | INCLUDE_CANDIDATE | spark-dash | false |
| apps/web/public/spark-dash/mobile-brand-spark.svg | ?? | untracked | recoverable | INCLUDE_CANDIDATE | spark-dash | false |
| apps/web/public/spark-dash/mobile-hero-energy.svg | ?? | untracked | recoverable | INCLUDE_CANDIDATE | spark-dash | false |
| apps/web/public/spark-dash/mobile-hero-lightning.svg | ?? | untracked | recoverable | INCLUDE_CANDIDATE | spark-dash | false |
| apps/web/public/spark-dash/mobile-icon-clock.svg | ?? | untracked | recoverable | INCLUDE_CANDIDATE | spark-dash | false |
| apps/web/public/spark-dash/mobile-icon-explore.svg | ?? | untracked | recoverable | INCLUDE_CANDIDATE | spark-dash | false |
| apps/web/public/spark-dash/mobile-icon-home.svg | ?? | untracked | recoverable | INCLUDE_CANDIDATE | spark-dash | false |
| apps/web/public/spark-dash/mobile-icon-lightning.svg | ?? | untracked | recoverable | INCLUDE_CANDIDATE | spark-dash | false |
| apps/web/public/spark-dash/mobile-icon-nav-bell.svg | ?? | untracked | recoverable | INCLUDE_CANDIDATE | spark-dash | false |
| apps/web/public/spark-dash/mobile-icon-nav-explore.svg | ?? | untracked | recoverable | INCLUDE_CANDIDATE | spark-dash | false |
| apps/web/public/spark-dash/mobile-icon-nav-wallet.svg | ?? | untracked | recoverable | INCLUDE_CANDIDATE | spark-dash,wallet-ui | false |
| apps/web/public/spark-dash/mobile-icon-notification.svg | ?? | untracked | recoverable | INCLUDE_CANDIDATE | spark-dash | false |
| apps/web/public/spark-dash/mobile-icon-trend.svg | ?? | untracked | recoverable | INCLUDE_CANDIDATE | spark-dash | false |
| apps/web/public/spark-dash/mobile-icon-trophy.svg | ?? | untracked | recoverable | INCLUDE_CANDIDATE | spark-dash | false |
| apps/web/public/spark-dash/mobile-icon-wallet.svg | ?? | untracked | recoverable | INCLUDE_CANDIDATE | spark-dash,wallet-ui | false |
| apps/web/public/spark-dash/mobile-product-sneaker.png | ?? | untracked | recoverable | INCLUDE_CANDIDATE | spark-dash | false |
| apps/web/public/spark-dash/opportunity-energy.png | ?? | untracked | recoverable | INCLUDE_CANDIDATE | spark-dash | false |
| apps/web/public/spark-dash/product-sneaker-cutout.png | ?? | untracked | recoverable | INCLUDE_CANDIDATE | spark-dash | false |
| apps/web/public/spark-dash/product-sneaker-hero.png | ?? | untracked | recoverable | INCLUDE_CANDIDATE | spark-dash | false |
| apps/web/public/spark-dash/product-sneaker-mask.svg | ?? | untracked | recoverable | INCLUDE_CANDIDATE | spark-dash | false |
| apps/web/public/spark-dash/product-sneaker-source.png | ?? | untracked | recoverable | INCLUDE_CANDIDATE | spark-dash | false |
| apps/web/public/spark-dash/product-sneaker.png | ?? | untracked | recoverable | INCLUDE_CANDIDATE | spark-dash | false |
| apps/web/public/spark-dash/spark-mark.svg | ?? | untracked | recoverable | INCLUDE_CANDIDATE | spark-dash | false |
| apps/web/scripts/capture-cux-003-room-mobile.mjs | ?? | untracked | other-work | REVIEW | - | false |
| apps/web/scripts/capture-cux-004-profits-mobile.mjs | ?? | untracked | other-work | REVIEW | - | false |
| apps/web/scripts/capture-spark-dash-desktop.mjs | ?? | untracked | recoverable | INCLUDE_CANDIDATE | spark-dash | false |
| apps/web/scripts/capture-spark-dash-home-regression.mjs | ?? | untracked | recoverable | INCLUDE_CANDIDATE | spark-dash | false |
| apps/web/scripts/capture-spark-dash-hotfix.mjs | ?? | untracked | recoverable | INCLUDE_CANDIDATE | spark-dash | false |
| apps/web/scripts/capture-spark-dash-mobile-polish.mjs | ?? | untracked | recoverable | INCLUDE_CANDIDATE | spark-dash | false |
| apps/web/scripts/capture-spark-dash-mobile-scroll.mjs | ?? | untracked | recoverable | INCLUDE_CANDIDATE | spark-dash | false |
| apps/web/scripts/capture-spark-dash-mobile.mjs | ?? | untracked | recoverable | INCLUDE_CANDIDATE | spark-dash | false |
| apps/web/scripts/capture-spark-dash-profile-hotfix.mjs | ?? | untracked | recoverable | INCLUDE_CANDIDATE | spark-dash | false |
| apps/web/scripts/capture-spark-dash-profits-runtime.mjs | ?? | untracked | recoverable | INCLUDE_CANDIDATE | spark-dash | false |
| apps/web/scripts/capture-spark-dash-profits-states.mjs | ?? | untracked | recoverable | INCLUDE_CANDIDATE | spark-dash | false |
| apps/web/scripts/capture-spark-dash-profits.mjs | ?? | untracked | recoverable | INCLUDE_CANDIDATE | spark-dash | false |
| apps/web/scripts/download-spark-dash-assets.mjs | ?? | untracked | recoverable | INCLUDE_CANDIDATE | spark-dash | false |
| apps/web/scripts/download-spark-dash-mobile-assets.mjs | ?? | untracked | recoverable | INCLUDE_CANDIDATE | spark-dash | false |
| apps/web/scripts/freeze-home-qa.mjs | ?? | untracked | recoverable | INCLUDE_CANDIDATE | home-freeze | false |
| apps/web/scripts/overlay-spark-dash.mjs | ?? | untracked | recoverable | INCLUDE_CANDIDATE | spark-dash | false |
| apps/web/scripts/prepare-founder-approved-desktop.mjs | ?? | untracked | other-work | REVIEW | - | false |
| apps/web/scripts/probe-profits-api.mjs | ?? | untracked | other-work | REVIEW | - | false |
| apps/web/scripts/process-product-sneaker.mjs | ?? | untracked | other-work | REVIEW | - | false |
| apps/web/tsconfig.json |  M | tracked-modified | other-work | REVIEW | - | false |
| docs/CURRENT_PROJECT_AUDIT.md |  M | tracked-modified | other-work | REVIEW | - | false |
| docs/reference/founder-intent/CONSTITUTION_AUTHORITY_MATRIX.md |  M | tracked-modified | other-work | REVIEW | - | false |
| docs/reference/founder-intent/LEGACY_CONFLICT_REGISTER.md |  M | tracked-modified | other-work | REVIEW | - | false |
| docs/reference/founder-intent/PLAN_AUTHORITY_MATRIX.md |  M | tracked-modified | other-work | REVIEW | - | false |
| docs/reference/founder-intent/README.md |  M | tracked-modified | other-work | REVIEW | - | false |
| governance/admin/admin-control-plane.v1.json | ?? | untracked | other-work | REVIEW | - | false |
| governance/consumer-home-approval/baselines/approved-home-desktop-1280.png | ?? | untracked | recoverable | INCLUDE_CANDIDATE | home-freeze | false |
| governance/consumer-home-approval/baselines/approved-home-desktop-1366.png | ?? | untracked | recoverable | INCLUDE_CANDIDATE | home-freeze | false |
| governance/consumer-home-approval/baselines/approved-home-desktop-1440.png | ?? | untracked | recoverable | INCLUDE_CANDIDATE | home-freeze | false |
| governance/consumer-home-approval/baselines/approved-home-desktop-1680.png | ?? | untracked | recoverable | INCLUDE_CANDIDATE | home-freeze | false |
| governance/consumer-home-approval/baselines/approved-home-desktop-1920.png | ?? | untracked | recoverable | INCLUDE_CANDIDATE | home-freeze | false |
| governance/consumer-home-approval/baselines/approved-home-mobile-320.png | ?? | untracked | recoverable | INCLUDE_CANDIDATE | home-freeze | false |
| governance/consumer-home-approval/baselines/approved-home-mobile-360.png | ?? | untracked | recoverable | INCLUDE_CANDIDATE | home-freeze | false |
| governance/consumer-home-approval/baselines/approved-home-mobile-375.png | ?? | untracked | recoverable | INCLUDE_CANDIDATE | home-freeze | false |
| governance/consumer-home-approval/baselines/approved-home-mobile-390.png | ?? | untracked | recoverable | INCLUDE_CANDIDATE | home-freeze | false |
| governance/consumer-home-approval/baselines/approved-home-mobile-412.png | ?? | untracked | recoverable | INCLUDE_CANDIDATE | home-freeze | false |
| governance/consumer-home-approval/baselines/approved-home-mobile-430.png | ?? | untracked | recoverable | INCLUDE_CANDIDATE | home-freeze | false |
| governance/consumer-home-approval/baselines/approved-home-mobile-ai.png | ?? | untracked | recoverable | INCLUDE_CANDIDATE | home-freeze | false |
| governance/consumer-home-approval/baselines/approved-home-mobile-hero.png | ?? | untracked | recoverable | INCLUDE_CANDIDATE | home-freeze | false |
| governance/consumer-home-approval/freeze-qa.v1.json | ?? | untracked | recoverable | INCLUDE_CANDIDATE | home-freeze | false |
| governance/consumer-home-approval/home-approval-freeze.v1.json | ?? | untracked | recoverable | INCLUDE_CANDIDATE | home-freeze | false |
| governance/release-master/REL-000-TREE-INVENTORY.json | ?? | untracked | plan-meta | INCLUDE_CANDIDATE | - | false |
| governance/release-master/REL-000-TREE-INVENTORY.md | ?? | untracked | plan-meta | INCLUDE_CANDIDATE | - | false |
| packages/sdk/src/user-feed/fetch.ts |  M | tracked-modified | other-work | REVIEW | - | false |
| packages/sdk/src/user-feed/types.ts |  M | tracked-modified | other-work | REVIEW | - | false |
| schemas/opportunity-card.v1.json |  M | tracked-modified | other-work | REVIEW | - | true |
| services/api-nest/src/ledger/index.ts |  M | tracked-modified | recoverable | INCLUDE_CANDIDATE | ledger | true |
| services/api-nest/src/ledger/ledger.module.ts |  M | tracked-modified | recoverable | INCLUDE_CANDIDATE | ledger | true |
| services/api-nest/src/ledger/ledger.types.ts |  M | tracked-modified | recoverable | INCLUDE_CANDIDATE | ledger | true |
| services/api-nest/src/ledger/ledger.user-journal.project.ts | ?? | untracked | recoverable | INCLUDE_CANDIDATE | ledger | true |
| services/api-nest/src/ledger/ledger.user-journal.service.ts | ?? | untracked | recoverable | INCLUDE_CANDIDATE | ledger | true |
| services/api-nest/src/opportunities/catalog-runtime-seed.service.ts |  M | tracked-modified | recoverable | INCLUDE_CANDIDATE | opportunities | true |
| services/api-nest/src/opportunities/index.ts |  M | tracked-modified | recoverable | INCLUDE_CANDIDATE | opportunities | true |
| services/api-nest/src/opportunities/opportunities.admin.service.ts |  M | tracked-modified | recoverable | INCLUDE_CANDIDATE | opportunities | true |
| services/api-nest/src/opportunities/opportunities.mi.ts |  M | tracked-modified | recoverable | INCLUDE_CANDIDATE | opportunities | true |
| services/api-nest/src/opportunities/opportunities.module.ts |  M | tracked-modified | recoverable | INCLUDE_CANDIDATE | opportunities | true |
| services/api-nest/src/opportunities/opportunity-reprice.service.ts | ?? | untracked | recoverable | INCLUDE_CANDIDATE | opportunities,opportunity-reprice | true |
| services/api-nest/src/wallet/wallet.controller.ts |  M | tracked-modified | recoverable | INCLUDE_CANDIDATE | wallet-ui | true |
| services/api-nest/src/wallet/wallet.routes.ts |  M | tracked-modified | recoverable | INCLUDE_CANDIDATE | wallet-ui | true |
| services/market-intelligence/src/catalog-runtime-seed.cjs |  M | tracked-modified | recoverable | INCLUDE_CANDIDATE | market-intelligence | false |
| services/market-intelligence/src/index.cjs |  M | tracked-modified | recoverable | INCLUDE_CANDIDATE | market-intelligence | false |
| services/market-intelligence/src/index.d.ts |  M | tracked-modified | recoverable | INCLUDE_CANDIDATE | market-intelligence | false |
| services/market-intelligence/src/match-result/contract.cjs | ?? | untracked | recoverable | INCLUDE_CANDIDATE | market-intelligence | false |
| services/market-intelligence/src/match-result/index.cjs | ?? | untracked | recoverable | INCLUDE_CANDIDATE | market-intelligence | false |
| services/market-intelligence/src/match-result/persist.cjs | ?? | untracked | recoverable | INCLUDE_CANDIDATE | market-intelligence | false |
| services/market-intelligence/src/match-result/persistence-mapper.cjs | ?? | untracked | recoverable | INCLUDE_CANDIDATE | market-intelligence | false |
| services/market-intelligence/src/match-result/repository.postgres.cjs | ?? | untracked | recoverable | INCLUDE_CANDIDATE | market-intelligence | false |
| services/market-intelligence/src/pipeline.cjs |  M | tracked-modified | recoverable | INCLUDE_CANDIDATE | market-intelligence | false |
| supabase/migrations/20260819210000_source_observations.sql | ?? | untracked | recoverable | INCLUDE_CANDIDATE | migrations | true |
| supabase/migrations/20260819220000_canonical_products.sql | ?? | untracked | recoverable | INCLUDE_CANDIDATE | migrations | true |
| supabase/migrations/20260820013000_match_results.sql | ?? | untracked | recoverable | INCLUDE_CANDIDATE | migrations | true |
| tooling/cursor/sync-plans-ssot.cjs |  M | tracked-modified | other-work | REVIEW | - | false |
| tooling/verify/canonical-product-durable-persistence.cjs | ?? | untracked | other-work | REVIEW | - | false |
| tooling/verify/catalog-runtime-seed.cjs |  M | tracked-modified | other-work | REVIEW | - | false |
| tooling/verify/match-result-durable-persistence.cjs | ?? | untracked | other-work | REVIEW | - | false |
| tooling/verify/plans-integrity.cjs | ?? | untracked | other-work | REVIEW | - | false |
| tooling/verify/plans-ssot.cjs |  M | tracked-modified | other-work | REVIEW | - | false |
| tooling/verify/profits-live-wire.cjs |  M | tracked-modified | other-work | REVIEW | - | false |
| tooling/verify/sdk-user-feed.cjs |  M | tracked-modified | other-work | REVIEW | - | false |
| tooling/verify/source-observation-db-runtime.cjs | ?? | untracked | other-work | REVIEW | - | false |
| tooling/verify/source-observation-durable-persistence.cjs | ?? | untracked | other-work | REVIEW | - | false |
| tooling/verify/wallet-gap-wire.cjs | ?? | untracked | recoverable | INCLUDE_CANDIDATE | wallet-ui | false |
| tooling/verify/wallet-kyc-session-auth.cjs |  M | tracked-modified | recoverable | INCLUDE_CANDIDATE | wallet-ui | false |

## 6. REL-001 instructions (do not execute in REL-000)

1. Exclude every `secret-risk`, `tmp`, and ignored secret-scan path.
2. `_external_intake/**` = REVIEW (COPY ONLY, EXECUTION_AUTHORITY=NO).
3. Home freeze + spark-dash + opportunities + reprice + migrations = INCLUDE_CANDIDATE.
4. Create `preserve/<date>-worktree-rescue`. Do not merge to main.
5. Path-specified `git add` only. `git add -A` forbidden.

## 6.1 REL-001 preserve cross-record (2026-08-20)

```text
PRESERVE_BRANCH = preserve/2026-08-20-worktree-rescue
PRESERVE_COMMIT = ae8d1e634cb07998982997bb520396b825a7a42e
MERGE_TO_MAIN = FORBIDDEN
PR_TARGET = NONE
BACKUP_AUTHORITY_ONLY = TRUE
RECOVERABLE_PRESERVED = 151 / 151
```

`preserve/*` is recovery/backup authority only. It is not a main merge candidate. REL-002+ must open separate `recovery/*` branches from main and copy/cherry-pick needed paths. Do not merge this preserve branch.

## 7. REL-000 verify record

```text
INVENTORY_EXISTS = TRUE
GIT_ADD_A_USED = FALSE
SECRET_RISK_STAGED = 0
STAGED_COUNT = 0
HOME_SOURCE_READ = 0
PRODUCT_IMPLEMENTATION_IN_REL000 = 0
```

Machine copy: `governance/release-master/REL-000-TREE-INVENTORY.json`
