/**
 * verify:trades-reconcile - PUTDUK continuation session, Step 7.3 required
 * regression: "server-side durable termination independent of the user's
 * browser - a trade past its hard deadline with no active poller must
 * still resolve (safe_stop + full principal refund), not stay running
 * forever."
 *
 * TradeExecutionService.reconcileStuckTrades() + TradesAdminController
 * (POST /api/v1/admin/trades/reconcile-tick) are the fix; this gate
 * confirms the wiring is real (admin-guarded, capability-classified,
 * module-registered) and the regression suite exists and keeps PASSing.
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

const testFile = "services/api-nest/src/trades/trades.reconcile.selftest.ts";
const svcFile = "services/api-nest/src/trades/trades.execution.service.ts";
const ctrlFile = "services/api-nest/src/trades/trades.admin.controller.ts";
const routesFile = "services/api-nest/src/trades/trades.admin.routes.ts";
const moduleFile = "services/api-nest/src/trades/trades.module.ts";
const capsFile = "services/api-nest/src/common/admin-capabilities.ts";

const testSrc = read(testFile);
const svc = read(svcFile);
const ctrl = read(ctrlFile);
const routes = read(routesFile);
const mod = read(moduleFile);
const caps = read(capsFile);
const pkg = read("package.json");
const domain = read("tooling/verify/domain-by-path.cjs");

for (const needle of [
  "reconcileStuckTrades",
  "own owning userId",
  "not counted as reconciled",
]) {
  if (!testSrc.includes(needle)) {
    fail(`reconcile selftest missing coverage marker: ${needle}`);
  }
}
if (!svc.includes("async reconcileStuckTrades(")) {
  fail("trades.execution.service.ts must export reconcileStuckTrades");
}
if (!/status IN \('running', 'requeue'\)/.test(svc)) {
  fail("reconcileStuckTrades must select from the same running/requeue statuses executeTick guards");
}
if (!ctrl.includes("@UseGuards(AdminGuard)")) {
  fail("TradesAdminController must be @UseGuards(AdminGuard)");
}
if (!ctrl.includes("reconcileStuckTrades")) {
  fail("TradesAdminController must call reconcileStuckTrades");
}
if (!routes.includes("reconcile-tick")) {
  fail("trades.admin.routes.ts must expose reconcile-tick");
}
if (!mod.includes("TradesAdminController")) {
  fail("TradesModule must register TradesAdminController");
}
if (!/TradesAdminController:\s*\{[^}]*reconcileTick/.test(caps)) {
  fail("admin-capabilities.ts must classify TradesAdminController.reconcileTick (deny-by-default otherwise)");
}
if (!pkg.includes('"verify:trades-reconcile"')) {
  fail("package.json missing verify:trades-reconcile");
}
if (!domain.includes("trades-reconcile.runtime.cjs")) {
  fail("domain-by-path must trigger trades-reconcile.runtime.cjs");
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
  fail("services/api-nest tsc build failed - cannot run trades.reconcile.selftest");
} else {
  const selftestJs = path.join(
    root,
    "services/api-nest/dist/trades/trades.reconcile.selftest.js",
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
      fail("trades.reconcile.selftest did not report ALL PASS");
    }
  }
}

if (fails.length) {
  console.error("[verify:trades-reconcile] FAIL\n- " + fails.join("\n- "));
  process.exit(1);
}
console.log(
  "[verify:trades-reconcile] PASS - durable server-side reconcile-tick covered",
);
