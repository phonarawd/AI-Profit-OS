"use strict";

const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const root = path.resolve(__dirname, "../..");
const service = fs.readFileSync(
  path.join(root, "services/api-nest/src/wallet/withdraw-stepup.service.ts"),
  "utf8",
);
const controller = fs.readFileSync(
  path.join(root, "services/api-nest/src/wallet/wallet.controller.ts"),
  "utf8",
);

assert.doesNotMatch(service, /proof\.includes\(["']id["']\)/);
assert.doesNotMatch(service, /phase0-dev-stepup-hmac/);
assert.match(service, /createHmac\("sha256", secret\)/);
assert.match(service, /raw\.startsWith\("v2\."\)/);
assert.match(service, /STEP_UP_TOKEN_EXPIRED/);
assert.match(service, /expiresAtSec/);

assert.match(service, /WEBAUTHN_STEP_UP_NOT_READY/);
assert.match(service, /ServiceUnavailableException/);

assert.match(service, /getVerifiedEmail/);
assert.match(service, /auth_magic_link_challenges/);
assert.match(service, /m\.consumed_at IS NOT NULL/);
assert.doesNotMatch(controller, /email:\s*typeof body\.email/);

assert.match(service, /RETURNING id::text AS id/);
assert.match(service, /if \(!consumed\.rows\[0\]\)/);

assert.match(service, /enrollmentStepUpToken/);
assert.match(controller, /enrollmentStepUpToken: String\(body\.stepUpToken/);
assert.match(service, /enrollment\.method === "pin"/);

console.log(
  "[verify:withdraw-stepup-security] PASS (NO_FAKE_WEBAUTHN · VERIFIED_EMAIL_ONLY · EXPIRING_HMAC_TOKEN · ATOMIC_CONSUME · PROVEN_PIN_ENROLLMENT)",
);
