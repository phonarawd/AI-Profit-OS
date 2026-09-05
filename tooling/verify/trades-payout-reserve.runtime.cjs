/**
 * verify:trades-payout-reserve - PUTDUK continuation session, Step 7.4
 * required regression: "evaluatePayoutFeasibility() has no real
 * connection to SYS:OPPORTUNITY_POOL's actual balance - fix it to check
 * the real ledger before MATCH_SUCCESS can ever credit profit."
 *
 * TradeExecutionService uses TypeScript parameter properties, so
 * node:test + --experimental-strip-types cannot run this directly - same
 * compiled-dist convention as trades.execution.race.selftest.ts.
 */
"use strict";

const fs = require("node:fs");
const path = require("node:path");
const { spawnSync } = require("node:child_process");

const root = path.resolve(__dirname, "../..");
const fails = [];

function fail(msg) {
  fails.push(msg);
}

function read(rel) {
  const fp = path.join(root, rel);
  if (!fs.existsSync(fp)) {
    fail(`missing: ${rel}`);
    return "";
  }
  return fs.readFileSync(fp, "utf8");
}

const testFile = "services/api-nest/src/trades/trades.payout-reserve.selftest.ts";
const svcFile = "services/api-nest/src/trades/trades.execution.service.ts";

const testSrc = read(testFile);
const svc = read(svcFile);
const pkg = read("package.json");
const domain = read("tooling/verify/domain-by-path.cjs");

for (const needle of [
  "resolveSimulationPayoutFeasible",
  "the confirmed live case",
  "fail closed",
]) {
  if (!testSrc.includes(needle)) {
    fail(`payout-reserve selftest missing coverage marker: ${needle}`);
  }
}
if (!svc.includes("checkPayoutReserveFeasible")) {
  fail("trades.execution.service.ts must implement checkPayoutReserveFeasible");
}
if (!/SYS:OPPORTUNITY_POOL|SYSTEM_ACCOUNT_CODES\.OPPORTUNITY_POOL/.test(svc)) {
  fail("checkPayoutReserveFeasible must query the real SYS:OPPORTUNITY_POOL account");
}
// The stub must no longer be CALLED - only mentioned in the explanatory
// comment above resolveSimulationPayoutFeasible describing the bug this
// fix closes. Strip comments before checking so that explanation does
// not trip this check on itself.
const svcNoComments = svc.replace(/\/\*[\s\S]*?\*\//g, "").replace(/\/\/.*$/gm, "");
if (/evaluatePayoutFeasibility/.test(svcNoComments)) {
  fail(
    "trades.execution.service.ts must not call the evaluatePayoutFeasibility() stub anymore (outside comments) - it has no real balance connection",
  );
}
if (!/status IN \('running', 'requeue'\)/.test(svc)) {
  fail("checkPayoutReserveFeasible must sum exposure across running/requeue trades");
}
if (!pkg.includes('"verify:trades-payout-reserve"')) {
  fail("package.json missing verify:trades-payout-reserve");
}
if (!domain.includes("trades-payout-reserve.runtime.cjs")) {
  fail("domain-by-path must trigger trades-payout-reserve.runtime.cjs");
}

const tscBin = require.resolve("typescript/bin/tsc");
const build = spawnSync(
  process.execPath,
  [tscBin, "-p", path.join(root, "services/api-nest/tsconfig.json")],
  { cwd: root, encoding: "utf8" },
);
process.stdout.write(build.stdout || "");
process.stderr.write(build.stderr || "");
if (build.status !== 0) {
  fail("services/api-nest tsc build failed - cannot run trades.payout-reserve.selftest");
} else {
  const selftestJs = path.join(
    root,
    "services/api-nest/dist/trades/trades.payout-reserve.selftest.js",
  );
  if (!fs.existsSync(selftestJs)) {
    fail(`missing compiled selftest: ${selftestJs}`);
  } else {
    const run = spawnSync(process.execPath, [selftestJs], {
      cwd: root,
      encoding: "utf8",
      timeout: 30_000,
    });
    process.stdout.write(run.stdout || "");
    process.stderr.write(run.stderr || "");
    if (run.status !== 0 || !(run.stdout || "").includes("ALL PASS")) {
      fail("trades.payout-reserve.selftest did not report ALL PASS");
    }
  }
}

if (fails.length) {
  console.error("[verify:trades-payout-reserve] FAIL\n- " + fails.join("\n- "));
  process.exit(1);
}
console.log(
  "[verify:trades-payout-reserve] PASS - real payout-reserve feasibility gate covered",
);
