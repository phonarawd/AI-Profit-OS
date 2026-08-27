/**
 * verify:idempotency-conflict-detection — Money post-r0
 * same key + semantic-different payload → conflict · same payload → reuse
 */
const fs = require("fs");
const path = require("path");
const { spawnSync } = require("child_process");

const root = path.resolve(__dirname, "../..");
const fails = [];

function mustExist(rel) {
  if (!fs.existsSync(path.join(root, rel))) fails.push(`missing: ${rel}`);
}
function read(rel) {
  const p = path.join(root, rel);
  return fs.existsSync(p) ? fs.readFileSync(p, "utf8") : "";
}

mustExist("services/api-nest/src/ledger/idempotency-fingerprint.ts");
mustExist(
  "supabase/migrations/20260811062000_idempotency_request_fingerprint.sql",
);
mustExist("services/api-nest/src/ledger/ledger.posting.service.ts");
mustExist("services/api-nest/src/opportunities/participate.service.ts");
mustExist("services/api-nest/src/wallet/wallet-idempotency.selftest.ts");

const fp = read("services/api-nest/src/ledger/idempotency-fingerprint.ts");
for (const n of [
  "fingerprintPayload",
  "assertFingerprintMatch",
  "ledgerJournalSemantic",
  "participateSemantic",
  "IDEMPOTENCY_KEY_CONFLICT",
]) {
  if (!fp.includes(n)) fails.push(`idempotency-fingerprint missing ${n}`);
}

const mig = read(
  "supabase/migrations/20260811062000_idempotency_request_fingerprint.sql",
);
if (!/ledger_journals[\s\S]*request_fingerprint/.test(mig)) {
  fails.push("migration must add ledger_journals.request_fingerprint");
}
if (!/participate_requests[\s\S]*request_fingerprint/.test(mig)) {
  fails.push("migration must add participate_requests.request_fingerprint");
}

const posting = read("services/api-nest/src/ledger/ledger.posting.service.ts");
if (!posting.includes("request_fingerprint")) {
  fails.push("ledger.posting must persist request_fingerprint");
}
if (!posting.includes("assertFingerprintMatch") && !posting.includes("assertExistingFingerprint")) {
  fails.push("ledger.posting must assert fingerprint on reuse");
}
if (!posting.includes("fingerprintPayload")) {
  fails.push("ledger.posting must compute fingerprintPayload");
}

const part = read("services/api-nest/src/opportunities/participate.service.ts");
if (!part.includes("request_fingerprint")) {
  fails.push("participate must persist request_fingerprint");
}
if (!part.includes("assertFingerprintMatch")) {
  fails.push("participate must assertFingerprintMatch on reuse");
}
if (!part.includes("participateSemantic")) {
  fails.push("participate must use participateSemantic");
}

const krw = read("services/api-nest/src/wallet/krw-deposit.service.ts");
const withdraw = read("services/api-nest/src/wallet/withdraw-intent.service.ts");
const depositClient = read("apps/web/app/wallet/deposit/DepositClient.tsx");
const withdrawClient = read("apps/web/components/WithdrawLiveForm.tsx");
const walletSdk = read("packages/sdk/src/wallet/fetch.ts");

for (const needle of [
  "assertIdempotentRequest",
  "row.user_id === input.userId",
  "row.requested_amount_krw === input.requestedAmountKrw",
  "IDEMPOTENCY_KEY_CONFLICT",
]) {
  if (!krw.includes(needle)) fails.push(`KRW idempotency missing ${needle}`);
}
if (
  krw.indexOf("WHERE idempotency_key = $1") >
  krw.indexOf('await this.killSwitch.assertPath("deposit")')
) {
  fails.push("KRW durable recovery lookup must precede create-only kill switch");
}

for (const needle of [
  "assertIdempotentIntent",
  "row.user_id === intent.userId",
  "row.mode === intent.mode",
  "row.amount_usdt === intent.amountUsdt",
  "(row.destination ?? \"\") === intent.destination",
  "IDEMPOTENCY_KEY_CONFLICT",
]) {
  if (!withdraw.includes(needle)) fails.push(`withdraw idempotency missing ${needle}`);
}
if (
  withdraw.indexOf("WHERE idempotency_key = $1") >
  withdraw.indexOf("await this.assertNotApplyBlocked(input.userId)")
) {
  fails.push("withdraw durable recovery lookup must precede create-only guards");
}

if (/idempotencyKey:[^\n]*Date\.now\(\)|Math\.random\(\)/.test(depositClient)) {
  fails.push("KRW client must not mint weak per-submit idempotency keys");
}
for (const needle of ["krwSubmitInFlight", "krwIntent", "crypto.randomUUID"]) {
  if (!depositClient.includes(needle)) fails.push(`KRW client retry lifecycle missing ${needle}`);
}
for (const needle of ["submitInFlight", "withdrawIntent", "fingerprint"]) {
  if (!withdrawClient.includes(needle)) fails.push(`withdraw client retry lifecycle missing ${needle}`);
}
for (const needle of [
  "normalizeWithdrawAmountUsdt",
  "WITHDRAW_AMOUNT_SCALE = 18",
  "BigInt(",
]) {
  if (!walletSdk.includes(needle)) {
    fails.push(`withdraw SDK amount canonicalization missing ${needle}`);
  }
}
if (!withdrawClient.includes("normalizeWithdrawAmountUsdt(amountUsdt)")) {
  fails.push("withdraw client fingerprint must use the canonical 18-decimal amount");
}
if (walletSdk.includes("Math.random()") || walletSdk.includes("Date.now()")) {
  fails.push("withdraw SDK idempotency key must require cryptographic randomness");
}

const pkg = JSON.parse(read("package.json"));
if (!pkg.scripts?.["verify:idempotency-conflict-detection"]) {
  fails.push("package.json missing verify:idempotency-conflict-detection");
}
const catalog = read("tooling/verify/CATALOG.md");
if (!catalog.includes("idempotency-conflict-detection")) {
  fails.push("CATALOG.md missing idempotency-conflict-detection");
}

if (fails.length === 0) {
  const tscBin = require.resolve("typescript/bin/tsc");
  const build = spawnSync(
    process.execPath,
    [tscBin, "-p", path.join(root, "services/api-nest/tsconfig.json")],
    { cwd: root, encoding: "utf8" },
  );
  process.stdout.write(build.stdout || "");
  process.stderr.write(build.stderr || "");
  if (build.status !== 0) {
    fails.push("services/api-nest tsc build failed - cannot run wallet idempotency selftest");
  } else {
    const selftestJs = path.join(
      root,
      "services/api-nest/dist/wallet/wallet-idempotency.selftest.js",
    );
    const run = spawnSync(process.execPath, [selftestJs], {
      cwd: root,
      encoding: "utf8",
      timeout: 60_000,
      env: { ...process.env, NODE_ENV: "test" },
    });
    process.stdout.write(run.stdout || "");
    process.stderr.write(run.stderr || "");
    if (run.status !== 0 || !(run.stdout || "").includes("ALL PASS")) {
      fails.push("wallet-idempotency.selftest did not report ALL PASS");
    }
  }
}

if (fails.length) {
  console.error("[verify:idempotency-conflict-detection] FAIL");
  for (const f of fails) console.error(`  - ${f}`);
  process.exit(1);
}
console.log(
  "[verify:idempotency-conflict-detection] PASS (ledger+participate fingerprints · wallet runtime owner/semantic/race recovery · canonical cryptographic client retries)",
);
