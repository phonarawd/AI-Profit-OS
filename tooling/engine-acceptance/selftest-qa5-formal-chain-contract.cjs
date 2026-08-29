/**
 * QA5 tiny+fault formal chain 계약.
 */
"use strict";

const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const { ROOT } = require("./lib/hash-scope.cjs");
const { evaluateQa5FormalChain } = require("./lib/qa5-formal-chain-contract.cjs");

function run() {
  const fails = [];
  const check = (name, fn) => {
    try {
      fn();
      console.log(`  PASS ${name}`);
    } catch (e) {
      fails.push(`${name}: ${e instanceof Error ? e.message : e}`);
      console.log(`  FAIL ${name}: ${e instanceof Error ? e.message : e}`);
    }
  };

  console.log("[selftest-qa5-formal-chain-contract] start");

  check("missing_fault_hook_fails", () => {
    const out = evaluateQa5FormalChain({
      mode: "tiny",
      checks: {
        failure_world: {
          fault_hook: { available: false },
          axes: {
            axis1_expected_degradation_fallback: { status: "PASS", scenario_count: 1 },
            axis2_post_recovery_invariant: { status: "PASS", scenario_count: 1 },
          },
        },
      },
    });
    assert.equal(out.ok, false);
    assert.ok(out.fails.some((f) => /fault_hook/.test(f)));
  });

  check("tiny_fault_both_axes_pass", () => {
    const out = evaluateQa5FormalChain({
      mode: "tiny",
      checks: {
        failure_world: {
          fault_hook: { available: true },
          axes: {
            axis1_expected_degradation_fallback: { status: "PASS", scenario_count: 1 },
            axis2_post_recovery_invariant: { status: "PASS", scenario_count: 1 },
          },
        },
      },
    });
    assert.equal(out.ok, true);
    assert.equal(out.formal, "tiny+fault");
  });

  check("committed_qa5_meets_tiny_fault_contract", () => {
    const live = JSON.parse(
      fs.readFileSync(path.join(ROOT, "governance/engine-acceptance/qa5-result.v1.json"), "utf8"),
    );
    const out = evaluateQa5FormalChain(live);
    assert.equal(out.ok, true, out.fails.join("; "));
    assert.ok(out.formal === "tiny+fault" || out.formal === "full+fault");
  });

  if (fails.length) {
    console.error("[selftest-qa5-formal-chain-contract] FAIL");
    for (const f of fails) console.error(`  - ${f}`);
    process.exit(1);
  }
  console.log("[selftest-qa5-formal-chain-contract] PASS");
}

if (require.main === module) {
  run();
}

module.exports = { run };
