/**
 * Load .env.tron.local and print ONLY non-secret readiness for PowerShell bootstrap.
 * For secret handoff to kms.env, writes files under KMS home without stdout of secrets.
 */
const fs = require("fs");
const path = require("path");
const os = require("os");
const {
  LOCAL_ENV_FILE,
  readEnvFile,
  maskStatus,
} = require("./lib/local-env.cjs");

const map = readEnvFile(LOCAL_ENV_FILE);
const network = (map.TATUM_NETWORK || "mainnet").toLowerCase();
// Prefer local env; fall back to existing kms.env (prior bootstrap) without printing secrets.
const kmsHomeEarly =
  process.env.AIPO_TRON_KMS_HOME ||
  path.join(os.homedir(), "AppData", "Local", "AI-Profit-OS", "tatum-kms");
const priorKms = readEnvFile(path.join(kmsHomeEarly, "kms.env"));
const apiKey =
  network === "testnet"
    ? map.TATUM_TESTNET_API_KEY
    : map.TATUM_MAINNET_API_KEY ||
      map.TATUM_API_KEY ||
      priorKms.TATUM_API_KEY;

if (!apiKey) {
  console.error("TATUM_API_KEY_MISSING");
  process.exit(2);
}

// Heal .env.tron.local mainnet key from kms.env if missing (no stdout of secret).
if (
  network !== "testnet" &&
  !map.TATUM_MAINNET_API_KEY &&
  apiKey
) {
  const { writeEnvFile } = require("./lib/local-env.cjs");
  writeEnvFile(LOCAL_ENV_FILE, {
    ...map,
    TATUM_MAINNET_API_KEY: apiKey,
  });
  map.TATUM_MAINNET_API_KEY = apiKey;
}

const kmsHome =
  process.env.AIPO_TRON_KMS_HOME ||
  path.join(os.homedir(), "AppData", "Local", "AI-Profit-OS", "tatum-kms");
fs.mkdirSync(path.join(kmsHome, "wallet"), { recursive: true });

const pwdFile = path.join(kmsHome, "kms.password");
if (!fs.existsSync(pwdFile)) {
  fs.writeFileSync(pwdFile, require("crypto").randomBytes(24).toString("base64"), {
    encoding: "ascii",
    mode: 0o600,
  });
}
const kmsPass = fs.readFileSync(pwdFile, "utf8").trim();
const envFile = path.join(kmsHome, "kms.env");
fs.writeFileSync(
  envFile,
  `TATUM_API_KEY=${apiKey}\nTATUM_KMS_PASSWORD=${kmsPass}\n`,
  { encoding: "ascii", mode: 0o600 },
);

const out = {
  ok: true,
  kmsHome,
  envFile,
  walletDir: path.join(kmsHome, "wallet"),
  network,
  mask: maskStatus(map),
  hasTreasury: Boolean(map.TRON_TREASURY_ADDRESS),
  hasXpub: Boolean(map.TRON_HOT_WALLET_XPUB),
  hasSignatureId: Boolean(map.TATUM_KMS_SIGNATURE_ID),
};
process.stdout.write(JSON.stringify(out));
