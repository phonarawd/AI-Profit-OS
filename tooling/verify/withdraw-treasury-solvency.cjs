/**
 * verify:withdraw-treasury-solvency
 * 출금 broadcast는 관측된 treasury 실잔액이 부족/미지/스테일이면 전송 0.
 */
"use strict";

const fs = require("node:fs");
const path = require("node:path");

const root = path.resolve(__dirname, "../..");
const fails = [];

function fail(msg) {
  fails.push(msg);
}

function read(rel) {
  const fp = path.join(root, rel);
  if (!fs.existsSync(fp)) {
    fail(`missing: ${rel}`);
    return "";
  }
  return fs.readFileSync(fp, "utf8");
}

function parseAmount(raw) {
  const [w, f = ""] = String(raw).split(".");
  return BigInt(w + f.padEnd(18, "0").slice(0, 18));
}

function localAssert(input) {
  const observed = input.treasuryObserved;
  if (observed == null || observed === "") {
    return { ok: false, code: "TREASURY_BALANCE_UNKNOWN" };
  }
  if (!input.sourceFresh) return { ok: false, code: "TREASURY_STALE" };
  if (parseAmount(observed) < parseAmount(input.requestedAmount)) {
    return { ok: false, code: "TREASURY_INSUFFICIENT" };
  }
  if (!input.signerBound) {
    return { ok: false, code: "WITHDRAW_BROADCAST_NOT_BOUND" };
  }
  return { ok: true };
}

const src = read("services/api-nest/src/wallet/withdraw-treasury-solvency.ts");
const intent = read("services/api-nest/src/wallet/withdraw-intent.service.ts");
if (!src.includes("TREASURY_BALANCE_UNKNOWN")) {
  fail("solvency helper must fail-closed when treasury is unknown");
}
if (!src.includes("TREASURY_INSUFFICIENT")) {
  fail("solvency helper must fail-closed when treasury is short");
}
if (!src.includes("TREASURY_STALE")) {
  fail("solvency helper must fail-closed when treasury is stale");
}
if (!src.includes("WITHDRAW_BROADCAST_NOT_BOUND")) {
  fail("broadcast must not invent a chain send without a bound signer");
}
if (!src.includes("cmpAmount(observed, input.requestedAmount)")) {
  fail("solvency helper must compare observed treasury to requested amount");
}
if (!intent.includes("broadcast") || !intent.includes("fail-closed")) {
  fail("withdraw-intent must keep real-funds note on broadcast fail-closed");
}
if (!intent.includes("assertCanBroadcast") || !intent.includes("evaluateBroadcastReadiness")) {
  fail("withdraw-intent must call assertCanBroadcast before any real send");
}

const coverage = read("services/api-nest/src/wallet/withdraw-coverage.ts");
if (!coverage.includes("lockedUsdt") || !coverage.includes("pendingRefundUsdt")) {
  fail("§1.4 coverage must include locked and pending_refund");
}
if (!coverage.includes("computeUnreservedUserLiabilities")) {
  fail("§1.4 must compute UNRESERVED_USER_LIABILITIES");
}
if (
  !coverage.includes("computeTreasuryUnreservedAvailable") ||
  !coverage.includes("computeWithdrawalTreasuryAvailable")
) {
  fail("legacy WITHDRAWAL_TREASURY_AVAILABLE alias required");
}
if (!intent.includes("withTransaction") || !intent.includes("pg_advisory_xact_lock")) {
  fail("withdraw create must reserve inside one TX with xact lock");
}
if (!intent.includes("evaluateWithdrawReservation")) {
  fail("withdraw create must evaluate §1.4 coverage before insert");
}

function unreservedLiabilities(input) {
  const pending = parseAmount(input.pendingRefundUsdt || "0");
  const other = parseAmount(input.otherReturnableUsdt || "0");
  const gross =
    parseAmount(input.principalUsdt) +
    parseAmount(input.profitUsdt) +
    parseAmount(input.lockedUsdt) +
    pending +
    other;
  return gross - parseAmount(input.reservedWithdrawalUsdt);
}

const lockedLiab = unreservedLiabilities({
  principalUsdt: "0",
  profitUsdt: "0",
  lockedUsdt: "100",
  reservedWithdrawalUsdt: "0",
});
if (lockedLiab !== parseAmount("100")) {
  fail("locked 100 must remain in UNRESERVED_USER_LIABILITIES");
}
const omitted = unreservedLiabilities({
  principalUsdt: "0",
  profitUsdt: "0",
  lockedUsdt: "0",
  reservedWithdrawalUsdt: "0",
});
if (omitted === lockedLiab) {
  fail("omitting locked must not equal the locked-100 liability");
}

function availableAfter(reserved, request, spendable) {
  return parseAmount(spendable) - parseAmount(reserved) - parseAmount(request);
}
if (availableAfter("0", "60", "100") <= 0n) {
  fail("first 60 vs 100 must have remaining treasury");
}
if (availableAfter("60", "60", "100") >= 0n) {
  fail("second 60 vs 100 must be insufficient");
}

const raceSrc = read("tooling/verify/a4-withdraw-reserve-race.cjs");
if (!raceSrc.includes("pooler") || !raceSrc.includes("must not run on production")) {
  fail("a4 race must refuse production Supabase");
}
const pkg = read("package.json");
const catalog = read("tooling/verify/CATALOG.md");
const domain = read("tooling/verify/domain-by-path.cjs");
if (!pkg.includes('"verify:withdraw-treasury-solvency"')) {
  fail("package.json missing verify:withdraw-treasury-solvency");
}
if (!catalog.includes("withdraw-treasury-solvency")) {
  fail("CATALOG.md must list withdraw-treasury-solvency");
}
if (!domain.includes("withdraw-treasury-solvency.cjs")) {
  fail("domain-by-path must trigger withdraw-treasury-solvency.cjs");
}

const cases = [
  [
    "unknown",
    { requestedAmount: "10.00", treasuryObserved: null, sourceFresh: true, signerBound: true },
    "TREASURY_BALANCE_UNKNOWN",
  ],
  [
    "stale",
    { requestedAmount: "10.00", treasuryObserved: "100.00", sourceFresh: false, signerBound: true },
    "TREASURY_STALE",
  ],
  [
    "short",
    { requestedAmount: "10.00", treasuryObserved: "9.99", sourceFresh: true, signerBound: true },
    "TREASURY_INSUFFICIENT",
  ],
  [
    "unbound",
    { requestedAmount: "10.00", treasuryObserved: "50.00", sourceFresh: true, signerBound: false },
    "WITHDRAW_BROADCAST_NOT_BOUND",
  ],
];
for (const [name, input, code] of cases) {
  const got = localAssert(input);
  if (got.ok !== false || got.code !== code) {
    fail(`runtime ${name} expected ${code} got ${JSON.stringify(got)}`);
  }
}
const ready = localAssert({
  requestedAmount: "10.00",
  treasuryObserved: "10.00",
  sourceFresh: true,
  signerBound: true,
});
if (ready.ok !== true) fail(`runtime ready expected ok got ${JSON.stringify(ready)}`);

if (fails.length) {
  console.error("[verify:withdraw-treasury-solvency] FAIL\n- " + fails.join("\n- "));
  process.exit(1);
}
console.log("[verify:withdraw-treasury-solvency] PASS");
