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
