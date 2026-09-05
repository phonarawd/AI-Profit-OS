/**
 * verify:trades-execution-race - PUTDUK continuation session, Step 7.2
 * required regression: "success vs safe-stop, success vs timeout, two
 * successes, two failures - all racing concurrently, at most one terminal
 * journal ever".
 *
 * trades.execution.service.ts posts real ledger money (settlement /
 * participate_unlock) and had zero automated concurrency coverage for the
 * exact race this fix closes. This gate confirms that regression suite
 * actually exists and keeps PASSing.
 *
 * trades.execution.service.ts uses TypeScript parameter properties
 * (`constructor(private readonly db: ...)`), so node:test +
 * --experimental-strip-types (strip-only) cannot run it directly - this
 * suite follows the same pattern as auth-session-rotation-reuse.runtime.cjs
 * (scoped tsc build -> compiled dist/*.selftest.js -> stdout "ALL PASS").
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

const testFile = "services/api-nest/src/trades/trades.execution.race.selftest.ts";
const svcFile = "services/api-nest/src/trades/trades.execution.service.ts";

const testSrc = read(testFile);
const svc = read(svcFile);
const pkg = read("package.json");
const domain = read("tooling/verify/domain-by-path.cjs");

for (const needle of [
  "finalizeMatchSuccess",
  "finalizeSafeStop",
  "Promise.all",
  "journal total, never both",
]) {
  if (!testSrc.includes(needle)) {
    fail(`race selftest missing coverage marker: ${needle}`);
  }
}
// The fix this suite guards: claim the terminal transition before posting
// any journal, in both finalize paths, not just one.
if (!/status IN \('running', 'requeue'\)/.test(svc)) {
  fail("trades.execution.service.ts must still use the status-guarded claim UPDATE");
}
if (!pkg.includes('"verify:trades-execution-race"')) {
  fail("package.json missing verify:trades-execution-race");
}
if (!domain.includes("trades-execution-race.runtime.cjs")) {
  fail("domain-by-path must trigger trades-execution-race.runtime.cjs");
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
  fail("services/api-nest tsc build failed - cannot run trades.execution.race.selftest");
} else {
  const selftestJs = path.join(
    root,
    "services/api-nest/dist/trades/trades.execution.race.selftest.js",
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
      fail("trades.execution.race.selftest did not report ALL PASS");
    }
  }
}

if (fails.length) {
  console.error("[verify:trades-execution-race] FAIL\n- " + fails.join("\n- "));
  process.exit(1);
}
console.log(
  "[verify:trades-execution-race] PASS - settlement/safe-stop claim-before-post race covered",
);
