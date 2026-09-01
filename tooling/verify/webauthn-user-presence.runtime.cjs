"use strict";

const assert = require("node:assert/strict");
const {
  WEBAUTHN_FLAG_USER_PRESENT,
  hasWebauthnUserPresence,
} = require("../../services/api-nest/dist/auth/identity-proof.crypto.js");

assert.equal(WEBAUTHN_FLAG_USER_PRESENT, 0x01);
assert.equal(hasWebauthnUserPresence({ flags: 0x00 }), false);
assert.equal(hasWebauthnUserPresence({ flags: 0x04 }), false);
assert.equal(hasWebauthnUserPresence({ flags: 0x01 }), true);
assert.equal(hasWebauthnUserPresence({ flags: 0x05 }), true);
assert.equal(hasWebauthnUserPresence({ flags: 0xff }), true);

console.log(
  "[verify:webauthn-user-presence] PASS (UP_BIT_REQUIRED · FLAGS_ZERO_REJECTED)",
);
