/**
 * withdraw step-up — 가짜 WebAuthn · 호출자 이메일 · 만료 없는 토큰 금지.
 */
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
const intent = fs.readFileSync(
  path.join(root, "services/api-nest/src/wallet/withdraw-intent.service.ts"),
  "utf8",
);
const migration = fs.readFileSync(
  path.join(
    root,
    "supabase/migrations/20260901224000_withdraw_stepup_token_single_use.sql",
  ),
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
assert.match(service, /await this\.consumeStepUpToken\(/);
assert.match(service, /async consumeStepUpToken/);
assert.match(service, /SET token_consumed_at = now\(\)/);
assert.match(service, /token_consumed_at IS NULL/);
assert.match(service, /STEP_UP_TOKEN_REPLAYED/);
assert.match(service, /class ConflictConsumed extends ConflictException/);
assert.match(intent, /await this\.stepUp\.consumeStepUpToken\(/);
assert.match(migration, /ADD COLUMN IF NOT EXISTS token_consumed_at timestamptz/);

const existingIntentLookup = intent.indexOf(
  "const existing = await this.db.query<IntentRow>",
);
const tokenConsume = intent.indexOf(
  "const step = await this.stepUp.consumeStepUpToken",
);
assert.ok(existingIntentLookup >= 0, "idempotent existing-intent lookup missing");
assert.ok(
  tokenConsume > existingIntentLookup,
  "step-up token must not be consumed before exact idempotent replay is resolved",
);

console.log(
  "[verify:withdraw-stepup-security] PASS (NO_FAKE_WEBAUTHN · VERIFIED_EMAIL_ONLY · EXPIRING_HMAC_TOKEN · SINGLE_USE_TOKEN · IDEMPOTENT_RETRY_PRESERVED · ATOMIC_CONSUME · PROVEN_PIN_ENROLLMENT)",
);
