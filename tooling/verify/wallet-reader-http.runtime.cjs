/**
 * #91 — wallet reader + HTTP 매트릭스 (Next 0).
 * 실제 packages/sdk/src/wallet/fetch.ts 를 strip-types로 실행한다.
 */
"use strict";

const { spawnSync } = require("node:child_process");
const fs = require("node:fs");
const path = require("node:path");
const { pathToFileURL } = require("node:url");

const root = path.resolve(__dirname, "../..");
const fetchTs = pathToFileURL(
  path.join(root, "packages/sdk/src/wallet/fetch.ts"),
).href;
const clientSrc = fs.readFileSync(
  path.join(root, "apps/web/app/wallet/WalletClient.tsx"),
  "utf8",
);

if (
  !clientSrc.includes('msg.includes("wallet_buckets_401")') ||
  !clientSrc.includes('isAuthFailure(err) ? "unauthorized" : "unavailable"')
) {
  console.error(
    "[wallet-reader-http] WalletClient must map 401→unauthorized, else unavailable",
  );
  process.exit(1);
}

const runner = `
import { normalizeWalletBuckets, fetchWalletBuckets } from ${JSON.stringify(fetchTs)};

const MONEY = [
  "principalUsdt",
  "profitUsdt",
  "lockedUsdt",
  "practiceUsdt",
  "liabilityUsdt",
];

const base = {
  userId: "11111111-1111-4111-8111-111111111111",
  principalUsdt: "0",
  profitUsdt: "0",
  lockedUsdt: "0",
  practiceUsdt: "0",
  liabilityUsdt: "0",
  asOfLedgerEntryId: "le_1",
};

function expectThrow(name, raw) {
  try {
    normalizeWalletBuckets(raw);
    throw new Error("EXPECTED_THROW:" + name);
  } catch (err) {
    if (String(err && err.message).startsWith("EXPECTED_THROW:")) throw err;
    if (String(err && err.message) !== "wallet_buckets_shape") {
      throw new Error(name + " wrong error: " + (err && err.message));
    }
  }
}

function viewFromWalletError(err) {
  const msg = err instanceof Error ? err.message : "";
  return msg.includes("wallet_buckets_401") || /unauthorized/i.test(msg)
    ? "unauthorized"
    : "unavailable";
}

const zero = normalizeWalletBuckets(base);
if (zero.principalUsdt !== "0" || zero.profitUsdt !== "0") {
  throw new Error("exact server zero must remain zero");
}
const decimal = normalizeWalletBuckets({
  ...base,
  principalUsdt: "250.00",
  profitUsdt: "12.50",
});
if (decimal.principalUsdt !== "250.00" || decimal.profitUsdt !== "12.50") {
  throw new Error("valid decimal money was rejected");
}

expectThrow("null", null);
expectThrow("array", []);
expectThrow("empty userId", { ...base, userId: "  " });
expectThrow("missing ledger", ((o) => { const x = { ...o }; delete x.asOfLedgerEntryId; return x; })(base));
expectThrow("extra key", { ...base, extra: "1" });
expectThrow("malformed decimal", { ...base, principalUsdt: "1." });
expectThrow("backslash decoy", { ...base, principalUsdt: "1\\\\x00" });

for (const key of MONEY) {
  const missing = { ...base };
  delete missing[key];
  expectThrow("missing " + key, missing);
  expectThrow("wrong-type " + key, { ...base, [key]: 1 });
}

function mockFetch(impl) {
  globalThis.fetch = impl;
}

async function expectFetchView(name, impl, view) {
  mockFetch(impl);
  try {
    await fetchWalletBuckets();
    throw new Error("EXPECTED_THROW:" + name);
  } catch (err) {
    if (String(err && err.message).startsWith("EXPECTED_THROW:")) throw err;
    const got = viewFromWalletError(err);
    if (got !== view) {
      throw new Error(name + " view=" + got + " expected " + view + " err=" + (err && err.message));
    }
  }
}

function httpRes(status, body) {
  return {
    ok: status >= 200 && status < 300,
    status,
    json: async () => body,
    text: async () => JSON.stringify(body),
  };
}

await expectFetchView("401", async () => httpRes(401, { error: "unauthorized" }), "unauthorized");
await expectFetchView("403", async () => httpRes(403, { error: "forbidden" }), "unavailable");
await expectFetchView("404", async () => httpRes(404, { error: "missing" }), "unavailable");
await expectFetchView("5xx", async () => httpRes(500, { error: "boom" }), "unavailable");
await expectFetchView("network", async () => { throw new Error("ECONNRESET"); }, "unavailable");
await expectFetchView(
  "malformed 200",
  async () => httpRes(200, { ...base, principalUsdt: "1." }),
  "unavailable",
);

mockFetch(async () => httpRes(200, base));
const fetchedZero = await fetchWalletBuckets();
if (fetchedZero.principalUsdt !== "0") {
  throw new Error("authorized exact-zero 200 must stay zero");
}

mockFetch(async () => httpRes(200, { ...base, principalUsdt: "250.00", profitUsdt: "12.50" }));
const fetchedDec = await fetchWalletBuckets();
if (fetchedDec.principalUsdt !== "250.00" || fetchedDec.profitUsdt !== "12.50") {
  throw new Error("authorized valid decimal 200 was rejected");
}

console.log("wallet-reader-http-behavior PASS");
`;

const run = spawnSync(
  process.execPath,
  ["--experimental-strip-types", "--input-type=module", "--eval", runner],
  { cwd: root, encoding: "utf8", timeout: 20_000 },
);
process.stdout.write(run.stdout || "");
process.stderr.write(run.stderr || "");
if (run.status !== 0) process.exit(run.status || 1);
