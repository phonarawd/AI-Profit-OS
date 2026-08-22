/**
 * verify:rel-406-kill-switch — 9 IDs + enforce fixture
 */
const fs = require("fs");
const path = require("path");

const root = path.resolve(__dirname, "../..");
const fails = [];

function read(rel) {
  const p = path.join(root, rel);
  if (!fs.existsSync(p)) {
    fails.push(`missing: ${rel}`);
    return "";
  }
  return fs.readFileSync(p, "utf8");
}

const catalog = require(path.join(
  root,
  "services/api-nest/src/admin-control/kill-switch.catalog.cjs",
));
if (catalog.KILL_SWITCH_IDS.length !== 9) {
  fails.push(`expected 9 switches, got ${catalog.KILL_SWITCH_IDS.length}`);
}
if (!catalog.KILL_SWITCH_IDS.includes("GLOBAL_OPPORTUNITY_PAUSE")) {
  fails.push("GLOBAL_OPPORTUNITY_PAUSE required");
}

const unknown = catalog.evaluateKillSwitch("NOT_A_SWITCH", false);
if (unknown.allowed !== false || unknown.failClosed !== true) {
  fails.push("unknown switch must fail closed");
}
const on = catalog.evaluateKillSwitch("GLOBAL_MATCH_PAUSE", true);
if (on.allowed !== false) fails.push("engaged switch must block");
const off = catalog.evaluateKillSwitch("GLOBAL_MATCH_PAUSE", false);
if (off.allowed !== true) fails.push("disengaged known switch must allow");

const participate = read("services/api-nest/src/opportunities/participate.service.ts");
const withdraw = read("services/api-nest/src/wallet/withdraw-intent.service.ts");
const exec = read("services/api-nest/src/trades/trades.execution.service.ts");
const deposit = read("services/api-nest/src/wallet/krw-deposit.service.ts");
const ingest = read("services/api-nest/src/adapters/adapters.admin.service.ts");
if (!participate.includes('assertAllowed("GLOBAL_OPPORTUNITY_PAUSE")')) {
  fails.push("participate must enforce GLOBAL_OPPORTUNITY_PAUSE");
}
if (!withdraw.includes('assertAllowed("GLOBAL_WITHDRAW_PAUSE")')) {
  fails.push("withdraw must enforce GLOBAL_WITHDRAW_PAUSE");
}
if (!exec.includes('assertAllowed("GLOBAL_MATCH_PAUSE")')) {
  fails.push("executeTick must enforce GLOBAL_MATCH_PAUSE");
}
if (!exec.includes('assertAllowed("GLOBAL_SETTLEMENT_PAUSE")')) {
  fails.push("settlement path must enforce GLOBAL_SETTLEMENT_PAUSE");
}
if (!deposit.includes('assertAllowed("GLOBAL_DEPOSIT_PAUSE")')) {
  fails.push("deposit approve must enforce GLOBAL_DEPOSIT_PAUSE");
}
if (!ingest.includes('assertAllowed("GLOBAL_SOURCE_INGEST_PAUSE")')) {
  fails.push("ingest must enforce GLOBAL_SOURCE_INGEST_PAUSE");
}

const svc = read("services/api-nest/src/admin-control/kill-switch.service.ts");
if (!svc.includes("MoneyCircuitService") || !svc.includes("PushKillService")) {
  fails.push("must reuse money_circuit and push owners");
}
if (/class MoneyCircuitService/.test(svc)) {
  fails.push("must not create a second circuit owner");
}

const ctrl = read(
  "services/api-nest/src/admin-control/kill-switch.admin.controller.ts",
);
if (!/@UseGuards\(AdminGuard\)/.test(ctrl)) {
  fails.push("kill-switch controller must use AdminGuard");
}

const pkg = read("package.json");
const catalogMd = read("tooling/verify/CATALOG.md");
if (!pkg.includes("verify:rel-406-kill-switch")) {
  fails.push("package.json missing verify:rel-406-kill-switch");
}
if (!catalogMd.includes("rel-406-kill-switch")) {
  fails.push("CATALOG.md missing rel-406-kill-switch");
}

if (fails.length) {
  console.error("[verify:rel-406-kill-switch] FAIL");
  for (const f of fails) console.error(" -", f);
  process.exit(1);
}
console.log("[verify:rel-406-kill-switch] PASS");
