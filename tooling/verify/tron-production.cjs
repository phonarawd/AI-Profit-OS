const fs = require("fs");
const path = require("path");
const root = path.resolve(__dirname, "../..");
const fails = [];
function read(rel) {
  return fs.readFileSync(path.join(root, rel), "utf8");
}
function must(rel, needle, label) {
  if (!read(rel).includes(needle)) fails.push(label + ": missing " + needle);
}
function mustNot(rel, needle, label) {
  if (read(rel).includes(needle)) fails.push(label + ": forbidden " + needle);
}
function exists(rel) {
  if (!fs.existsSync(path.join(root, rel))) fails.push("missing:" + rel);
}

mustNot("services/api-nest/src/wallet/tron-address.ts", "createHmac", "hmac");
must("services/api-nest/src/wallet/tron-address.ts", "createXpubTrc20Deriver", "xpub");
must("services/api-nest/src/wallet/tron-address.ts", "m/44'/195'/0'/0/", "path");
must("services/api-nest/src/wallet/tron-grid.secret.ts", "TRON-PRO-API-KEY", "header");
must(
  "services/api-nest/src/wallet/usdt-withdraw-broadcast.service.ts",
  "allowFourEyeTxId",
  "four-eye",
);
must(
  "services/api-nest/src/wallet/wallet.module.ts",
  "UsdtWithdrawBroadcastService",
  "module-broadcast",
);
must(
  "services/api-nest/src/wallet/wallet.module.ts",
  "WalletTickSchedulerService",
  "module-tick",
);
must(
  "services/api-nest/src/wallet/chain-sweeper.phase0.service.ts",
  "TRON_TREASURY_ADDRESS",
  "sweeper-treasury-env",
);
must("tooling/tron/start-kms.ps1", "--external-url", "kms-external-url");
must("tooling/tron/start-kms.ps1", "/home/node/.tatumrc", "kms-mount");
must("tooling/tron/bootstrap-kms.ps1", "/home/node/.tatumrc", "bootstrap-mount");

for (const rel of [
  "tooling/tron/setup.cjs",
  "tooling/tron/setup-missing.cjs",
  "tooling/tron/bootstrap-kms.ps1",
  "tooling/tron/start-kms.ps1",
  "tooling/tron/stop-kms.ps1",
  "tooling/tron/verify-kms.ps1",
  "tooling/tron/backup-kms.ps1",
  "tooling/tron/prepare-kms-env.cjs",
  "tooling/tron/four-eye-server.cjs",
  "tooling/tron/load-env.cjs",
  "tooling/tron/smoke.cjs",
  "services/api-nest/src/wallet/tron-hd-xpub.ts",
  "services/api-nest/src/wallet/tron-address-quarantine.ts",
  "services/api-nest/src/wallet/usdt-withdraw-broadcast.service.ts",
  "services/api-nest/src/wallet/wallet-tick.scheduler.ts",
  "services/api-nest/src/wallet/four-eye-allowlist.ts",
  "supabase/migrations/20260902120000_withdraw_broadcast_tron.sql",
]) {
  exists(rel);
}

const pkg = JSON.parse(read("package.json"));
for (const s of [
  "tron:setup",
  "tron:setup:missing",
  "tron:bootstrap",
  "tron:start",
  "tron:stop",
  "tron:verify",
  "tron:backup",
  "tron:smoke",
  "tron:config:dry-run",
  "verify:tron-production",
]) {
  if (!pkg.scripts[s]) fails.push("script missing:" + s);
}

if (!read(".gitignore").includes(".env.tron.local")) fails.push("gitignore");
if (!read(".env.example").includes("TRONGRID_API_KEY=YOUR_TRONGRID_API_KEY"))
  fails.push("env.example");

if (fails.length) {
  console.error("FAIL verify:tron-production");
  fails.forEach((f) => console.error(" -", f));
  process.exit(1);
}
console.log("PASS verify:tron-production");
