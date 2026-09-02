/**
 * Static TRON production readiness verifier (no secret values printed).
 */
const fs = require("fs");
const path = require("path");

const root = path.resolve(__dirname, "../..");
const fails = [];

function read(rel) {
  return fs.readFileSync(path.join(root, rel), "utf8");
}

function mustInclude(rel, needle, label) {
  const text = read(rel);
  if (!text.includes(needle)) fails.push(`${label}: missing ${needle}`);
}

function mustNotInclude(rel, needle, label) {
  const text = read(rel);
  if (text.includes(needle)) fails.push(`${label}: forbidden ${needle}`);
}

// 1) synthetic HMAC absent
mustNotInclude(
  "services/api-nest/src/wallet/tron-address.ts",
  "createHmac",
  "tron-address",
);
mustInclude(
  "services/api-nest/src/wallet/tron-address.ts",
  "resolveXpubTrc20DeriverFromEnv",
  "tron-address",
);
mustInclude(
  "services/api-nest/src/wallet/tron-address.ts",
  "m/44'/195'/0'/0/",
  "hd-path",
);

// 2) env-only TronGrid
mustInclude(
  "services/api-nest/src/wallet/tron-grid.secret.ts",
  "TRONGRID_API_KEY",
  "tron-grid.secret",
);
mustInclude(
  "services/api-nest/src/wallet/tron-grid.secret.ts",
  "TRON-PRO-API-KEY",
  "tron-grid.header",
);

// 3) setup wizard + KMS scripts
for (const rel of [
  "tooling/tron/setup.cjs",
  "tooling/tron/bootstrap-kms.ps1",
  "tooling/tron/start-kms.ps1",
  "tooling/tron/stop-kms.ps1",
  "tooling/tron/verify-kms.ps1",
  "tooling/tron/backup-kms.ps1",
  "services/api-nest/src/wallet/tron-hd-xpub.ts",
  "services/api-nest/src/wallet/tron-address-quarantine.ts",
  "services/api-nest/src/wallet/usdt-withdraw-broadcast.service.ts",
  "services/api-nest/src/wallet/wallet-tick.scheduler.ts",
]) {
  if (!fs.existsSync(path.join(root, rel))) fails.push(`missing:${rel}`);
}

// 4) package scripts
const pkg = JSON.parse(read("package.json"));
for (const s of [
  "tron:setup",
  "tron:bootstrap",
  "tron:start",
  "tron:stop",
  "tron:verify",
  "tron:backup",
  "verify:tron-production",
]) {
  if (!pkg.scripts[s]) fails.push(`script missing:${s}`);
}

// 5) .env.example placeholders only
const envEx = read(".env.example");
if (!envEx.includes("TRONGRID_API_KEY=YOUR_TRONGRID_API_KEY")) {
  fails.push("env.example trongrid placeholder");
}
if (/TRONGRID_API_KEY=\s*(?!YOUR_|change_me)[A-Za-z0-9_\-]{20,}/.test(envEx)) {
  fails.push("env.example live-looking trongrid key");
}

// 6) gitignore
const gi = read(".gitignore");
if (!gi.includes(".env.tron.local") || !gi.includes("wallet.dat")) {
  fails.push("gitignore tron secrets incomplete");
}

// 7) deposit_config must not authorize API key storage in ready parser
const ready = read("services/api-nest/src/wallet/deposit-config.ready.ts");
if (
  ready.includes("parsed.usdtOnchain.tronGridApiKey") &&
  !ready.includes("tronGridApiKey_forbidden")
) {
  fails.push("deposit-config still accepts tronGridApiKey authority");
}

if (fails.length) {
  console.error("FAIL verify:tron-production");
  for (const f of fails) console.error(" -", f);
  process.exit(1);
}
console.log("PASS verify:tron-production");
