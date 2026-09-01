"use strict";

const assert = require("node:assert/strict");
const {
  WEBAUTHN_FLAG_USER_PRESENT,
  hasWebauthnUserPresence,
  parseClientDataJSON,
} = require("../../services/api-nest/dist/auth/identity-proof.crypto.js");

assert.equal(WEBAUTHN_FLAG_USER_PRESENT, 0x01);
assert.equal(hasWebauthnUserPresence({ flags: 0x00 }), false);
assert.equal(hasWebauthnUserPresence({ flags: 0x04 }), false);
assert.equal(hasWebauthnUserPresence({ flags: 0x01 }), true);
assert.equal(hasWebauthnUserPresence({ flags: 0x05 }), true);
assert.equal(hasWebauthnUserPresence({ flags: 0xff }), true);

function encodeClientData(value) {
  return Buffer.from(JSON.stringify(value), "utf8").toString("base64url");
}

let client = parseClientDataJSON(
  encodeClientData({
    type: "webauthn.get",
    challenge: "challenge",
    origin: "https://app.hiptk.app",
  }),
);
assert.equal(client.crossOrigin, false);

client = parseClientDataJSON(
  encodeClientData({
    type: "webauthn.get",
    challenge: "challenge",
    origin: "https://app.hiptk.app",
    crossOrigin: true,
    topOrigin: "https://evil.example",
  }),
);
assert.equal(client.crossOrigin, true);

console.log(
  "[verify:webauthn-user-presence] PASS (UP_BIT_REQUIRED · FLAGS_ZERO_REJECTED · CROSS_ORIGIN_EXPOSED_FOR_REJECTION)",
);
