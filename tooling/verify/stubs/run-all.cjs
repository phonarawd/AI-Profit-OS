/** Domain stubs (T1) — live checkers only; mixed/UI verifiers moved to backend/run-all.cjs or handed off to putduk-web */
const { spawnSync } = require("child_process");
const path = require("path");

const root = path.resolve(__dirname, "../..");
const live = [
  "match-success-rule.cjs",
  "listing-legs-day1.cjs",
  "signup-ready-adapters.cjs",
  "market-partner-adapters.cjs",
  "market-partner-trust.cjs",
  "pricing-formula.cjs",
  "fx-snapshot-formula.cjs",
  "catalog-runtime-seed.cjs",
  "bucket-invariant.cjs",
  "home-money-read-contract.cjs",
  "no-fake-zero-status.cjs",
  "min-holding-scope.cjs",
  "kyc-r2-only.cjs",
  "webauthn-fallback-pointer.cjs",
  "email-provider-resend.cjs",
  "deposit-confirm-stages.cjs",
  "no-per-address-poll.cjs",
  "referral-ledger.cjs",
  "referral-ladder.cjs",
  "referral-idempotency.cjs",
  "mission-auto-payout.cjs",
  "mission-idempotency.cjs",
  "mission-no-manual-grant.cjs",
  "benefit-g4-ledger-separation.cjs",
  "llm-adapter-contract.cjs",
  "llm-quota-degrade.cjs",
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
  "user-opportunity-feed.cjs",
  "participate-http.cjs",
  "execute-rule-loop.cjs",
  "notification-prefs-default-on.cjs",
  "push-channel-prefs.cjs",
  "auth-jwt-runtime.cjs",
  "age-tone-surfaces.cjs",
  "operator-footer.cjs",
  "auth-session-cookie.cjs",
  "wallet-kyc-session-auth.cjs",
  "growth-public-surface.cjs",
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
console.log(`[verify:stubs] PASS (${live.length} live domain checkers · mixed verifiers = verify:backend)`);
