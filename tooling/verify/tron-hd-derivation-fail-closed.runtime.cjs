/**
 * verify:tron-hd-derivation-fail-closed
 * STATIC ≠ RUNTIME. This never claims BROWSER_PASS or PRODUCTION_RELEASE.
 *
 * Case B: no approved BIP32/secp256k1 vault deriver in-repo.
 * Synthetic HMAC(secretRef, hdPath) addresses are forbidden.
 */
"use strict";

const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const { spawnSync } = require("node:child_process");

const root = path.resolve(__dirname, "../..");
const fails = [];

function read(rel) {
  const p = path.join(root, rel);
  if (!fs.existsSync(p)) {
    fails.push("missing: " + rel);
    return "";
  }
  return fs.readFileSync(p, "utf8");
}

const tron = read("services/api-nest/src/wallet/tron-address.ts");
const addr = read("services/api-nest/src/wallet/deposit-address.service.ts");

if (/\bcreateHmac\b/.test(tron) || /\bcreateHmac\b/.test(addr)) {
  fails.push("TRC20 path must not createHmac a synthetic address");
}
if (/createHmac\(\s*["']sha256["']\s*,\s*(opts\.)?secretRef/.test(tron)) {
  fails.push("secretRef must not be hashed as HMAC key material");
}
if (!tron.includes("TRON_HD_DERIVATION_UNAVAILABLE")) {
  fails.push("tron-address must export TRON_HD_DERIVATION_UNAVAILABLE");
}
if (!tron.includes("m/44'/195'/0'/0/")) {
  fails.push("canonical Tron HD path must stay locked");
}
if (!/return null;/.test(tron) || !tron.includes("resolveCanonicalTrc20Deriver")) {
  fails.push("unbound vault must resolve to null — do not invent a deriver");
}

const gateIdx = addr.indexOf("requireCanonicalTrc20Deriver()");
const requireIdx = addr.indexOf("allocateCanonicalTrc20Address(");
const insertIdx = addr.indexOf("INSERT INTO public.user_deposit_addresses");
const getOrCreateStart = addr.indexOf("async getOrCreate(");
const getOrCreateEnd = addr.indexOf("/** §43.1", getOrCreateStart);
const getOrCreate =
  getOrCreateStart >= 0 && getOrCreateEnd > getOrCreateStart
    ? addr.slice(getOrCreateStart, getOrCreateEnd)
    : "";
const existingAuthorityIdx = getOrCreate.indexOf("this.assertCanonicalAddressAuthority()");
const existingFetchIdx = getOrCreate.indexOf("await this.fetch(userId)");
if (gateIdx < 0) {
  fails.push("deposit-address must fail closed before any new allocation");
}
if (
  existingAuthorityIdx < 0 ||
  existingFetchIdx < 0 ||
  existingAuthorityIdx > existingFetchIdx
) {
  fails.push(
    "getOrCreate must require canonical authority before reading/serving any existing address",
  );
}
if (requireIdx < 0) {
  fails.push("deposit-address must allocate only through the canonical deriver");
}
if (insertIdx < 0) {
  fails.push("deposit-address INSERT site missing — cannot prove order");
}
if (requireIdx >= 0 && insertIdx >= 0 && requireIdx > insertIdx) {
  fails.push("INSERT must not appear before canonical deriver allocate");
}
if (gateIdx >= 0 && insertIdx >= 0 && gateIdx > insertIdx) {
  fails.push("INSERT must not appear before the 503 derivation gate");
}
if (!addr.includes("ServiceUnavailableException") || !addr.includes("TRON_HD_DERIVATION_UNAVAILABLE")) {
  fails.push("missing deriver must map to HTTP 503 TRON_HD_DERIVATION_UNAVAILABLE");
}

if (fails.length) {
  console.error("[verify:tron-hd-derivation-fail-closed] STATIC FAIL");
  for (const f of fails) console.error(" -", f);
  process.exit(1);
}
console.log("[verify:tron-hd-derivation-fail-closed] STATIC_VERIFIER_PASS");

function runNodeTest(rel) {
  const result = spawnSync(
    process.execPath,
    ["--test", "--experimental-strip-types", rel],
    { cwd: root, encoding: "utf8", timeout: 30_000 },
  );
  process.stdout.write(result.stdout || "");
  process.stderr.write(result.stderr || "");
  assert.equal(result.status, 0, rel + " runtime failed");
}

runNodeTest("services/api-nest/src/wallet/tron-address.runtime.test.ts");

console.log(
  "[verify:tron-hd-derivation-fail-closed] RUNTIME_BEHAVIOR_PASS · no synthetic HMAC · 503 before INSERT · BROWSER_PASS=NOT_RUN",
);
