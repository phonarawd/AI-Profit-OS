/**
 * T0 — 변경 경로 기준 도메인 verify (슬라이스 빠른 차단)
 * staged → unstaged → HEAD 대비 순으로 파일 목록 수집
 */
const { execSync } = require("child_process");
const path = require("path");

const root = path.resolve(__dirname, "../..");

/** @type {{ test: (file: string) => boolean, scripts: string[] }[]} */
const RULES = [
  {
    test: (f) =>
      /^\.cursor\/plans\//.test(f) ||
      /^docs\/reference\/founder-intent\//.test(f) ||
      /^tooling\/verify\/plans-ssot\.cjs$/.test(f) ||
      /^tooling\/verify\/plans-integrity\.cjs$/.test(f) ||
      /^tooling\/cursor\/sync-plans-ssot\.cjs$/.test(f) ||
      /^tooling\/verify\/legacy-plan-authority\.cjs$/.test(f),
    scripts: ["plans-ssot.cjs", "legacy-plan-authority.cjs"],
  },
  {
    test: (f) =>
      /^docs\/product\/consumer\//.test(f) ||
      /^docs\/product\/PUTDUK_PRODUCT_DESIGN_ENGINEERING_OPERATING_SYSTEM\.md$/.test(
        f,
      ) ||
      /^tooling\/verify\/consumer-ux-architecture\.cjs$/.test(f) ||
      /^tooling\/verify\/core-loop-contract\.cjs$/.test(f) ||
      /^tooling\/verify\/wallet-contract\.cjs$/.test(f) ||
      /^tooling\/verify\/acquisition-contract\.cjs$/.test(f) ||
      /^tooling\/verify\/acquisition-gap-wire\.cjs$/.test(f) ||
      /^tooling\/verify\/acquisition-release\.cjs$/.test(f) ||
      /^tooling\/verify\/lib\/acquisition-release-runtime\.cjs$/.test(f) ||
      /^tooling\/verify\/account-hub-contract\.cjs$/.test(f) ||
      /^tooling\/verify\/account-hub-gap-wire\.cjs$/.test(f) ||
      /^tooling\/verify\/account-hub-release\.cjs$/.test(f) ||
      /^tooling\/verify\/lib\/account-hub-release-runtime\.cjs$/.test(f) ||
      /^governance\/consumer-acquisition\//.test(f) ||
      /^governance\/consumer-account-hub\//.test(f) ||
      /^packages\/sdk\/src\/auth\//.test(f) ||
      /^tooling\/verify\/wallet-gap-wire\.cjs$/.test(f) ||
      /^tooling\/verify\/wallet-release\.cjs$/.test(f) ||
      /^tooling\/verify\/lib\/wallet-release-runtime\.cjs$/.test(f) ||
      /^governance\/consumer-wallet\//.test(f) ||
      /^tooling\/verify\/participate-web-wire\.cjs$/.test(f) ||
      /^tooling\/verify\/execute-web-wire\.cjs$/.test(f) ||
      /^tooling\/verify\/trades-web-wire\.cjs$/.test(f) ||
      /^tooling\/verify\/core-loop-release\.cjs$/.test(f) ||
      /^tooling\/verify\/lib\/core-loop-release-runtime\.cjs$/.test(f) ||
      /^governance\/consumer-loop\//.test(f) ||
      /^apps\/web\/app\/profits\/\[id\]\//.test(f) ||
      /^apps\/web\/app\/trades\//.test(f) ||
      /^packages\/sdk\/src\/index\.ts$/.test(f) ||
      /^packages\/sdk\/src\/participate\//.test(f) ||
      /^packages\/sdk\/src\/execution-stream\//.test(f) ||
      /^packages\/sdk\/src\/trades\//.test(f) ||
      /^services\/api-nest\/src\/trades\//.test(f) ||
      /^apps\/web\/app\/auth\//.test(f) ||
      /^apps\/web\/app\/onboarding\//.test(f) ||
      /^apps\/web\/app\/ads\//.test(f) ||
      /^apps\/web\/app\/l\//.test(f) ||
      /^apps\/web\/app\/components\/GuestChrome\.tsx$/.test(f),
    scripts: [
      "consumer-ux-architecture.cjs",
      "core-loop-contract.cjs",
      "wallet-contract.cjs",
      "acquisition-contract.cjs",
      "acquisition-gap-wire.cjs",
      "acquisition-release.cjs",
      "account-hub-contract.cjs",
      "account-hub-gap-wire.cjs",
      "account-hub-release.cjs",
      "wallet-gap-wire.cjs",
      "wallet-release.cjs",
      "participate-web-wire.cjs",
      "execute-web-wire.cjs",
      "trades-web-wire.cjs",
      "core-loop-release.cjs",
    ],
  },
  {
    test: (f) =>
      /^apps\/web\/app\/me\//.test(f) ||
      /^packages\/sdk\/src\/referral\//.test(f) ||
      /^packages\/sdk\/src\/inbox\//.test(f),
    scripts: [
      "account-hub-contract.cjs",
      "account-hub-gap-wire.cjs",
      "account-hub-release.cjs",
    ],
  },
  {
    test: (f) =>
      /^\.cursor\/hooks(\/|$)/.test(f) ||
      /^\.cursor\/hooks\.json$/.test(f) ||
      /^\.cursor\/rules\/project-isolation/.test(f) ||
      /^scripts\/verify-project-boundary\.mjs$/.test(f) ||
      /^tooling\/verify\/project-boundary\.cjs$/.test(f) ||
      /^docs\/ops\/project-isolation-boundary-checklist\.md$/.test(f),
    scripts: ["project-boundary.cjs"],
  },
  {
    test: (f) =>
      /^governance\/platform-redesign\//.test(f) ||
      /^schemas\/governance-observation\.v1\.json$/.test(f) ||
      /^tooling\/verify\/platform-redesign-inventory\.cjs$/.test(f) ||
      /^tooling\/verify\/platform-fact-state-registry\.cjs$/.test(f) ||
      /^tooling\/verify\/platform-change-control\.cjs$/.test(f) ||
      /^tooling\/verify\/governance-observation-registry\.cjs$/.test(f) ||
      /^tooling\/verify\/lib\/platform-redesign-measure\.cjs$/.test(f),
    scripts: [
      "platform-redesign-inventory.cjs",
      "platform-fact-state-registry.cjs",
      "platform-change-control.cjs",
      "governance-observation-registry.cjs",
    ],
  },
  {
    test: (f) =>
      /^governance\/engine-acceptance\//.test(f) ||
      /^tooling\/engine-acceptance\//.test(f) ||
      /^tooling\/verify\/engine-acceptance\.cjs$/.test(f) ||
      /^\.github\/workflows\/engine-acceptance\.yml$/.test(f),
    scripts: ["engine-acceptance.cjs"],
  },
  {
    test: (f) =>
      /^supabase\/migrations\//.test(f) ||
      /^tooling\/verify\/migrations-applied-parity\.cjs$/.test(f) ||
      /^tooling\/verify\/fixtures\/migrations-applied\.v1\.json$/.test(f),
    scripts: ["migrations-applied-parity.cjs", "rel-505-backend-alignment.cjs"],
  },
  {
    test: (f) =>
      /^governance\/release-master\/R7_BACKEND_ALIGNMENT\.md$/.test(f) ||
      /^governance\/release-master\/REL-508-MIGRATION-HEAD-IDENTITY\.md$/.test(f) ||
      /^tooling\/verify\/rel-505-backend-alignment\.cjs$/.test(f) ||
      /^tooling\/verify\/fixtures\/r7-backend-alignment\.v1\.json$/.test(f) ||
      /^tooling\/verify\/fixtures\/migrations-remote-applied\.v1\.json$/.test(f) ||
      /^schemas\/trade-execution-state\.v1\.json$/.test(f) ||
      /^services\/engine-rust\/src\/settlement_rule\.rs$/.test(f) ||
      /^services\/engine-rust\/settlement_rule\.cjs$/.test(f) ||
      /^services\/api-nest\/src\/app\.module\.ts$/.test(f) ||
      /^services\/api-nest\/src\/risk\/rules\/p49_circuit\.ts$/.test(f) ||
      /^governance\/platform-redesign\/fact-state-registry\.v1\.json$/.test(f),
    scripts: ["rel-505-backend-alignment.cjs"],
  },
  {
    test: (f) =>
      /^infra\/(web|ops)\//.test(f) ||
      /^infra\/domain\.manifest\.json$/.test(f) ||
      /^tooling\/deploy\/cf-(pages-web|pages-ops|preflight|origin-smoke)/.test(f) ||
      /^workers\/(web-proxy|ops-proxy|_shared)\//.test(f) ||
      /^tooling\/verify\/opennext-workers-origin\.cjs$/.test(f),
    scripts: [
      "opennext-workers-origin.cjs",
      "domain-bootstrap.cjs",
      "cf-deploy-packages.cjs",
    ],
  },
  {
    test: (f) => /^(packages\/ui\/|apps\/web\/)/.test(f),
    scripts: ["no-it-jargon.cjs"],
  },
  {
    test: (f) =>
      /^apps\/web\/app\/page\.tsx$/.test(f) ||
      /^apps\/web\/app\/HomePageClient\.tsx$/.test(f) ||
      /^apps\/web\/app\/_components\/HomePageClient\.tsx$/.test(f) ||
      /^apps\/web\/components\/HomePageClient\.tsx$/.test(f) ||
      /^packages\/sdk\/src\/user-feed\//.test(f) ||
      /HomePrincipalRail/.test(f) ||
      /home-principal-slots/.test(f) ||
      /^packages\/sdk\/src\/growth\//.test(f) ||
      /^services\/api-nest\/src\/growth\//.test(f),
    scripts: [
      "home-live-wire.cjs",
      "sdk-user-feed.cjs",
      "home-principal-slots.cjs",
      "growth-public-surface.cjs",
      "ticker-pii-0.cjs",
    ],
  },
  {
    test: (f) =>
      /^apps\/web\/app\/profits\//.test(f) ||
      /^apps\/web\/app\/ProfitsDesktopClient\.tsx$/.test(f) ||
      /^apps\/web\/components\/spark-dash-profits\//.test(f),
    scripts: [
      "profits-live-wire.cjs",
      "sdk-user-feed.cjs",
      "participate-web-wire.cjs",
    ],
  },
  {
    test: (f) =>
      /^services\/api-nest\/src\/opportunities\/opportunities\.user\.(service|controller|routes)\.ts$/.test(
        f,
      ) ||
      /^services\/api-nest\/src\/opportunities\/opportunity-reprice\.service\.ts$/.test(
        f,
      ) ||
      /^schemas\/opportunity-card\.v1\.json$/.test(f) ||
      /^tooling\/verify\/user-opportunity-feed\.cjs$/.test(f),
    scripts: ["user-opportunity-feed.cjs", "user-opportunity-feed-policy.cjs"],
  },
  {
    test: (f) =>
      /^services\/market-intelligence\/src\/user-opportunity-feed-policy\.cjs$/.test(
        f,
      ) ||
      /^services\/api-nest\/src\/opportunities\/user-opportunity-feed-policy\.ts$/.test(
        f,
      ) ||
      /^schemas\/user-opportunity-feed-policy\.v1\.json$/.test(f) ||
      /^governance\/consumer-loop\/user-opportunity-feed-policy\.v1\.json$/.test(
        f,
      ) ||
      /^tooling\/verify\/user-opportunity-feed-policy\.cjs$/.test(f),
    scripts: ["user-opportunity-feed-policy.cjs", "user-opportunity-feed.cjs"],
  },
  {
    test: (f) =>
      /^apps\/web\/app\/wallet\/page\.tsx$/.test(f) ||
      /^packages\/sdk\/src\/wallet\//.test(f) ||
      /^packages\/sdk\/src\/wallet\.ts$/.test(f),
    scripts: ["wallet-live-wire.cjs", "wallet-gap-wire.cjs", "wallet-release.cjs"],
  },
  {
    test: (f) =>
      /^apps\/web\/app\/wallet\/withdraw\//.test(f) ||
      /WithdrawLiveForm/.test(f) ||
      /WithdrawAmountPanel/.test(f) ||
      /WithdrawStepUpPanel/.test(f) ||
      /withdraw-flow-wire/.test(f),
    scripts: ["withdraw-flow-wire.cjs", "wallet-live-wire.cjs"],
  },
  {
    test: (f) =>
      /^apps\/web\/app\/wallet\/deposit\//.test(f) ||
      /^apps\/web\/app\/me\/kyc\//.test(f) ||
      /^apps\/web\/app\/me\/support\//.test(f) ||
      /stub-page-actions/.test(f) ||
      (/packages\/ui\/components\/kyc\//.test(f) && /KycFlow/.test(f)),
    scripts: ["stub-page-actions.cjs"],
  },
  {
    test: (f) => /^apps\/admin\//.test(f),
    scripts: ["no-admin-in-web.cjs", "admin-routes.cjs"],
  },
  {
    test: (f) =>
      /^services\/api-nest\/src\/common\//.test(f) ||
      /^services\/api-nest\/src\/app\.module\.ts$/.test(f) ||
      /^services\/api-nest\/src\/.*\.admin\.controller\.ts$/.test(f) ||
      /^schemas\/admin-rbac\.v1\.json$/.test(f) ||
      /^tooling\/verify\/admin-boundary\.cjs$/.test(f),
    scripts: ["admin-boundary.cjs"],
  },
  {
    test: (f) =>
      /^services\/api-nest\/clock\.core\.cjs$/.test(f) ||
      /^services\/api-nest\/src\/common\/clock\.ts$/.test(f) ||
      /^services\/api-nest\/src\/(opportunities\/participate|trades\/trades\.execution|referral\/referral\.share|missions\/mission\.accrual|loop\/day-pulse)\.service\.ts$/.test(
        f,
      ) ||
      /^tooling\/verify\/domain-clock\.cjs$/.test(f),
    scripts: ["domain-clock.cjs"],
  },
  {
    test: (f) =>
      /^services\/api-nest\/src\/db\//.test(f) ||
      /^tooling\/verify\/db-recovery\.cjs$/.test(f),
    scripts: ["db-recovery.cjs", "pg-module-scan.cjs"],
  },
  {
    test: (f) =>
      /^services\/api-nest\/src\/auth\/(privacy-account\.service|auth\.service|auth\.controller|auth\.stage)\.ts$/.test(
        f,
      ) ||
      /^services\/api-nest\/kakao-oauth\.core\.cjs$/.test(f) ||
      /^tooling\/verify\/kakao-oauth-runtime\.cjs$/.test(f) ||
      /^apps\/web\/app\/auth\/oauth\//.test(f) ||
      /^tooling\/verify\/privacy-purge\.cjs$/.test(f),
    scripts: [
      "privacy-purge.cjs",
      "auth-flows.cjs",
      "auth-jwt-runtime.cjs",
      "kakao-oauth-runtime.cjs",
    ],
  },
  {
    test: (f) =>
      /packages\/ui\/components\/opportunity/.test(f) ||
      /packages\/ui\/copy\/ko\/(feed|margin)/.test(f) ||
      /packages\/ui\/canon\/surfaces\/opportunity/.test(f),
    scripts: [
      "balance-aware-feed.cjs",
      "opportunity-scan-surface.cjs",
      "margin-compare-surface.cjs",
      "asset-image-surface.cjs",
      "cta-earn-profit.cjs",
    ],
  },
  {
    test: (f) =>
      /packages\/ui\/components\/execution\//.test(f) ||
      /packages\/ui\/copy\/ko\/execution\.ts/.test(f) ||
      /packages\/ui\/canon\/surfaces\/execution-/.test(f) ||
      /apps\/web\/app\/trades\/.+\/execute\//.test(f),
    scripts: [
      "execution-surfaces.cjs",
      "match-tension-surface.cjs",
      "trade-execution-hook.cjs",
      "execute-web-wire.cjs",
      "asset-image-surface.cjs",
    ],
  },
  {
    test: (f) =>
      /packages\/ui\/components\/peotteok\//.test(f) ||
      /packages\/ui\/copy\/ko\/peotteok\.ts/.test(f) ||
      /packages\/ui\/canon\/surfaces\/peotteok/.test(f) ||
      /apps\/web\/app\/me\/peotteok\//.test(f) ||
      /packages\/sdk\/src\/peotteok\//.test(f),
    scripts: [
      "ai-coach-ui.cjs",
      "ai-coach-fact-only.cjs",
      "ai-coach-no-autonomy.cjs",
      "age-tone-surfaces.cjs",
    ],
  },
  {
    test: (f) =>
      /^services\/ai-platform\/src\/(reference-resolver|conversation-state|coach-prompt)\.cjs$/.test(
        f,
      ) ||
      /^services\/memory-service\/src\/(preference-memory|memory)\.cjs$/.test(f) ||
      /^services\/api-nest\/src\/ai\/(coach\.orchestrator|fact-tool\.service|conversation-state\.service|memory\.service|ai\.engine)\.ts$/.test(
        f,
      ) ||
      /^tooling\/verify\/(reference-resolution|conversation-state-bounded)\.cjs$/.test(
        f,
      ),
    scripts: [
      "reference-resolution.cjs",
      "conversation-state-bounded.cjs",
      "ai-coach-fact-only.cjs",
      "ai-coach-no-autonomy.cjs",
      "ai-general-no-money-tools.cjs",
      "age-tone-surfaces.cjs",
    ],
  },
  {
    test: (f) =>
      /^services\/ai-platform\/src\/assistant-router\.cjs$/.test(f) ||
      /^eval\/p_fact\.jsonl$/.test(f) ||
      /^tooling\/verify\/(routing-coverage|ai-lane-router)\.cjs$/.test(f),
    scripts: [
      "routing-coverage.cjs",
      "ai-lane-router.cjs",
      "ai-scope-guard.cjs",
      "ai-coach-fact-only.cjs",
      "ai-coach-no-autonomy.cjs",
      "ai-general-no-money-tools.cjs",
      "reference-resolution.cjs",
      "age-tone-surfaces.cjs",
    ],
  },
  {
    test: (f) =>
      /^services\/ai-platform\/src\/(answer-guard|coach-prompt|coach-templates|ai-log)\.cjs$/.test(
        f,
      ) ||
      /^eval\/g_scope_escape\.jsonl$/.test(f) ||
      /^schemas\/ai-answer-trace\.v1\.json$/.test(f) ||
      /^tooling\/verify\/ai-scope-guard\.cjs$/.test(f) ||
      /^tooling\/verify\/ai-guard-authority\.cjs$/.test(f) ||
      /^services\/api-nest\/src\/ai\/coach\.orchestrator\.ts$/.test(f),
    scripts: [
      "ai-scope-guard.cjs",
      "ai-guard-authority.cjs",
      "numeric-grounding.cjs",
      "routing-coverage.cjs",
      "ai-lane-router.cjs",
      "ai-coach-fact-only.cjs",
      "ai-coach-no-autonomy.cjs",
      "ai-general-no-money-tools.cjs",
      "reference-resolution.cjs",
      "conversation-state-bounded.cjs",
      "age-tone-surfaces.cjs",
    ],
  },
  {
    test: (f) =>
      /^services\/ai-platform\/src\/numeric-grounding\.cjs$/.test(f) ||
      /^tooling\/verify\/numeric-grounding\.cjs$/.test(f),
    scripts: [
      "numeric-grounding.cjs",
      "ai-scope-guard.cjs",
      "answer-trace.cjs",
      "ai-coach-fact-only.cjs",
      "ai-coach-no-autonomy.cjs",
      "ai-general-no-money-tools.cjs",
      "fact-freshness.cjs",
      "home-state-truth.cjs",
      "no-fake-zero-status.cjs",
    ],
  },
  {
    test: (f) =>
      /^services\/shadow-replay-engine\//.test(f) ||
      /^services\/api-nest\/src\/ai\/shadow-replay\.admin\.service\.ts$/.test(f) ||
      /^schemas\/shadow-replay-report\.v1\.json$/.test(f) ||
      /^supabase\/migrations\/\d+_shadow_replay_advisory_label\.sql$/.test(f) ||
      /^packages\/ui\/canon\/surfaces\/admin-ledger-shadow-replay\.wire\.json$/.test(
        f,
      ) ||
      /^tooling\/verify\/shadow-replay-drift\.cjs$/.test(f),
    scripts: [
      "shadow-replay-drift.cjs",
      "migrations-applied-parity.cjs",
      "ai-feature-platform.cjs",
    ],
  },
  {
    test: (f) =>
      /packages\/ui\/components\/kyc\//.test(f) ||
      /packages\/ui\/copy\/ko\/kyc\.ts/.test(f) ||
      /packages\/ui\/canon\/surfaces\/kyc-/.test(f) ||
      /apps\/web\/app\/me\/kyc\//.test(f),
    scripts: ["kyc-surfaces.cjs"],
  },
  {
    test: (f) =>
      /packages\/ui\/components\/trust\//.test(f) ||
      /packages\/ui\/copy\/ko\/(trust|objections|guide)\.ts/.test(f) ||
      /apps\/web\/app\/me\/guide\//.test(f) ||
      /packages\/ui\/canon\/surfaces\/(get-usdt-guide|market-weekly-briefing)\.wire\.json/.test(
        f,
      ),
    scripts: [
      "trust-copy.cjs",
      "tax-disclaimer.cjs",
      "objection4.cjs",
      "deposit-network-plain-ko.cjs",
      "market-briefing-no-investment-advice.cjs",
      "participate-proof.cjs",
      "deposit-ai-template-path.cjs",
    ],
  },
  {
    test: (f) =>
      /packages\/ui\/components\/invite\//.test(f) ||
      /packages\/ui\/copy\/ko\/invite\.ts/.test(f) ||
      /packages\/ui\/canon\/surfaces\/invite-home\.wire\.json/.test(f) ||
      /apps\/web\/app\/me\/invite\//.test(f),
    scripts: [
      "invite-explain-surfaces.cjs",
      "age-tone-surfaces.cjs",
      "referral-unlimited-invites.cjs",
    ],
  },
  {
    test: (f) =>
      /packages\/ui\/components\/membership\//.test(f) ||
      /packages\/ui\/copy\/ko\/membership\.ts/.test(f) ||
      /packages\/ui\/brand\/membership\.ts/.test(f) ||
      /packages\/ui\/brand\/assets\/membership\//.test(f) ||
      /packages\/ui\/brand\/brand\.manifest\.json/.test(f) ||
      /packages\/ui\/canon\/surfaces\/membership-home\.wire\.json/.test(f) ||
      /apps\/web\/app\/me\/membership\//.test(f),
    scripts: [
      "membership-surfaces.cjs",
      "membership-badge-assets.cjs",
      "no-fulfill-rate-as-rule.cjs",
    ],
  },
  {
    test: (f) =>
      /packages\/ui\/components\/inbox\//.test(f) ||
      /packages\/ui\/copy\/ko\/inbox\.ts/.test(f) ||
      /packages\/ui\/canon\/surfaces\/ops-inbox\.wire\.json/.test(f) ||
      /apps\/web\/app\/me\/inbox\//.test(f) ||
      (/^services\/api-nest\/src\/inbox\//.test(f) ||
        /notification-prefs/.test(f)),
    scripts: [
      "ops-inbox.cjs",
      "notification-prefs-default-on.cjs",
    ],
  },
  {
    test: (f) =>
      /packages\/ui\/components\/loop\//.test(f) ||
      /packages\/ui\/copy\/ko\/loop\.ts/.test(f) ||
      /packages\/ui\/canon\/surfaces\/(day-pulse|preflight-confirm)\.wire\.json/.test(
        f,
      ) ||
      /^services\/api-nest\/src\/loop\//.test(f) ||
      /schemas\/day-opportunity-pulse\.v1\.json/.test(f) ||
      (/apps\/web\/app\/page\.tsx/.test(f) && true),
    scripts: [
      "day-pulse-live-only.cjs",
      "preflight-may-stop.cjs",
      "loop-psychology.cjs",
    ],
  },
  {
    test: (f) =>
      /packages\/ui\/responsive\//.test(f) ||
      /packages\/ui\/components\/lux\/(VirtualList|VirtualTicker|FluidCard|TouchButton|LivePayoutTicker)\./.test(
        f,
      ) ||
      /packages\/ui\/components\/opportunity\/VirtualOpportunityList\./.test(f) ||
      /packages\/sdk\/src\/device-tier\.ts/.test(f) ||
      /apps\/web\/components\/DeviceTierApply\./.test(f) ||
      /tooling\/verify\/responsive(\.cjs|\/)/.test(f),
    scripts: ["ux-design-system.cjs"],
  },

  {
    test: (f) =>
      /^services\/api-nest\//.test(f) &&
      /(money|bucket|withdraw|deposit|ledger|referral|mission|benefit)/i.test(f),
    scripts: ["pg-module-scan.cjs", "bucket-invariant.cjs"],
  },
  {
    test: (f) =>
      /^services\/api-nest\/src\/current-fx\//.test(f) ||
      /^packages\/sdk\/src\/current-fx\//.test(f) ||
      /^schemas\/current-fx-approx/.test(f) ||
      /^tooling\/verify\/current-fx-consumer\.cjs$/.test(f),
    scripts: ["current-fx-consumer.cjs"],
  },
  {
    test: (f) =>
      /^schemas\/home-money-read\.v1\.json$/.test(f) ||
      /^services\/api-nest\/src\/wallet\/home-money-read/.test(f) ||
      /^packages\/sdk\/src\/home-money-read\//.test(f) ||
      /^tooling\/verify\/home-money-read-contract\.cjs$/.test(f),
    scripts: [
      "home-money-read-contract.cjs",
      "pg-module-scan.cjs",
      "bucket-invariant.cjs",
    ],
  },
  {
    test: (f) =>
      /^schemas\/home-read-model\.v1\.json$/.test(f) ||
      /^services\/market-intelligence\/src\/home-read-model\.cjs$/.test(f) ||
      /^services\/api-nest\/src\/home-read\//.test(f) ||
      /^packages\/sdk\/src\/home-read-model\//.test(f) ||
      /^tooling\/verify\/home-state-truth\.cjs$/.test(f) ||
      /^tooling\/verify\/no-fake-zero-status\.cjs$/.test(f),
    scripts: [
      "home-state-truth.cjs",
      "no-fake-zero-status.cjs",
      "home-money-read-contract.cjs",
      "asset-image-surface.cjs",
      "listing-legs-day1.cjs",
      "adapter-matching-kpi.cjs",
    ],
  },
  {
    test: (f) =>
      /^services\/api-nest\/src\/ledger\/idempotency-fingerprint\.ts$/.test(f) ||
      /^supabase\/migrations\/.*idempotency_request_fingerprint\.sql$/.test(f) ||
      /^tooling\/verify\/idempotency-conflict-detection\.cjs$/.test(f),
    scripts: [
      "idempotency-conflict-detection.cjs",
      "pg-module-scan.cjs",
      "bucket-invariant.cjs",
    ],
  },
  {
    test: (f) =>
      /^services\/api-nest\/src\/ledger\/ledger\.outbox/.test(f) ||
      /^supabase\/migrations\/.*ledger_outbox_events\.sql$/.test(f) ||
      /^tooling\/verify\/committed-event-publication-durability\.cjs$/.test(f),
    scripts: [
      "committed-event-publication-durability.cjs",
      "pg-module-scan.cjs",
      "bucket-invariant.cjs",
    ],
  },
  {
    test: (f) =>
      /^tooling\/verify\/money-wallet-auth-remediation\.cjs$/.test(f) ||
      (/^services\/api-nest\/src\/wallet\/wallet\.controller\.ts$/.test(f) &&
        true),
    scripts: [
      "money-wallet-auth-remediation.cjs",
      "wallet-kyc-session-auth.cjs",
      "practice-non-withdrawable.cjs",
    ],
  },
  {
    test: (f) =>
      /^services\/engine-rust\//.test(f) ||
      (/^services\/api-nest\//.test(f) &&
        /(opportunit|participat|settlement|trade|execution|membership|match)/i.test(f)),
    scripts: ["match-success-rule.cjs", "participate-http.cjs", "execute-rule-loop.cjs"],
  },
  {
    test: (f) =>
      /^workers\/ebay-adapter\//.test(f) ||
      /^services\/market-intelligence\/src\/ebay-identity-match\.cjs$/.test(f) ||
      /^services\/market-intelligence\/src\/(watch|card|bag)-match\.cjs$/.test(f) ||
      /^services\/api-nest\/src\/adapters\//.test(f) ||
      /^tooling\/verify\/ebay-identity-ingest\.cjs$/.test(f) ||
      /^tooling\/ebay-resilience\//.test(f) ||
      /^\.github\/workflows\/ebay-fault-injection\.yml$/.test(f) ||
      /^supabase\/migrations\/.*provider.*\.sql$/.test(f) ||
      /^services\/api-nest\/src\/opportunities\/opportunity-reprice\.service\.ts$/.test(
        f,
      ) ||
      (/catalog-runtime-seed/.test(f) &&
        (/services\/(market-intelligence|api-nest)\//.test(f) ||
          /^tooling\/verify\//.test(f))),
    scripts: [
      "ebay-identity-ingest.cjs",
      "adapter-matching-kpi.cjs",
      "asset-image-surface.cjs",
      "listing-legs-day1.cjs",
      "catalog-runtime-seed.cjs",
      "ebay-resilience.cjs",
      "price-denomination-contract.cjs",
    ],
  },
  {
    test: (f) =>
      /^services\/market-intelligence\/src\/source-observation\//.test(f) ||
      /^schemas\/source-observation\.v1\.json$/.test(f) ||
      /^governance\/global-product\/source-observation-runtime\.v1\.json$/.test(f) ||
      /^tooling\/verify\/source-observation-runtime\.cjs$/.test(f) ||
      /^tooling\/verify\/fashionphile-identity-forensic\.cjs$/.test(f),
    scripts: [
      "source-observation-runtime.cjs",
      "listing-legs-day1.cjs",
      "fashionphile-identity-forensic.cjs",
    ],
  },
  {
    test: (f) =>
      /^services\/market-intelligence\/src\/identity-matching\//.test(f) ||
      /^governance\/global-product\/identity-matching\.v1\.json$/.test(f) ||
      /^tooling\/verify\/identity-matching-v1\.cjs$/.test(f),
    scripts: [
      "identity-matching-v1.cjs",
      "source-observation-runtime.cjs",
      "listing-legs-day1.cjs",
    ],
  },
  {
    test: (f) =>
      /^services\/market-intelligence\/src\/match-result\//.test(f) ||
      /^governance\/global-product\/identity-matching\.v2\.json$/.test(f) ||
      /^tooling\/verify\/match-result-durable-persistence\.cjs$/.test(f) ||
      /^tooling\/verify\/identity-matching-v2\.cjs$/.test(f),
    scripts: [
      "identity-matching-v1.cjs",
      "identity-matching-v2.cjs",
    ],
  },
  {
    test: (f) =>
      /^services\/market-intelligence\/src\/canonical-product\//.test(f) ||
      /^governance\/global-product\/canonical-product\.v2\.json$/.test(f) ||
      /^tooling\/verify\/canonical-product\.cjs$/.test(f),
    scripts: ["canonical-product.cjs"],
  },
  {
    test: (f) =>
      /^services\/market-intelligence\/src\/candidate-generation\//.test(f) ||
      /^governance\/global-product\/candidate-generation\.v1\.json$/.test(f) ||
      /^tooling\/verify\/candidate-generation\.cjs$/.test(f),
    scripts: ["candidate-generation.cjs"],
  },
  {
    test: (f) =>
      /^services\/market-intelligence\/src\/listing-variant-compatibility\//.test(f) ||
      /^governance\/global-product\/listing-variant-compatibility\.v1\.json$/.test(f) ||
      /^tooling\/verify\/listing-variant-compatibility\.cjs$/.test(f),
    scripts: ["listing-variant-compatibility.cjs"],
  },
  {
    test: (f) =>
      /^services\/market-intelligence\/src\/listing-promotion\//.test(f) ||
      /^governance\/global-product\/listing-promotion\.v1\.json$/.test(f) ||
      /^tooling\/verify\/listing-promotion\.cjs$/.test(f) ||
      /^services\/api-nest\/src\/opportunities\/listing-promotion\.contract\.ts$/.test(f),
    scripts: ["listing-promotion.cjs"],
  },
  {
    test: (f) =>
      /^services\/market-intelligence\/src\/executable-economics\//.test(f) ||
      /^governance\/global-product\/executable-economics\.v1\.json$/.test(f) ||
      /^tooling\/verify\/executable-economics\.cjs$/.test(f) ||
      /^services\/api-nest\/src\/opportunities\/executable-economics\.contract\.ts$/.test(f),
    scripts: ["executable-economics.cjs"],
  },
  {
    test: (f) =>
      /^services\/market-intelligence\/src\/multi-source-opportunity\//.test(f) ||
      /^governance\/global-product\/multi-source-opportunity\.v1\.json$/.test(f) ||
      /^tooling\/verify\/multi-source-opportunity\.cjs$/.test(f) ||
      /^services\/api-nest\/src\/opportunities\/multi-source-opportunity\.contract\.ts$/.test(f),
    scripts: ["multi-source-opportunity.cjs"],
  },
  {
    // PTF-00C — shared Engine §0.0 pure-logic package. No prior rule covered
    // this whole directory (only 3 narrow file-specific matches above),
    // which is exactly how the P0-A/P0-B fx-snapshot-formula.cjs/money.cjs
    // edits shipped without a T0 domain check ever firing on them.
    test: (f) => /^services\/market-intelligence\/src\//.test(f),
    scripts: [
      "pricing-formula.cjs",
      "fx-snapshot-formula.cjs",
      "market-intel-engine.cjs",
      "balance-aware-feed.cjs",
      "price-denomination-contract.cjs",
      "ebay-resilience.cjs",
    ],
  },
  {
    test: (f) =>
      /^workers\/(frankfurter|coingecko)-adapter\//.test(f) ||
      /^services\/api-nest\/src\/opportunities\/fx-snapshot\.service\.ts$/.test(f),
    scripts: ["fx-snapshot-formula.cjs", "price-denomination-contract.cjs"],
  },
  {
    test: (f) =>
      (/^services\/api-nest\//.test(f) && /auth/i.test(f)) ||
      /packages\/.*jwt/i.test(f),
    scripts: [
      "auth-jwt-runtime.cjs",
      "auth-flows.cjs",
      "auth-session-cookie.cjs",
    ],
  },
  {
    test: (f) =>
      /krw-deposit/.test(f) ||
      /^schemas\/krw-deposit-request/.test(f) ||
      /krw_deposit_fx_facts/.test(f) ||
      /^tooling\/verify\/krw-deposit-fx-semantics\.cjs$/.test(f) ||
      /^tooling\/verify\/krw-admin-decide\.cjs$/.test(f),
    scripts: [
      "krw-admin-decide.cjs",
      "krw-deposit-fx-semantics.cjs",
      "pg-module-scan.cjs",
      "bucket-invariant.cjs",
      "wallet-kyc-session-auth.cjs",
    ],
  },
  {
    test: (f) =>
      /^services\/api-nest\/src\/wallet\//.test(f) ||
      /^services\/api-nest\/src\/compliance\/kyc\.controller\.ts$/.test(f) ||
      /^services\/api-nest\/src\/ledger\/ledger\.user-journal/.test(f),
    scripts: ["wallet-kyc-session-auth.cjs", "wallet-gap-wire.cjs", "wallet-release.cjs"],
  },
  {
    test: (f) => /^tooling\/verify\//.test(f),
    scripts: [],
  },
];

const {
  isGreenfieldConsumerUi,
  CONSUMER_UI_SURFACE_SCRIPTS,
} = require("./lib/greenfield-consumer.cjs");

function gitLines(cmd) {
  try {
    return execSync(cmd, { cwd: root, encoding: "utf8" })
      .split(/\r?\n/)
      .map((line) => line.trim())
      .filter(Boolean);
  } catch {
    return [];
  }
}

function hasGitHead() {
  try {
    execSync("git rev-parse --verify HEAD", {
      cwd: root,
      stdio: ["ignore", "ignore", "ignore"],
    });
    return true;
  } catch {
    return false;
  }
}

function getChangedFiles() {
  // 최초 커밋(NEW_GREENFIELD_BASELINE)은 HEAD가 없다. T0_ALWAYS만 돈다.
  if (!hasGitHead()) return [];

  const staged = gitLines("git diff --cached --name-only");
  if (staged.length > 0) return staged.map(normalizePath);

  const unstaged = gitLines("git diff --name-only");
  if (unstaged.length > 0) return unstaged.map(normalizePath);

  return gitLines("git diff --name-only HEAD").map(normalizePath);
}

function normalizePath(file) {
  return file.replace(/\\/g, "/");
}

function scriptsForChangedFiles(files) {
  const scripts = new Set();
  for (const file of files) {
    for (const rule of RULES) {
      if (rule.test(file)) {
        for (const script of rule.scripts) scripts.add(script);
      }
    }
  }
  let list = [...scripts];
  if (isGreenfieldConsumerUi()) {
    list = list.filter((s) => !CONSUMER_UI_SURFACE_SCRIPTS.has(s));
  }
  return list;
}

if (require.main === module) {
  const files = getChangedFiles();
  const scripts = scriptsForChangedFiles(files);
  if (files.length === 0) {
    console.log("[verify:domain-by-path] SKIP (no changed files)");
    process.exit(0);
  }
  console.log(
    `[verify:domain-by-path] ${files.length} file(s) → ${scripts.length} domain check(s)`,
  );
  if (scripts.length === 0) {
    process.exit(0);
  }
  const { runGateSteps } = require("./gate-runner.cjs");
  runGateSteps(scripts, "verify:domain-by-path");
} else {
  module.exports = { getChangedFiles, scriptsForChangedFiles };
}
