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
      /^governance\/figma\//.test(f) ||
      /^tooling\/verify\/figma-project-registry\.cjs$/.test(f) ||
      /^governance\/release-master\/rel-131-account-figma/.test(f) ||
      /^governance\/release-master\/REL-131-ACCOUNT-HUB-FIGMA\.md$/.test(f),
    scripts: ["figma-project-registry.cjs", "locked-visual-reconciliation.cjs"],
  },
  {
    test: (f) =>
      /^governance\/visual-reconciliation\//.test(f) ||
      /^tooling\/verify\/locked-visual-reconciliation\.cjs$/.test(f),
    scripts: ["locked-visual-reconciliation.cjs"],
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
      /^tooling\/e2e\//.test(f) ||
      /^tooling\/verify\/qa-env-isolation-guard\.cjs$/.test(f),
    scripts: ["qa-env-isolation-guard.cjs", "auth-rate-limit.cjs", "axe-harness.cjs"],
  },
  {
    test: (f) =>
      /^apps\/web\/lib\/opportunity-card-map\.ts$/.test(f) ||
      /^apps\/web\/components\/spark-dash-home\/format\.ts$/.test(f) ||
      /^packages\/ui\/components\/opportunity\/money-display\.ts$/.test(f) ||
      /^packages\/ui\/components\/opportunity\/Opportunity(Card|Detail)\.tsx$/.test(
        f,
      ) ||
      /^packages\/ui\/components\/trust\/ParticipateProofPanel\.tsx$/.test(f) ||
      /^tooling\/e2e\/lib\/money-unavailable\.cjs$/.test(f) ||
      /^tooling\/e2e\/specs\/money-unavailable\.spec\.cjs$/.test(f) ||
      /^tooling\/verify\/money-unavailable\.cjs$/.test(f),
    scripts: ["money-unavailable.cjs", "no-it-jargon.cjs"],
  },
  {
    test: (f) =>
      /^supabase\/migrations\//.test(f) ||
      /^tooling\/verify\/migrations-applied-parity\.cjs$/.test(f) ||
      /^tooling\/verify\/fixtures\/migrations-applied\.v1\.json$/.test(f),
    scripts: ["migrations-applied-parity.cjs"],
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
    scripts: ["no-it-jargon.cjs", "mockup-governance.cjs", "canon-surfaces.cjs"],
  },
  {
    test: (f) =>
      /^apps\/web\/app\/(ads|l)\//.test(f) ||
      /^packages\/ui\/components\/landing\//.test(f) ||
      /^tooling\/verify\/landing-guest-closure\.cjs$/.test(f) ||
      /^tooling\/e2e\/specs\/landing-guest\.spec\.cjs$/.test(f),
    scripts: ["landing-guest-closure.cjs", "no-it-jargon.cjs"],
  },
  {
    test: (f) =>
      /^apps\/web\/app\/page\.tsx$/.test(f) ||
      /^apps\/web\/app\/layout\.tsx$/.test(f) ||
      /^apps\/web\/app\/LegacyAppShell\.tsx$/.test(f) ||
      /^apps\/web\/app\/wallet\/layout\.tsx$/.test(f) ||
      /^apps\/web\/app\/HomeDesktopClient\.tsx$/.test(f) ||
      /^apps\/web\/app\/GuestFirstVisit\.tsx$/.test(f) ||
      /^apps\/web\/app\/guest-first-visit\.css$/.test(f) ||
      /^apps\/web\/components\/spark-dash-home\//.test(f) ||
      /^tooling\/verify\/home-closure\.cjs$/.test(f) ||
      /^tooling\/e2e\/specs\/home-closure\.spec\.cjs$/.test(f) ||
      /^tooling\/e2e\/lib\/local-web-runtime\.cjs$/.test(f) ||
      /^tooling\/e2e\/lib\/consumer-route-stubs\.cjs$/.test(f),
    scripts: ["home-closure.cjs", "landing-guest-closure.cjs", "no-it-jargon.cjs"],
  },
  {
    test: (f) =>
      /^apps\/web\/app\/auth\//.test(f) ||
      /^apps\/web\/app\/onboarding\//.test(f) ||
      /^packages\/sdk\/src\/auth\//.test(f) ||
      /^packages\/ui\/components\/(auth|onboarding)\//.test(f) ||
      /^governance\/consumer-acquisition\//.test(f) ||
      /^tooling\/verify\/acquisition-release\.cjs$/.test(f) ||
      /^tooling\/verify\/login-kakao-closure\.cjs$/.test(f) ||
      /^tooling\/verify\/complete-profile-closure\.cjs$/.test(f) ||
      /^tooling\/verify\/onboarding-journey-closure\.cjs$/.test(f),
    scripts: [
      "acquisition-release.cjs",
      "auth-surfaces.cjs",
      "onboarding-experiential.cjs",
    ],
  },
  {
    test: (f) =>
      /^apps\/web\/next\.config\.ts$/.test(f) ||
      /^packages\/ui\/components\/product\/image-hosts\.ts$/.test(f) ||
      /^tooling\/verify\/web-remote-patterns\.cjs$/.test(f),
    scripts: ["web-remote-patterns.cjs", "product-image.cjs"],
  },
  {
    test: (f) =>
      /^apps\/web\//.test(f) || /^tooling\/verify\/web-lint\.cjs$/.test(f),
    scripts: ["web-lint.cjs"],
  },
  {
    test: (f) =>
      /^apps\/web\/public\/manifest\.webmanifest$/.test(f) ||
      /^apps\/web\/public\/sw\.js$/.test(f) ||
      /^apps\/web\/public\/_headers$/.test(f) ||
      /^apps\/web\/public\/icons\//.test(f) ||
      /^apps\/web\/app\/pwa-shell\.css$/.test(f) ||
      /^apps\/web\/app\/layout\.tsx$/.test(f) ||
      /^apps\/web\/components\/pwa\//.test(f) ||
      /^tooling\/verify\/pwa-native-shell\.cjs$/.test(f),
    scripts: ["pwa-native-shell.cjs"],
  },
  {
    test: (f) =>
      /^workers\/push-dispatcher\//.test(f) ||
      /^services\/api-nest\/src\/push\//.test(f) ||
      /^packages\/sdk\/src\/push\//.test(f) ||
      /^governance\/pwa\//.test(f) ||
      /^schemas\/push-/.test(f) ||
      /^tooling\/pwa\//.test(f) ||
      /^tooling\/pwa\/pwa-push-badge-harness\.cjs$/.test(f) ||
      /^tooling\/pwa\/pwa-push-badge\.spec\.cjs$/.test(f) ||
      /^tooling\/verify\/pwa-push-badge\.cjs$/.test(f) ||
      /^apps\/web\/components\/pwa\/PushOptIn\.tsx$/.test(f) ||
      /^apps\/web\/public\/sw\.js$/.test(f),
    scripts: ["pwa-push-badge.cjs", "pwa-native-shell.cjs", "push-channel-prefs.cjs"],
  },
  {
    test: (f) =>
      /^services\/api-nest\/src\/auth\/webauthn-rp\.ts$/.test(f) ||
      /^packages\/ui\/components\/auth\/webauthn-ready\.ts$/.test(f) ||
      /^packages\/ui\/components\/auth\/AuthLogin\.tsx$/.test(f) ||
      /^governance\/pwa\/webauthn-rp/.test(f) ||
      /^tooling\/pwa\/webauthn-/.test(f) ||
      /^tooling\/verify\/webauthn-ux-rp\.cjs$/.test(f),
    scripts: [
      "webauthn-ux-rp.cjs",
      "webauthn-fallback-pointer.cjs",
      "pwa-native-shell.cjs",
      "auth-surfaces.cjs",
    ],
  },
  {
    test: (f) =>
      /^governance\/pwa\/DAY1_CERTIFICATION\.md$/.test(f) ||
      /^governance\/pwa\/day1-checklist/.test(f) ||
      /^tooling\/pwa\/pwa-day1-/.test(f) ||
      /^tooling\/pwa\/lighthouse-pwa/.test(f) ||
      /^tooling\/verify\/pwa-day1-certification\.cjs$/.test(f) ||
      /^apps\/web\/public\/sw\.js$/.test(f),
    scripts: ["pwa-day1-certification.cjs"],
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
      /^apps\/web\/app\/trades\/\[id\]\/settlement\//.test(f) ||
      /^packages\/sdk\/src\/ledger\//.test(f) ||
      /^tooling\/e2e\/specs\/settlement-closure\.spec\.cjs$/.test(f) ||
      /^tooling\/verify\/settlement-detail\.cjs$/.test(f),
    scripts: ["settlement-detail.cjs"],
  },
  {
    test: (f) =>
      /^apps\/web\/app\/trades\/\[id\]\/execute\//.test(f) ||
      /^packages\/sdk\/src\/execution-stream\//.test(f) ||
      /^tooling\/e2e\/specs\/execute-closure\.spec\.cjs$/.test(f) ||
      /^tooling\/verify\/execute-live-wire\.cjs$/.test(f) ||
      /^tooling\/verify\/execute-web-wire\.cjs$/.test(f),
    scripts: ["execute-live-wire.cjs", "execute-web-wire.cjs"],
  },
  {
    test: (f) =>
      /^apps\/web\/app\/trades\/page\.tsx$/.test(f) ||
      /^apps\/web\/app\/trades\/TradesClient\.tsx$/.test(f) ||
      /^apps\/web\/app\/trades\/EarningsEmbed\.tsx$/.test(f) ||
      /^apps\/web\/app\/trades\/trades\.module\.css$/.test(f) ||
      /^packages\/sdk\/src\/trades\//.test(f) ||
      /^tooling\/e2e\/specs\/trades-closure\.spec\.cjs$/.test(f) ||
      /^tooling\/verify\/trades-live-wire\.cjs$/.test(f) ||
      /^tooling\/verify\/trades-web-wire\.cjs$/.test(f) ||
      /^tooling\/verify\/earnings-embed\.cjs$/.test(f),
    scripts: ["trades-live-wire.cjs", "trades-web-wire.cjs", "earnings-embed.cjs"],
  },
  {
    test: (f) =>
      /^tooling\/e2e\/specs\/core-opportunity-journey\.spec\.cjs$/.test(f) ||
      /^tooling\/verify\/core-opportunity-journey\.cjs$/.test(f),
    scripts: ["core-opportunity-journey.cjs"],
  },
  {
    test: (f) =>
      /^apps\/web\/app\/profits\/\[id\]\//.test(f) ||
      /^apps\/web\/components\/spark-dash-room\//.test(f) ||
      /^apps\/web\/app\/dev\/spark-dash-room\//.test(f) ||
      /^packages\/sdk\/src\/participate\//.test(f) ||
      /^tooling\/e2e\/lib\/consumer-route-stubs\.cjs$/.test(f) ||
      /^tooling\/e2e\/specs\/opportunity-detail-closure\.spec\.cjs$/.test(f) ||
      /^tooling\/e2e\/specs\/participate-sheet-closure\.spec\.cjs$/.test(f) ||
      /^tooling\/verify\/opportunity-detail-live-wire\.cjs$/.test(f) ||
      /^tooling\/verify\/participate-web-wire\.cjs$/.test(f) ||
      /^tooling\/verify\/participate-sheet-live-wire\.cjs$/.test(f),
    scripts: [
      "opportunity-detail-live-wire.cjs",
      "participate-web-wire.cjs",
      "participate-sheet-live-wire.cjs",
      "sdk-user-feed.cjs",
    ],
  },
  {
    test: (f) =>
      /^apps\/web\/app\/profits\//.test(f) ||
      /^apps\/web\/app\/ProfitsDesktopClient\.tsx$/.test(f) ||
      /^apps\/web\/components\/spark-dash-profits\//.test(f) ||
      /^apps\/web\/app\/dev\/spark-dash-profits\//.test(f) ||
      /^tooling\/e2e\/specs\/profits-closure\.spec\.cjs$/.test(f) ||
      /^tooling\/verify\/profits-live-wire\.cjs$/.test(f),
    scripts: ["profits-live-wire.cjs", "sdk-user-feed.cjs"],
  },
  {
    test: (f) =>
      /^apps\/web\/app\/wallet\/page\.tsx$/.test(f) ||
      /^apps\/web\/app\/wallet\/WalletClient\.tsx$/.test(f) ||
      /^apps\/web\/app\/wallet\/layout\.tsx$/.test(f) ||
      /^apps\/web\/app\/wallet\/wallet\.module\.css$/.test(f) ||
      /^packages\/sdk\/src\/wallet\//.test(f) ||
      /^packages\/sdk\/src\/wallet\.ts$/.test(f) ||
      /^tooling\/e2e\/specs\/wallet-closure\.spec\.cjs$/.test(f) ||
      /^tooling\/verify\/wallet-closure\.cjs$/.test(f),
    scripts: ["wallet-live-wire.cjs", "wallet-closure.cjs"],
  },
  {
    test: (f) =>
      /^apps\/web\/app\/me\/layout\.tsx$/.test(f) ||
      /^apps\/web\/app\/me\/AccountFrame\.tsx$/.test(f) ||
      /^apps\/web\/app\/me\/account\.module\.css$/.test(f) ||
      /^apps\/web\/app\/me\/invite\//.test(f) ||
      /^packages\/ui\/components\/invite\//.test(f) ||
      /^tooling\/e2e\/lib\/account-route-stubs\.cjs$/.test(f) ||
      /^tooling\/e2e\/specs\/invite-closure\.spec\.cjs$/.test(f) ||
      /^tooling\/verify\/invite-closure\.cjs$/.test(f),
    scripts: [
      "invite-closure.cjs",
      "invite-explain-surfaces.cjs",
      "part5-shell-toast.cjs",
    ],
  },
  {
    test: (f) =>
      /^apps\/web\/app\/me\/inbox\//.test(f) ||
      /^tooling\/e2e\/specs\/inbox-closure\.spec\.cjs$/.test(f) ||
      /^tooling\/verify\/inbox-closure\.cjs$/.test(f),
    scripts: ["inbox-closure.cjs", "ops-inbox.cjs"],
  },
  {
    test: (f) =>
      /^apps\/web\/app\/me\/page\.tsx$/.test(f) ||
      /^apps\/web\/app\/me\/ProfileClient\.tsx$/.test(f) ||
      /^apps\/web\/app\/me\/AccountHub\.tsx$/.test(f) ||
      /^apps\/web\/app\/me\/account-hub/.test(f) ||
      /^tooling\/e2e\/specs\/profile-closure\.spec\.cjs$/.test(f) ||
      /^tooling\/verify\/profile-closure\.cjs$/.test(f),
    scripts: ["profile-closure.cjs", "part5-shell-toast.cjs", "locked-visual-reconciliation.cjs"],
  },
  {
    test: (f) =>
      /^apps\/web\/app\/me\/settings\//.test(f) ||
      /^packages\/ui\/components\/settings\//.test(f) ||
      /^tooling\/e2e\/specs\/settings-closure\.spec\.cjs$/.test(f) ||
      /^tooling\/verify\/settings-closure\.cjs$/.test(f),
    scripts: ["settings-closure.cjs"],
  },
  {
    test: (f) =>
      /^apps\/web\/app\/me\/legal\//.test(f) ||
      /^tooling\/e2e\/specs\/legal-closure\.spec\.cjs$/.test(f) ||
      /^tooling\/verify\/legal-closure\.cjs$/.test(f),
    scripts: ["legal-closure.cjs"],
  },
  {
    test: (f) =>
      /^packages\/ui\/components\/trust\/MarketPartnerGrid\.tsx$/.test(f) ||
      /^tooling\/e2e\/specs\/partner-trust-closure\.spec\.cjs$/.test(f) ||
      /^tooling\/verify\/partner-trust-closure\.cjs$/.test(f),
    scripts: ["partner-trust-closure.cjs"],
  },
  {
    test: (f) =>
      /^apps\/web\/app\/me\/(events|strategies|membership|benefits)\//.test(f) ||
      /^apps\/web\/app\/ads\//.test(f) ||
      /^apps\/web\/app\/l\//.test(f) ||
      /^tooling\/e2e\/specs\/account-journey\.spec\.cjs$/.test(f) ||
      /^tooling\/verify\/account-hub-batch\.cjs$/.test(f) ||
      /^tooling\/verify\/account-journey\.cjs$/.test(f) ||
      /^tooling\/verify\/account-compat-closure\.cjs$/.test(f),
    scripts: [
      "account-hub-batch.cjs",
      "account-compat-closure.cjs",
      "account-journey.cjs",
    ],
  },
  {
    test: (f) =>
      /^apps\/web\/app\/wallet\/history\//.test(f) ||
      /^tooling\/e2e\/specs\/transaction-history-closure\.spec\.cjs$/.test(f) ||
      /^tooling\/verify\/transaction-history-closure\.cjs$/.test(f) ||
      /^tooling\/e2e\/specs\/transaction-detail-closure\.spec\.cjs$/.test(f) ||
      /^tooling\/verify\/transaction-detail-closure\.cjs$/.test(f),
    scripts: [
      "transaction-history-closure.cjs",
      "transaction-detail-closure.cjs",
    ],
  },
  {
    test: (f) =>
      /^apps\/web\/app\/wallet\/withdraw\//.test(f) ||
      /WithdrawLiveForm/.test(f) ||
      /WithdrawAmountPanel/.test(f) ||
      /WithdrawStepUpPanel/.test(f) ||
      /withdraw-flow-wire/.test(f) ||
      /^tooling\/e2e\/specs\/usdt-withdraw-closure\.spec\.cjs$/.test(f) ||
      /^tooling\/verify\/usdt-withdraw-closure\.cjs$/.test(f) ||
      /^tooling\/e2e\/specs\/krw-withdraw-closure\.spec\.cjs$/.test(f) ||
      /^tooling\/verify\/krw-withdraw-closure\.cjs$/.test(f),
    scripts: [
      "withdraw-flow-wire.cjs",
      "wallet-live-wire.cjs",
      "usdt-withdraw-closure.cjs",
      "krw-withdraw-closure.cjs",
    ],
  },
  {
    test: (f) =>
      /^apps\/web\/app\/wallet\/deposit\//.test(f) ||
      /^apps\/web\/app\/me\/kyc\//.test(f) ||
      /^apps\/web\/app\/me\/support\//.test(f) ||
      /stub-page-actions/.test(f) ||
      (/packages\/ui\/components\/kyc\//.test(f) && /KycFlow/.test(f)) ||
      /^tooling\/e2e\/specs\/usdt-deposit-closure\.spec\.cjs$/.test(f) ||
      /^tooling\/verify\/usdt-deposit-closure\.cjs$/.test(f) ||
      /^tooling\/e2e\/specs\/krw-deposit-closure\.spec\.cjs$/.test(f) ||
      /^tooling\/verify\/krw-deposit-closure\.cjs$/.test(f),
    scripts: [
      "stub-page-actions.cjs",
      "usdt-deposit-closure.cjs",
      "krw-deposit-closure.cjs",
      "support-closure.cjs",
    ],
  },
  {
    test: (f) => /^apps\/admin\//.test(f),
    scripts: [
      "no-admin-in-web.cjs",
      "admin-routes.cjs",
      "rel-201-admin-dashboard.cjs",
      "rel-202-admin-users.cjs",
      "rel-203-admin-user-detail.cjs",
      "rel-204-admin-user-finance.cjs",
      "rel-205-admin-ledger.cjs",
      "rel-206-admin-wallet.cjs",
      "rel-207-admin-compliance.cjs",
      "rel-208-admin-risk.cjs",
      "rel-209-admin-execution-policy.cjs",
      "rel-210-admin-opportunities.cjs",
      "rel-211-admin-adapters.cjs",
      "rel-212-admin-support.cjs",
      "rel-213-admin-system-control.cjs",
      "rel-406-kill-switch.cjs",
      "rel-214-admin-audit.cjs",
      "rel-215-admin-ai-logs.cjs",
      "rel-216-admin-financial.cjs",
      "rel-217-admin-growth.cjs",
      "rel-218-admin-growth-deposit.cjs",
      "rel-219-admin-growth-ticker.cjs",
      "rel-220-admin-growth-whale.cjs",
      "rel-221-admin-growth-content.cjs",
    ],
  },
  {
    test: (f) =>
      /^tooling\/verify\/rel-2\d{2}-admin-/.test(f) ||
      /^tooling\/verify\/admin-entry-e2e\.cjs$/.test(f) ||
      /^tooling\/e2e\/specs\/admin-entry-closure\.spec\.cjs$/.test(f) ||
      /^tooling\/e2e\/lib\/local-admin-runtime\.cjs$/.test(f),
    scripts: [
      "rel-201-admin-dashboard.cjs",
      "rel-202-admin-users.cjs",
      "rel-203-admin-user-detail.cjs",
      "rel-204-admin-user-finance.cjs",
      "rel-205-admin-ledger.cjs",
      "rel-206-admin-wallet.cjs",
      "rel-207-admin-compliance.cjs",
      "rel-208-admin-risk.cjs",
      "rel-209-admin-execution-policy.cjs",
      "rel-210-admin-opportunities.cjs",
      "rel-211-admin-adapters.cjs",
      "rel-212-admin-support.cjs",
      "rel-213-admin-system-control.cjs",
      "rel-406-kill-switch.cjs",
      "rel-214-admin-audit.cjs",
      "rel-215-admin-ai-logs.cjs",
      "rel-216-admin-financial.cjs",
      "rel-217-admin-growth.cjs",
      "rel-218-admin-growth-deposit.cjs",
      "rel-219-admin-growth-ticker.cjs",
      "rel-220-admin-growth-whale.cjs",
      "rel-221-admin-growth-content.cjs",
      "admin-entry-e2e.cjs",
    ],
  },
  {
    test: (f) =>
      /^governance\/admin\//.test(f) ||
      /^tooling\/verify\/rel-400-admin-control-plane\.cjs$/.test(f),
    scripts: ["rel-400-admin-control-plane.cjs"],
  },
  {
    test: (f) =>
      /^governance\/security\/http-headers/.test(f) ||
      /^tooling\/security\/http-headers\.cjs$/.test(f) ||
      /^tooling\/verify\/rel-401-security-headers\.cjs$/.test(f) ||
      /^apps\/web\/next\.config\.ts$/.test(f) ||
      /^apps\/admin\/next\.config\.ts$/.test(f) ||
      /^services\/api-nest\/src\/common\/security-headers\.middleware\.ts$/.test(
        f,
      ) ||
      /^services\/api-nest\/src\/main\.ts$/.test(f),
    scripts: ["rel-401-security-headers.cjs"],
  },
  {
    test: (f) =>
      /^governance\/security\/dependency-audit/.test(f) ||
      /^governance\/security\/AUDIT_EXCEPTIONS\.md$/.test(f) ||
      /^governance\/release-master\/REL-402-DEPENDENCY-AUDIT\.md$/.test(f) ||
      /^tooling\/security\/dependency-audit\.cjs$/.test(f) ||
      /^tooling\/verify\/rel-402-dependency-audit\.cjs$/.test(f) ||
      /^\.github\/workflows\/gate\.yml$/.test(f),
    scripts: ["rel-402-dependency-audit.cjs"],
  },
  {
    test: (f) =>
      /^governance\/release-master\/VERSIONING\.md$/.test(f) ||
      /^governance\/release-master\/versioning\.v1\.json$/.test(f) ||
      /^tooling\/release\/version-id\.cjs$/.test(f) ||
      /^tooling\/verify\/rel-403-versioning\.cjs$/.test(f),
    scripts: ["rel-403-versioning.cjs"],
  },
  {
    test: (f) =>
      /^governance\/performance\//.test(f) ||
      /^governance\/release-master\/REL-404-LIGHTHOUSE-BUDGET\.md$/.test(f) ||
      /^tooling\/perf\/lighthouse\.ci\.cjs$/.test(f) ||
      /^tooling\/verify\/rel-404-lighthouse-budget\.cjs$/.test(f) ||
      /^\.github\/workflows\/lighthouse\.yml$/.test(f),
    scripts: ["rel-404-lighthouse-budget.cjs"],
  },
  {
    test: (f) =>
      /^schemas\/admin-audit\.v1\.json$/.test(f) ||
      /^schemas\/admin-rbac\.v1\.json$/.test(f) ||
      /^services\/api-nest\/admin-audit\.core\.cjs$/.test(f) ||
      /^services\/api-nest\/src\/audit\//.test(f) ||
      /^governance\/admin\/rbac-audit/.test(f) ||
      /^governance\/release-master\/REL-405-RBAC-AUDIT\.md$/.test(f) ||
      /^tooling\/verify\/rel-405-rbac-audit\.cjs$/.test(f) ||
      /^supabase\/migrations\/\d+_admin_audit_events\.sql$/.test(f),
    scripts: ["rel-405-rbac-audit.cjs"],
  },
  {
    test: (f) =>
      /^schemas\/admin-kill-switch\.v1\.json$/.test(f) ||
      /^services\/api-nest\/admin-kill-switch\.core\.cjs$/.test(f) ||
      /^services\/api-nest\/src\/kill-switch\//.test(f) ||
      /^governance\/admin\/kill-switch/.test(f) ||
      /^governance\/release-master\/REL-406-KILL-SWITCH\.md$/.test(f) ||
      /^tooling\/verify\/rel-406-kill-switch\.cjs$/.test(f) ||
      /^tooling\/verify\/fixtures\/rel-406-kill-switch\.v1\.json$/.test(f) ||
      /^supabase\/migrations\/\d+_admin_kill_switches\.sql$/.test(f),
    scripts: ["rel-406-kill-switch.cjs"],
  },
  {
    test: (f) =>
      /^schemas\/price-override-layers\.v1\.json$/.test(f) ||
      /^services\/api-nest\/price-override\.core\.cjs$/.test(f) ||
      /^services\/api-nest\/src\/price-override\//.test(f) ||
      /^services\/api-nest\/src\/opportunities\/opportunities\.(admin|user)\.service\.ts$/.test(f) ||
      /^services\/api-nest\/src\/opportunities\/opportunities\.admin\.controller\.ts$/.test(f) ||
      /^governance\/admin\/price-override/.test(f) ||
      /^governance\/release-master\/REL-407-PRICE-OVERRIDE\.md$/.test(f) ||
      /^tooling\/verify\/rel-407-price-override\.cjs$/.test(f) ||
      /^tooling\/verify\/fixtures\/rel-407-price-override\.v1\.json$/.test(f) ||
      /^supabase\/migrations\/\d+_opportunity_price_overrides\.sql$/.test(f),
    scripts: ["rel-407-price-override.cjs"],
  },
  {
    test: (f) =>
      /^governance\/release-master\/SECURITY_BASELINE\.md$/.test(f) ||
      /^governance\/release-master\/ROLLBACK_RUNBOOK\.md$/.test(f) ||
      /^governance\/release-master\/REL-408-SECURITY-BASELINE\.md$/.test(f) ||
      /^tooling\/verify\/rel-408-security-baseline\.cjs$/.test(f) ||
      /^tooling\/verify\/fixtures\/rel-408-security-baseline\.v1\.json$/.test(f),
    scripts: ["rel-408-security-baseline.cjs"],
  },
  {
    test: (f) =>
      /^schemas\/admin-ops-mode\.v1\.json$/.test(f) ||
      /^services\/api-nest\/admin-ops\.core\.cjs$/.test(f) ||
      /^services\/api-nest\/src\/admin-ops\//.test(f) ||
      /^governance\/admin\/admin-ops/.test(f) ||
      /^governance\/release-master\/REL-222-ADMIN-OPS\.md$/.test(f) ||
      /^tooling\/verify\/rel-222-admin-ops\.cjs$/.test(f) ||
      /^tooling\/verify\/fixtures\/rel-222-admin-ops\.v1\.json$/.test(f) ||
      /^supabase\/migrations\/\d+_admin_ops_intents\.sql$/.test(f),
    scripts: ["rel-222-admin-ops.cjs"],
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
      /^tooling\/verify\/privacy-purge\.cjs$/.test(f),
    scripts: ["privacy-purge.cjs", "auth-flows.cjs", "auth-jwt-runtime.cjs"],
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
      "asset-image-surface.cjs",
    ],
  },
  {
    test: (f) =>
      /packages\/ui\/components\/peotteok\//.test(f) ||
      /packages\/ui\/copy\/ko\/peotteok\.ts/.test(f) ||
      /packages\/ui\/canon\/surfaces\/peotteok/.test(f) ||
      /apps\/web\/app\/me\/peotteok\//.test(f) ||
      /packages\/sdk\/src\/peotteok\//.test(f) ||
      /^tooling\/e2e\/specs\/peotteok-closure\.spec\.cjs$/.test(f) ||
      /^tooling\/verify\/peotteok-closure\.cjs$/.test(f),
    scripts: [
      "ai-coach-ui.cjs",
      "canon-surfaces.cjs",
      "ai-coach-fact-only.cjs",
      "ai-coach-no-autonomy.cjs",
      "ai-coach-runtime.cjs",
      "age-tone-surfaces.cjs",
      "peotteok-closure.cjs",
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
      "ai-coach-runtime.cjs",
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
      "ai-coach-runtime.cjs",
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
      /^eval\/(s_safe_refuse|coach_redteam)\.jsonl$/.test(f) ||
      /^tooling\/verify\/ai-coach-runtime\.cjs$/.test(f) ||
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
      "canon-surfaces.cjs",
    ],
  },
  {
    test: (f) =>
      /packages\/ui\/components\/kyc\//.test(f) ||
      /packages\/ui\/copy\/ko\/kyc\.ts/.test(f) ||
      /packages\/ui\/canon\/surfaces\/kyc-/.test(f) ||
      /apps\/web\/app\/me\/kyc\//.test(f) ||
      /^tooling\/e2e\/specs\/kyc-closure\.spec\.cjs$/.test(f) ||
      /^tooling\/verify\/kyc-closure\.cjs$/.test(f),
    scripts: ["kyc-surfaces.cjs", "canon-surfaces.cjs", "kyc-closure.cjs"],
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
      "guides-closure.cjs",
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
      "push-channel-prefs.cjs",
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
    scripts: ["responsive.cjs", "ux-design-system.cjs"],
  },

  {
    test: (f) =>
      /^services\/api-nest\//.test(f) &&
      /(money|bucket|withdraw|deposit|ledger|referral|mission|benefit)/i.test(f),
    scripts: ["pg-module-scan.cjs", "bucket-invariant.cjs"],
  },
  {
    test: (f) =>
      /^services\/api-nest\/src\/ledger\/ledger\.user/.test(f) ||
      /^services\/api-nest\/ledger-user-query\.core\.cjs$/.test(f) ||
      /^tooling\/e2e\/lib\/ledger-user-query-harness\.cjs$/.test(f) ||
      /^tooling\/e2e\/specs\/ledger-user-query\.spec\.cjs$/.test(f) ||
      /^tooling\/verify\/user-ledger-query\.cjs$/.test(f),
    scripts: ["user-ledger-query.cjs"],
  },
  {
    test: (f) =>
      /^governance\/observability\//.test(f) ||
      /^packages\/observability\//.test(f) ||
      /^services\/api-nest\/src\/observability\//.test(f) ||
      /^apps\/web\/components\/observability\//.test(f) ||
      /^tooling\/verify\/observability\.cjs$/.test(f),
    scripts: ["observability.cjs"],
  },
  {
    test: (f) =>
      /^governance\/legacy-plan-migration\//.test(f) ||
      /^tooling\/legacy-plan-stamp\.cjs$/.test(f) ||
      /^tooling\/verify\/legacy-plan-migration\.cjs$/.test(f) ||
      /^\.cursor\/plans\/.+\.plan\.md$/.test(f),
    scripts: ["legacy-plan-migration.cjs"],
  },
  {
    test: (f) =>
      /^apps\/web\/scripts\/asset-pipeline\//.test(f) ||
      /^tooling\/verify\/asset-production-pipeline\.cjs$/.test(f),
    scripts: ["asset-production-pipeline.cjs"],
  },
  {
    test: (f) =>
      /^packages\/sdk\/src\/device-tier\.ts$/.test(f) ||
      /^packages\/ui\/tokens\/device-tier-contract\.ts$/.test(f) ||
      /^governance\/responsive\//.test(f) ||
      /^tooling\/verify\/device-tier-system\.cjs$/.test(f) ||
      /^tooling\/verify\/ux-design-system\.cjs$/.test(f),
    scripts: ["device-tier-system.cjs", "ux-design-system.cjs"],
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
      /^tooling\/verify\/settlement-rule-parity\.cjs$/.test(f) ||
      (/^services\/api-nest\//.test(f) &&
        /(opportunit|participat|settlement|trade|execution|membership|match)/i.test(f)),
    scripts: [
      "match-success-rule.cjs",
      "settlement-rule-parity.cjs",
      "participate-http.cjs",
      "execute-rule-loop.cjs",
    ],
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
      "auth-rate-limit.cjs",
    ],
  },
  {
    test: (f) =>
      /^services\/api-nest\/src\/wallet\//.test(f) ||
      /^services\/api-nest\/src\/compliance\/kyc\.controller\.ts$/.test(f),
    scripts: ["wallet-kyc-session-auth.cjs"],
  },
  {
    test: (f) => /^tooling\/verify\//.test(f),
    scripts: [],
  },
];

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

function getChangedFiles() {
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
  return [...scripts];
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
