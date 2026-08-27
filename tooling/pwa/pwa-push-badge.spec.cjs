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
function loadSafeNotificationHref() {
  const fs = require("fs");
  const path = require("path");
  const vm = require("vm");
  const sw = fs.readFileSync(
    path.resolve(__dirname, "../../apps/web/public/sw.js"),
    "utf8",
  );
  const start = sw.indexOf("function safeNotificationHref(value) {");
  const end = sw.indexOf("\n}\n\nfunction applyBadge", start);
  assert(start >= 0 && end > start, "SW safeNotificationHref function must exist");
  const source = sw.slice(start, end + 2);
  const context = {};
  vm.runInNewContext(`${source}; this.safeNotificationHref = safeNotificationHref;`, context);
  return context.safeNotificationHref;
}


function run() {
  assertQaIsolation({ purpose: "e2e", host: "localhost" });
  const safeHref = loadSafeNotificationHref();
  assert(safeHref("/me/inbox") === "/me/inbox", "internal href allowed");
  assert(safeHref("/") === "/", "root allowed");
  for (const unsafe of [
    "https://evil.example/phish",
    "http://evil.example/phish",
    "//evil.example/phish",
    "\\\\evil.example\\phish",
    "/ok\\evil",
    "/\u0000evil",
    "",
  ]) {
    assert(safeHref(unsafe) === "/", `unsafe push href must fall back: ${JSON.stringify(unsafe)}`);
  }
  assert(safeHref("/" + "a".repeat(600)) === "/", "overlong href must fall back");
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
