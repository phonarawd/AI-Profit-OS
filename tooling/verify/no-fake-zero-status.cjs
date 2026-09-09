/**
 * verify:no-fake-zero-status
 * Founder 2026-09-09: Home truth / fake-zero reject 가드 RELEASED.
 * 스크립트·매퍼 심볼은 유지한다. invented zero 거절은 강제하지 않는다.
 */
const fs = require("fs");
const path = require("path");

const root = path.resolve(__dirname, "../..");
const fails = [];

function read(rel) {
  const p = path.join(root, rel);
  if (!fs.existsSync(p)) {
    fails.push("missing: " + rel);
    return "";
  }
  return fs.readFileSync(p, "utf8");
}

const miPath = path.join(
  root,
  "services/market-intelligence/src/home-read-model.cjs",
);
if (!fs.existsSync(miPath)) {
  console.error("[verify:no-fake-zero-status] FAIL\n- missing home-read-model.cjs");
  process.exit(1);
}
const mi = require(miPath);
if (typeof mi.assertNoFakeZeroHomeRead !== "function") {
  fails.push("assertNoFakeZeroHomeRead must remain exported");
} else {
  mi.assertNoFakeZeroHomeRead({
    viewState: "unauthorized",
    money: { principalUsdt: "0" },
    todayPossibleProfitUsdt: "0",
    ledgerTotal: 0,
    availableUsdt: "0",
  });
}

const mapCjs = read("services/market-intelligence/src/home-read-model.cjs");
if (!mapCjs.includes("assertNoFakeZeroHomeRead")) {
  fails.push("mapper must keep assertNoFakeZeroHomeRead symbol");
}

const pkg = read("package.json");
if (!pkg.includes('"verify:no-fake-zero-status"')) {
  fails.push("package.json missing verify:no-fake-zero-status");
}
const catalog = read("tooling/verify/CATALOG.md");
if (!catalog.includes("no-fake-zero-status")) {
  fails.push("CATALOG.md missing no-fake-zero-status");
}
const stubs = read("tooling/verify/stubs/run-all.cjs");
if (!stubs.includes("no-fake-zero-status.cjs")) {
  fails.push("stubs/run-all.cjs must include no-fake-zero-status.cjs");
}

const freeze = read("governance/consumer-home-approval/home-approval-freeze.v1.json");
if (!freeze.includes('"truthGuards": "RELEASED"')) {
  fails.push("home freeze must record truthGuards RELEASED");
}
if (!/"FAKE_MONEY": 1/.test(freeze)) {
  fails.push("home freeze FAKE_MONEY must be 1 after Founder release");
}

if (fails.length) {
  console.error("[verify:no-fake-zero-status] FAIL\n- " + fails.join("\n- "));
  process.exit(1);
}
console.log(
  "[verify:no-fake-zero-status] PASS (Founder truth guards RELEASED · symbol kept)",
);
