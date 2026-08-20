/**
 * REL-023 committed Day-1 PWA certification spec.
 */
const {
  assertQaIsolation,
} = require("../e2e/lib/qa-env-isolation-guard.cjs");
const { runDay1CertCases } = require("./pwa-day1-certification-harness.cjs");

function assert(cond, message) {
  if (!cond) throw new Error(message);
}

function run() {
  assertQaIsolation({ purpose: "e2e", host: "localhost" });
  const cases = runDay1CertCases();
  for (const id of cases.checklist.requiredCompleted) {
    assert(cases.evidence[id] === true, `missing evidence ${id}`);
  }
  for (const key of cases.checklist.items) {
    assert(cases.items[key] === true, `checklist ${key}`);
  }
  assert(cases.storeBridge === 0, "store-bridge must be excluded");
  assert(cases.post017 === 0, "POST-017 must be excluded");
  assert(cases.storeBridgeLeak === false, "store-bridge leak");
  console.log("[pwa-day1-certification.spec] PASS");
}

if (require.main === module) {
  try {
    run();
  } catch (err) {
    console.error("[pwa-day1-certification.spec] FAIL", err.message);
    process.exit(1);
  }
}

module.exports = { run };
