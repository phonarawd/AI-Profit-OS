/**
 * REL-022 QA — 지원/미지원 + 햅틱 실패해도 흐름 계속. production 0.
 */
const {
  assertQaIsolation,
} = require("../e2e/lib/qa-env-isolation-guard.cjs");
const {
  loadAuthWebauthnRp,
  isWebAuthnSupported,
  optionalHaptic,
} = require("./webauthn-rp.cjs");

function runWebauthnUxCases() {
  assertQaIsolation({ purpose: "qa", host: "localhost" });
  const rp = loadAuthWebauthnRp();

  const supported = isWebAuthnSupported({
    PublicKeyCredential: function PublicKeyCredential() {},
  });
  const unsupported = isWebAuthnSupported({});

  const hapticOk = optionalHaptic(12, {
    matchMedia: () => ({ matches: false }),
    navigator: { vibrate: () => true },
  });
  const hapticReduced = optionalHaptic(12, {
    matchMedia: () => ({ matches: true }),
    navigator: { vibrate: () => true },
  });
  const hapticThrow = optionalHaptic(12, {
    matchMedia: () => ({ matches: false }),
    navigator: {
      vibrate() {
        throw new Error("no haptic");
      },
    },
  });

  return {
    rp,
    supported,
    unsupported,
    hapticOk,
    hapticReduced,
    hapticThrow,
  };
}

module.exports = { runWebauthnUxCases };
