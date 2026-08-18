/**
 * QA-0 tiny smoke — kill-switch가 반드시 먼저 통과해야 실행됨.
 * full suite / persona / fuzz / fault / k6 / AI eval 금지.
 */
"use strict";

const { assertKillSwitch } = require("./kill-switch.cjs");

function runTinySmoke(opts = {}) {
  // 순서 잠금: kill-switch → smoke
  assertKillSwitch(opts);

  return {
    status: "SMOKE_OK",
    suite: "QA0_TINY_SMOKE",
    notes: [
      "No persona/fuzz/fault/k6/AI eval.",
      "Product mutation 0.",
      "Does not imply ENGINE_ACCEPTED_FOR_UI.",
    ],
  };
}

function main() {
  const args = process.argv.slice(2);
  const get = (flag) => {
    const i = args.indexOf(flag);
    return i >= 0 ? args[i + 1] : undefined;
  };

  try {
    const result = runTinySmoke({
      target_env: get("--target-env") || process.env.AIPO_QA_TARGET_ENV || "local",
      hostname: get("--hostname") || process.env.AIPO_QA_HOSTNAME || "localhost",
      synthetic_account_namespace:
        get("--synthetic-ns") ||
        process.env.AIPO_QA_SYNTHETIC_NS ||
        "qa-synth-local",
    });
    console.log(`[engine-acceptance:tiny-smoke] ${result.status}`);
    console.log(JSON.stringify(result, null, 2));
  } catch (e) {
    console.error(`[engine-acceptance:tiny-smoke] ABORT — ${e.message}`);
    process.exit(e.code === "AIPO_QA_KILL_SWITCH" ? 2 : 1);
  }
}

if (require.main === module) {
  main();
}

module.exports = { runTinySmoke };
