/**
 * REL-020 committed QA spec.
 * QA_ENV_ISOLATION_GUARD 재사용. production project_ref 쓰기 0.
 */
const {
  assertQaIsolation,
} = require("../e2e/lib/qa-env-isolation-guard.cjs");
const {
  runPushBadgeQaCases,
  runDispatcherHttpCases,
} = require("./pwa-push-badge-harness.cjs");

function assert(cond, message) {
  if (!cond) throw new Error(message);
}

function run() {
  assertQaIsolation({ purpose: "e2e", host: "localhost" });
  const cases = runPushBadgeQaCases();
  assert(cases.killed.status === "killed", "kill status");
  assert(cases.killed.sendAttempted === false, "kill must not send");
  assert(cases.envKilled.status === "killed", "env kill");
  assert(cases.sendCalls === 0, "EXIT_GATE sendCalls");
  assert(cases.planKilled.enqueue === false, "plan kill");
  assert(cases.planReady.enqueue === true, "plan ready");
  return runDispatcherHttpCases().then((http) => {
    assert(http.unauth.statusCode === 401, "unauth 401");
    assert(http.nestKill.body.status === "killed", "nest kill");
    assert(http.envKill.body.status === "killed", "env kill");
    console.log("[pwa-push-badge.spec] PASS");
  });
}

if (require.main === module) {
  run().catch((err) => {
    console.error("[pwa-push-badge.spec] FAIL", err.message);
    process.exit(1);
  });
}

module.exports = { run };
