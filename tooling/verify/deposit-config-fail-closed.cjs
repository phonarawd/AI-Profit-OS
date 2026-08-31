/**
 * verify:deposit-config-fail-closed
 * deposit_config missing/partial/malformed => CONFIG_NOT_READY
 * Money runtime silent DAY1 defaults forbidden. Production seed insert 0.
 */
const fs = require("fs");
const path = require("path");
const assert = require("assert");
const { spawnSync } = require("child_process");

const root = path.resolve(__dirname, "../..");
const fails = [];

function read(rel) {
  return fs.readFileSync(path.join(root, rel), "utf8");
}

function mustExist(rel) {
  if (!fs.existsSync(path.join(root, rel))) fails.push("missing: " + rel);
}

const files = [
  "services/api-nest/src/wallet/deposit-config.ready.ts",
  "services/api-nest/src/wallet/deposit-config.service.ts",
  "services/api-nest/src/wallet/withdraw-fee.service.ts",
  "services/api-nest/src/wallet/min-holding.service.ts",
  "services/api-nest/src/wallet/deposit-address.service.ts",
  "services/api-nest/src/wallet/chain-sweeper.phase0.service.ts",
  "services/api-nest/src/wallet/chain-watcher.phase0.service.ts",
  "services/api-nest/src/wallet/usdt-deposit.service.ts",
  "services/api-nest/src/wallet/krw-deposit.service.ts",
  "services/api-nest/src/ai/fact-tool.service.ts",
  "schemas/toast-codes.v1.json",
  "packages/ui/copy/ko/toast.ts",
];
for (const f of files) mustExist(f);

const ready = read("services/api-nest/src/wallet/deposit-config.ready.ts");
const svc = read("services/api-nest/src/wallet/deposit-config.service.ts");
const toast = read("packages/ui/copy/ko/toast.ts");
const toastSchema = read("schemas/toast-codes.v1.json");

if (!ready.includes('export const CONFIG_NOT_READY = "CONFIG_NOT_READY"')) {
  fails.push("ready.ts must export CONFIG_NOT_READY");
}
if (!ready.includes("parsePersistedDepositConfig")) {
  fails.push("ready.ts must export parsePersistedDepositConfig");
}
if (!ready.includes("DEPOSIT_CONFIG_REQUIRED_PATHS")) {
  fails.push("ready.ts must list DEPOSIT_CONFIG_REQUIRED_PATHS");
}

const required = [
  "config_version",
  "krw.krwWithdrawFeeKrw",
  "usdt_onchain.usdtWithdrawNetworkFeeUsdt",
  "usdt_onchain.minTrxStakeForSweeper",
  "usdt_onchain.hotWalletXpubRef",
  "usdt_onchain.treasuryHotAddressRef",
  "usdt_onchain.sweeperPaused",
  "withdraw_guards.minHoldingHours",
  "pricing_guards.priceStaleMaxSec",
];
for (const key of required) {
  if (!ready.includes('"' + key + '"')) {
    fails.push("ready.ts missing required path " + key);
  }
}

const getFn = svc.match(/async get\(\)[\s\S]{0,180}?async requirePersisted/);
if (!getFn || !getFn[0].includes("return this.requirePersisted()")) {
  fails.push("get() must alias requirePersisted()");
}
if (getFn && getFn[0].includes("day1Defaults")) {
  fails.push("get() must not return day1Defaults");
}
if (!svc.includes("parsePersistedDepositConfig")) {
  fails.push("service must parse persisted rows via parsePersistedDepositConfig");
}
if (!svc.includes("ServiceUnavailableException")) {
  fails.push("missing config must throw ServiceUnavailableException");
}
if (!svc.includes("CONFIG_NOT_READY") && !svc.includes("configNotReadyBody")) {
  fails.push("service must emit CONFIG_NOT_READY");
}
if (!svc.includes("loadForAdminWrite")) {
  fails.push("PATCH must use explicit loadForAdminWrite, not silent get() defaults");
}
if (!svc.includes("toV1Lenient")) {
  fails.push("lenient default fill must be Admin-write only (toV1Lenient)");
}
if (svc.includes("async systemPauseSweeper") && !svc.includes("requirePersisted")) {
  fails.push("systemPauseSweeper must requirePersisted (no insert on missing row)");
}

const money = [
  ["services/api-nest/src/wallet/withdraw-fee.service.ts", "withdraw"],
  ["services/api-nest/src/wallet/min-holding.service.ts", "withdraw holding"],
  ["services/api-nest/src/wallet/deposit-address.service.ts", "deposit address"],
  ["services/api-nest/src/wallet/chain-sweeper.phase0.service.ts", "sweeper"],
  ["services/api-nest/src/wallet/chain-watcher.phase0.service.ts", "watcher"],
  ["services/api-nest/src/wallet/usdt-deposit.service.ts", "usdt observe"],
  ["services/api-nest/src/wallet/krw-deposit.service.ts", "krw deposit"],
];
for (const [rel, label] of money) {
  const src = read(rel);
  if (!src.includes("requirePersisted()")) {
    fails.push(label + " must call requirePersisted()");
  }
  if (src.includes("depositConfig.get()")) {
    fails.push(label + " must not call depositConfig.get()");
  }
}

const fact = read("services/api-nest/src/ai/fact-tool.service.ts");
if (!fact.includes("requirePersisted()")) {
  fails.push("fact-tool must not invent confirmations via get() defaults");
}
if (fact.includes("depositConfig.get()")) {
  fails.push("fact-tool must not call depositConfig.get()");
}

if (!toast.includes("CONFIG_NOT_READY")) {
  fails.push("toast.ts must include CONFIG_NOT_READY");
}
if (!toastSchema.includes('"CONFIG_NOT_READY"')) {
  fails.push("toast-codes.v1.json must include CONFIG_NOT_READY");
}

const migDir = path.join(root, "supabase/migrations");
if (fs.existsSync(migDir)) {
  for (const name of fs.readdirSync(migDir)) {
    if (!/deposit_config.*seed|seed.*deposit_config/i.test(name)) continue;
    fails.push("production seed migration forbidden: " + name);
  }
}

const runtime = path.join(__dirname, "deposit-config-fail-closed.runtime.mts");
if (!fs.existsSync(runtime)) {
  fails.push("missing deposit-config-fail-closed.runtime.mts");
} else {
  const run = spawnSync(
    process.execPath,
    ["--experimental-strip-types", runtime],
    { cwd: root, encoding: "utf8" },
  );
  if (run.status !== 0) {
    fails.push(
      "runtime parse tests failed: " +
        String(run.stderr || run.stdout || "exit " + run.status).slice(0, 800),
    );
  }
}

if (fails.length) {
  console.error("[verify:deposit-config-fail-closed] FAIL");
  for (const f of fails) console.error(" -", f);
  process.exit(1);
}
assert.ok(true);
console.log(
  "[verify:deposit-config-fail-closed] PASS (missing/partial/malformed => CONFIG_NOT_READY · money defaults 0)",
);
