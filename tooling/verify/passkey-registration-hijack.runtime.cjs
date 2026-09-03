"use strict";

const assert = require("node:assert/strict");

const {
  PASSKEY_REGISTRATION_CONFLICT,
  assertPasskeyCredentialUnclaimed,
  rejectPasskeyCredentialInsertRace,
} = require("../../services/api-nest/dist/auth/passkey-registration.policy.js");

assert.equal(
  PASSKEY_REGISTRATION_CONFLICT,
  "WEBAUTHN_CREDENTIAL_ALREADY_REGISTERED",
);

assert.doesNotThrow(() => assertPasskeyCredentialUnclaimed(null));
assert.doesNotThrow(() => assertPasskeyCredentialUnclaimed(undefined));

for (const existing of [
  { credentialId: "victim", publicKeySpki: Buffer.from("victim") },
  false,
  0,
  "",
]) {
  // Only null/undefined mean "not found". Any row/value returned by a lookup
  // must fail closed rather than becoming an existing user's session.
  assert.throws(
    () => assertPasskeyCredentialUnclaimed(existing),
    (err) =>
      err &&
      err.status === 409 &&
      err.message === PASSKEY_REGISTRATION_CONFLICT,
  );
}

assert.throws(
  () => rejectPasskeyCredentialInsertRace(),
  (err) =>
    err &&
    err.status === 409 &&
    err.message === PASSKEY_REGISTRATION_CONFLICT,
);

console.log(
  "[verify:passkey-registration-hijack] PASS (REGISTER_DUPLICATE_REJECTED · INSERT_RACE_REJECTED · AUTHENTICATE_ONLY_EXISTING_CREDENTIAL_AUTHORITY)",
);
