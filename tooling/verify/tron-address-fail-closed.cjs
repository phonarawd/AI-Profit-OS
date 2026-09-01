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
assert.doesNotMatch(tron, /createHash\([^\n]*secretRef|update\([^\n]*secretRef/);
assert.match(tron, /TRON_HD_DERIVATION_UNAVAILABLE/);
assert.match(tron, /TronHdDerivationUnavailableError/);
assert.match(tron, /resolveCanonicalTrc20Deriver/);
assert.match(tron, /requireCanonicalTrc20Deriver/);
assert.match(tron, /allocateCanonicalTrc20Address/);

const resolverStart = tron.indexOf("export function resolveCanonicalTrc20Deriver");
const resolverEnd = tron.indexOf("\n}", resolverStart);
assert.ok(resolverStart >= 0 && resolverEnd > resolverStart, "canonical deriver resolver missing");
const resolverBody = tron.slice(resolverStart, resolverEnd + 2);
assert.match(resolverBody, /return null;/);

assert.match(deposit, /requireCanonicalTrc20Deriver\(\)/);
assert.match(deposit, /allocateCanonicalTrc20Address/);
assert.match(deposit, /ServiceUnavailableException/);
assert.match(deposit, /TRON_HD_DERIVATION_UNAVAILABLE/);

const requireAt = deposit.indexOf("requireCanonicalTrc20Deriver();");
const allocateAt = deposit.indexOf("derived = allocateCanonicalTrc20Address");
const insertAt = deposit.indexOf("INSERT INTO public.user_deposit_addresses");
assert.ok(requireAt >= 0, "preflight canonical deriver check missing");
assert.ok(allocateAt > requireAt, "allocation must follow canonical deriver preflight");
assert.ok(insertAt > allocateAt, "DB insert must happen only after canonical derivation succeeds");

console.log(
  "[verify:tron-address-fail-closed] PASS (NO_SYNTHETIC_SECRETREF_ADDRESS · NULL_DERIVER_FAILS_CLOSED · INSERT_AFTER_REAL_DERIVATION_ONLY)",
);
