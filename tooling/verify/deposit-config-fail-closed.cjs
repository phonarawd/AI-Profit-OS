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
  "schemas/deposit-config.v1.json",
  "packages/ui/copy/ko/toast.ts",
  "tooling/verify/deposit-config-bootstrap-fail-closed.runtime.mts",
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
if (!ready.includes("parsePersistedDepositConfig")) {
  fails.push("ready.ts must parse persisted rows via parsePersistedDepositConfig");
}
if (!svc.includes("DepositConfigWriteCore") || !svc.includes("this.write.patch")) {
  fails.push("service PATCH must delegate to DepositConfigWriteCore");
}
if (!svc.includes("ServiceUnavailableException")) {
  fails.push("missing config must throw ServiceUnavailableException");
}
if (!svc.includes("CONFIG_NOT_READY") && !svc.includes("configNotReadyBody")) {
  fails.push("service must emit CONFIG_NOT_READY");
}
if (svc.includes("loadForAdminWrite")) {
  fails.push("loadForAdminWrite default-merge is forbidden");
}
if (svc.includes("toV1Lenient")) {
  fails.push("toV1Lenient silent default fill is forbidden");
}
if (!ready.includes("buildExplicitAuthoritativeConfig")) {
  fails.push("missing/unusable row must require buildExplicitAuthoritativeConfig");
}
if (!ready.includes("assertAuthoritativePersist")) {
  fails.push("persist must re-validate via assertAuthoritativePersist before write");
}
if (ready.includes("DAY1_DEPOSIT_CONFIG_DEFAULTS")) {
  fails.push("ready/write core must not merge DAY1_DEPOSIT_CONFIG_DEFAULTS");
}
if (ready.includes("toV1Lenient") || ready.includes("loadForAdminWrite")) {
  fails.push("ready/write core must not silently default-fill");
}
if (svc.includes("day1Defaults") && /async patch\([\s\S]*?day1Defaults/.test(svc)) {
  fails.push("patch() must not call day1Defaults");
}
if (ready.includes("requireString(krw.bankName")) {
  fails.push("krw.bankName must reject empty strings");
}
const schema = JSON.parse(read("schemas/deposit-config.v1.json"));
const krwProps = schema.properties?.krw?.properties ?? {};
for (const key of ["bankName", "accountNumber", "accountHolder"]) {
  if (krwProps[key]?.minLength !== 1) {
    fails.push("schema krw." + key + " must have minLength 1");
  }
}
if (krwProps.noticeKo?.minLength) {
  fails.push("schema krw.noticeKo must allow empty string");
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

function runRuntime(rel) {
  const runtime = path.join(__dirname, rel);
  if (!fs.existsSync(runtime)) {
    fails.push("missing " + rel);
    return;
  }
  const run = spawnSync(
    process.execPath,
    ["--experimental-strip-types", runtime],
    { cwd: root, encoding: "utf8" },
  );
  if (run.status !== 0) {
    fails.push(
      rel +
        " failed: " +
        String(run.stderr || run.stdout || "exit " + run.status).slice(0, 1200),
    );
  }
}

runRuntime("deposit-config-fail-closed.runtime.mts");
runRuntime("deposit-config-bootstrap-fail-closed.runtime.mts");

if (fails.length) {
  console.error("[verify:deposit-config-fail-closed] FAIL");
  for (const f of fails) console.error(" -", f);
  process.exit(1);
}
assert.ok(true);
console.log(
  "[verify:deposit-config-fail-closed] PASS (missing/partial/malformed => CONFIG_NOT_READY · money defaults 0)",
);
