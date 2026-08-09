/** Domain stubs — harden when apps/services land; copy/Canon locks run live */
const { spawnSync } = require("child_process");
const path = require("path");

const root = path.resolve(__dirname, "../..");
const live = [
  "cta-earn-profit.cjs",
  "soft-hard-requeue-sla.cjs",
  "listing-legs-day1.cjs",
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
  "deposit-network-plain-ko.cjs",
  "referral-unlimited-invites.cjs",
  "referral-pool-fifo.cjs",
  "referral-ledger.cjs",
  "referral-ladder.cjs",
  "referral-idempotency.cjs",
  "share-copy.cjs",
  "practice-non-withdrawable.cjs",
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
  "[verify:stubs] PASS (cta-earn-profit · soft-hard-requeue-sla · listing-legs-day1 · match-tension-surface · auth-flows · bucket-invariant · withdraw-mode-default · principal-withdraw-reachable · withdraw-fee-ledger · min-holding-scope · krw-admin-decide · kyc-withdraw-only · kyc-r2-only · kyc-redirect · webauthn-fallback-pointer · email-provider-resend · deposit-confirm-stages · no-per-address-poll · sweeper-trx-guard · principal-profit-abuse · balance-aware-feed · deposit-network-plain-ko · referral-* · share-copy · practice-non-withdrawable live; other domain stubs pending)",
);
