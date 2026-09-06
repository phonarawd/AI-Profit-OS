/**
 * verify:trades-payout-reserve
 * 매칭 수익은 내부 장부 지급이다. SYS:OPPORTUNITY_POOL 잔액으로
 * MATCH_SUCCESS를 막지 않는다. 실자금 솔벤시는 출금 단계다.
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
const types = read("services/api-nest/src/ledger/ledger.types.ts");
const pkg = read("package.json");
const domain = read("tooling/verify/domain-by-path.cjs");

for (const needle of [
  "resolveSimulationPayoutFeasible",
  "virtual match profit",
  "compareReady=false",
]) {
  if (!testSrc.includes(needle)) {
    fail(`payout-reserve selftest missing coverage marker: ${needle}`);
  }
}
if (!svc.includes("checkPayoutReserveFeasible")) {
  fail("trades.execution.service.ts must implement checkPayoutReserveFeasible");
}
if (!svc.includes("resolveMatchProfitSource")) {
  fail("trades.execution.service.ts must resolve in-app profit source");
}
if (!types.includes("MATCH_PROFIT_EXPENSE")) {
  fail("ledger.types must define MATCH_PROFIT_EXPENSE");
}
const reserveSrc = read("services/api-nest/src/ledger/payout-reservation.service.ts");
if (!reserveSrc.includes("MATCH_PROFIT_EXPENSE_MISSING")) {
  fail("payout-reservation must fail-closed with MATCH_PROFIT_EXPENSE_MISSING");
}
if (reserveSrc.includes("?? SYSTEM_ACCOUNT_CODES.OPS_POOL")) {
  fail("payout-reservation must not fall back to SYS:OPS_POOL");
}
if (reserveSrc.includes("없으면 SYS:OPS_POOL")) {
  fail("payout-reservation must not treat OPS_POOL as a missing-account fallback");
}
const svcNoComments = svc.replace(/\/\*[\s\S]*?\*\//g, "").replace(/\/\/.*$/gm, "");
if (/evaluatePayoutFeasibility/.test(svcNoComments)) {
  fail(
    "trades.execution.service.ts must not call evaluatePayoutFeasibility() stub (outside comments)",
  );
}
if (/SYSTEM_ACCOUNT_CODES\.OPPORTUNITY_POOL/.test(svcNoComments)) {
  fail(
    "match payout must not gate on SYS:OPPORTUNITY_POOL — that is real-money, not in-app profit",
  );
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
  const reserveSelftestJs = path.join(
    root,
    "services/api-nest/dist/ledger/payout-reservation.selftest.js",
  );
  if (!fs.existsSync(reserveSelftestJs)) {
    fail(`missing compiled selftest: ${reserveSelftestJs}`);
  } else {
    const reserveRun = spawnSync(process.execPath, [reserveSelftestJs], {
      cwd: root,
      encoding: "utf8",
      timeout: 30_000,
    });
    process.stdout.write(reserveRun.stdout || "");
    process.stderr.write(reserveRun.stderr || "");
    if (reserveRun.status !== 0 || !(reserveRun.stdout || "").includes("ALL PASS")) {
      fail("payout-reservation.selftest did not report ALL PASS");
    }
  }
}

if (fails.length) {
  console.error("[verify:trades-payout-reserve] FAIL\n- " + fails.join("\n- "));
  process.exit(1);
}
console.log(
  "[verify:trades-payout-reserve] PASS - in-app match profit is not gated on on-chain pool",
);
