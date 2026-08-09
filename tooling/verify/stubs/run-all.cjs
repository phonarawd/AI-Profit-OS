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
  "adapter-matching-kpi.cjs",
  "simulation-gate.cjs",
  "pricing-formula.cjs",
  "fx-snapshot-formula.cjs",
  "market-intel-engine.cjs",
  "arbitrage-type-label.cjs",
  "capital-tier-catalog.cjs",
  "asset-image-surface.cjs",
  "trading-card-vertical.cjs",
  "luxury-bag-vertical.cjs",
  "ultra-watch-whale.cjs",
  "match-tension-surface.cjs",
  "auth-flows.cjs",
  "bucket-invariant.cjs",
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
  "fact-freshness.cjs",
  "answer-trace.cjs",
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
  "[verify:stubs] PASS (… · llm-adapter-contract · llm-quota-degrade · ai-coach-fact-only · ai-coach-no-autonomy · ai-general-no-money-tools · ai-lane-router · fact-freshness · answer-trace live; other domain stubs pending)",
);
