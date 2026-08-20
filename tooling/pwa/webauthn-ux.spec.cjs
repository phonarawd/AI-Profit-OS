/**
 * REL-022 committed spec. QA_ENV_ISOLATION_GUARD 재사용.
 */
const {
  assertQaIsolation,
} = require("../e2e/lib/qa-env-isolation-guard.cjs");
const { runWebauthnUxCases } = require("./webauthn-ux-harness.cjs");

function assert(cond, message) {
  if (!cond) throw new Error(message);
}

function run() {
  assertQaIsolation({ purpose: "e2e", host: "localhost" });
  const cases = runWebauthnUxCases();
  assert(cases.rp.rpId === "hiptk.app", "rpId");
  assert(cases.rp.origin === "https://app.hiptk.app", "origin");
  assert(cases.supported === true, "supported path");
  assert(cases.unsupported === false, "unsupported path");
  assert(cases.hapticOk === true, "haptic optional success");
  assert(cases.hapticReduced === false, "reduced-motion skips haptic");
  assert(cases.hapticThrow === false, "haptic throw must not abort");
  console.log("[webauthn-ux.spec] PASS");
}

if (require.main === module) {
  try {
    run();
  } catch (err) {
    console.error("[webauthn-ux.spec] FAIL", err.message);
    process.exit(1);
  }
}

module.exports = { run };
