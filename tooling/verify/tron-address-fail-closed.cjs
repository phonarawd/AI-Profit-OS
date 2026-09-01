"use strict";

const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const root = path.resolve(__dirname, "../..");
const tron = fs.readFileSync(
  path.join(root, "services/api-nest/src/wallet/tron-address.ts"),
  "utf8",
);
const deposit = fs.readFileSync(
  path.join(root, "services/api-nest/src/wallet/deposit-address.service.ts"),
  "utf8",
);

assert.doesNotMatch(tron, /createHmac/);
assert.doesNotMatch(tron, /HMAC-SHA256\(secretRef/);
assert.match(tron, /TRON_HD_DERIVATION_UNAVAILABLE/);
assert.match(tron, /TronHdDerivationUnavailableError/);
assert.match(tron, /BIP32\/secp256k1/);

assert.match(deposit, /TronHdDerivationUnavailableError/);
assert.match(deposit, /ServiceUnavailableException/);
assert.match(deposit, /TRON_HD_DERIVATION_UNAVAILABLE/);

const deriveAt = deposit.indexOf("derived = deriveTrc20Address");
const insertAt = deposit.indexOf("INSERT INTO public.user_deposit_addresses");
assert.ok(deriveAt >= 0);
assert.ok(insertAt > deriveAt);

console.log(
  "[verify:tron-address-fail-closed] PASS (NO_SYNTHETIC_HMAC_ADDRESS · 503_UNTIL_REAL_HD_DERIVER)",
);
