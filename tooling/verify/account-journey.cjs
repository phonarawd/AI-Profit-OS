"use strict";
const { runAccountSpec, shouldSkipBrowser } = require("./lib/run-account-spec.cjs");
const fails = [];
function done(extra) {
  if (fails.length) {
    console.error("[verify:account-journey] FAIL\n- " + fails.join("\n- "));
    process.exit(1);
  }
  console.log("[verify:account-journey] PASS" + (extra ? ` · ${extra}` : ""));
}
require("./account-hub-batch.cjs");
if (shouldSkipBrowser("ACCOUNT_JOURNEY_STATIC_ONLY")) {
  done(process.env.CI ? "ci-static" : "static-only");
  process.exit(0);
}
runAccountSpec("account-journey.spec.cjs")
  .then((result) => {
    process.stdout.write(result.stdout || "");
    process.stderr.write(result.stderr || "");
    if (result.status !== 0) fails.push("account-journey runtime failed");
    done("browser");
  })
  .catch((err) => {
    fails.push(String(err.message || err));
    done("browser");
  });
