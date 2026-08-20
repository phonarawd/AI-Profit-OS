/** Domain stubs — harden when apps/services land; copy/Canon locks run live */
const { spawnSync } = require("child_process");
const path = require("path");

const root = path.resolve(__dirname, "../..");
const live = [
  "cta-earn-profit.cjs",
  "user-trader-jargon-0.cjs",
  "soft-hard-requeue-sla.cjs",
  "match-success-rule.cjs",
  "match-strictness.cjs",
  "no-success-rate-percent.cjs",
  "membership-ladder.cjs",
  "membership-daily-cap.cjs",
  "no-fulfill-rate-as-rule.cjs",
  "listing-legs-day1.cjs",
  "signup-ready-adapters.cjs",
  "market-partner-adapters.cjs",
  "market-partner-trust.cjs",
  "adapter-matching-kpi.cjs",
  "simulation-gate.cjs",
  "pricing-formula.cjs",
  "fx-snapshot-formula.cjs",
  "market-intel-engine.cjs",
  "arbitrage-type-label.cjs",
  "capital-tier-catalog.cjs",
  "catalog-runtime-seed.cjs",
  "asset-image-surface.cjs",
  "trading-card-vertical.cjs",
  "luxury-bag-vertical.cjs",
  "ultra-watch-whale.cjs",
  "match-tension-surface.cjs",
  "auth-flows.cjs",
  "bucket-invariant.cjs",
  "home-money-read-contract.cjs",
  "home-state-truth.cjs",
  "no-fake-zero-status.cjs",
  "withdraw-mode-default.cjs",
  "principal-withdraw-reachable.cjs",
  "withdraw-fee-ledger.cjs",
  "min-holding-scope.cjs",
  "krw-admin-decide.cjs",
  "kyc-withdraw-only.cjs",
  "kyc-r2-only.cjs",
  "kyc-redirect.cjs",
  "webauthn-fallback-pointer.cjs",
  "email-provider-resend.cjs",
  "deposit-confirm-stages.cjs",
  "no-per-address-poll.cjs",
  "sweeper-trx-guard.cjs",
  "principal-profit-abuse.cjs",
  "balance-aware-feed.cjs",
  "admin-user-opportunity-override.cjs",
  "deposit-network-plain-ko.cjs",
  "referral-unlimited-invites.cjs",
  "referral-pool-fifo.cjs",
  "referral-ledger.cjs",
  "referral-ladder.cjs",
  "referral-idempotency.cjs",
  "share-copy.cjs",
  "practice-non-withdrawable.cjs",
  "mission-auto-payout.cjs",
  "mission-idempotency.cjs",
  "mission-no-manual-grant.cjs",
  "benefit-g4-ledger-separation.cjs",
  "llm-adapter-contract.cjs",
  "llm-quota-degrade.cjs",
  "ai-coach-fact-only.cjs",
  "ai-coach-no-autonomy.cjs",
  "ai-general-no-money-tools.cjs",
  "ai-lane-router.cjs",
  "routing-coverage.cjs",
  "ai-scope-guard.cjs",
  "numeric-grounding.cjs",
  "fact-freshness.cjs",
  "answer-trace.cjs",
  "conversation-state-bounded.cjs",
  "reference-resolution.cjs",
  // P0-2 (Engine Final Re-Verification Audit) — previously implemented but
  // never enforced by verify:gate; wired in so a future regression fails CI.
  "user-opportunity-feed.cjs",
  "participate-http.cjs",
  "execute-rule-loop.cjs",
  "catalog-runtime-seed.cjs",
  "benefit-hub-surfaces.cjs",
  // PART7c/7d — membership grade UX · notify prefs · ops inbox
  "membership-surfaces.cjs",
  "membership-badge-assets.cjs",
  "ops-inbox.cjs",
  "notification-prefs-default-on.cjs",
  "push-channel-prefs.cjs",
  // P0-1 — real JWT sign/verify/tamper/expiry round-trip (see jwt.core.cjs)
  "auth-jwt-runtime.cjs",
  // PART1 korean-first-copy · mockup-governance · ux-design-system
  "korean-ui.cjs",
  "age-tone-surfaces.cjs",
  "toast-emoji.cjs",
  "cute-emoji-palette.cjs",
  "no-it-jargon.cjs",
  "mockup-governance.cjs",
  "canon-surfaces.cjs",
  "brand-logo-single.cjs",
  "font-scale-three.cjs",
  "ux-design-system.cjs",
  // PART2 onboarding · auth · landing
  "onboarding-experiential.cjs",
  "auth-surfaces.cjs",
  "landing-3s.cjs",
  "operator-footer.cjs",
  "marketing-compliance.cjs",
  // PART3 opportunity scan · CTA · margin · asset · balance-aware UI
  "opportunity-scan-surface.cjs",
  "margin-compare-surface.cjs",
  "product-image.cjs",
  // PART4 useTradeExecution (Phase0 polling · Phase1+ SSE boundary) + §48 surfaces
  "trade-execution-hook.cjs",
  "execution-surfaces.cjs",
  "match-tension-surface.cjs",
  // PART4b peotteok coach UI
  "ai-coach-ui.cjs",
  "age-tone-surfaces.cjs",

  // PART5 ticker · shell · wallet · settings/legal · toast · plain-ko
  "ticker-pii-0.cjs",
  "legal-plain-ko.cjs",
  "part5-shell-toast.cjs",
  // PART8a §51.24 Loop Psychology · DayPulse · PreCTA
  "day-pulse-live-only.cjs",
  "preflight-may-stop.cjs",
  "loop-psychology.cjs",
  // PART9-pre2 session · PART9c/9d/9e/9f/9g/9i live
  "auth-session-cookie.cjs",
  "wallet-kyc-session-auth.cjs",
  "home-live-wire.cjs",
  "sdk-user-feed.cjs",
  "home-principal-slots.cjs",
  "profits-live-wire.cjs",
  "wallet-live-wire.cjs",
  "withdraw-flow-wire.cjs",
  "growth-public-surface.cjs",
  "stub-page-actions.cjs",
  // PART8b §51.16~21 trust surfaces · Weekly Market Briefing
  "market-briefing-no-investment-advice.cjs",
  "participate-proof.cjs",
  "deposit-ai-template-path.cjs",
  // Visual regression harness (Canon structure · multi-viewport · ADR-013)
  "responsive.cjs",
  // PART6 KYC · trust education · get-usdt
  "kyc-surfaces.cjs",
  "trust-copy.cjs",
  "tax-disclaimer.cjs",
  "objection4.cjs",
  // PTF-00C P0-A/P0-B/P0-C/P0-D — price denomination + ebay resilience,
  // enforced from day 1 (not left manual-only like the P0-2 precedent above).
  "price-denomination-contract.cjs",
  "ebay-resilience.cjs",
];

let failed = false;
for (const step of live) {
  const r = spawnSync(process.execPath, [path.join(__dirname, "..", step)], {
    cwd: root,
    encoding: "utf8",
  });
  process.stdout.write(r.stdout || "");
  process.stderr.write(r.stderr || "");
  if (r.status !== 0) {
    failed = true;
    console.error(`[verify:stubs] FAIL at ${step}`);
    break;
  }
}

if (failed) process.exit(1);
console.log(
  "[verify:stubs] PASS (… · llm-adapter-contract · llm-quota-degrade · ai-coach-fact-only · ai-coach-no-autonomy · ai-general-no-money-tools · ai-lane-router · fact-freshness · answer-trace · user-opportunity-feed · participate-http · execute-rule-loop · catalog-runtime-seed · benefit-hub-surfaces · auth-jwt-runtime live; other domain stubs pending)",
);
