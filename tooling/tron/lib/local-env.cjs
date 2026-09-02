/**
 * Shared TRON local-env helpers. Never logs secret values.
 */
const fs = require("fs");
const path = require("path");
const { spawnSync } = require("child_process");
const os = require("os");

// tooling/tron/lib → repo root = ../../..
const ROOT = path.resolve(__dirname, "../../..");
const LOCAL_ENV_FILE = path.join(ROOT, ".env.tron.local");
const KMS_HOME =
  process.env.AIPO_TRON_KMS_HOME ||
  path.join(os.homedir(), "AppData", "Local", "AI-Profit-OS", "tatum-kms");

const KEYS = [
  "TRONGRID_API_KEY",
  "TRONGRID_BASE_URL",
  "TATUM_MAINNET_API_KEY",
  "TATUM_TESTNET_API_KEY",
  "TATUM_KMS_SIGNATURE_ID",
  "TRON_TREASURY_ADDRESS",
  "TRON_HOT_WALLET_XPUB",
  "INTERNAL_WALLET_TICK_TOKEN",
  "TATUM_KMS_PASSWORD",
  "WALLET_TICK_SCHEDULER",
];

function readEnvFile(filePath) {
  if (!fs.existsSync(filePath)) return {};
  const out = {};
  for (const line of fs.readFileSync(filePath, "utf8").split(/\r?\n/)) {
    const t = line.trim();
    if (!t || t.startsWith("#")) continue;
    const i = t.indexOf("=");
    if (i < 1) continue;
    let v = t.slice(i + 1).trim();
    if (
      (v.startsWith('"') && v.endsWith('"')) ||
      (v.startsWith("'") && v.endsWith("'"))
    ) {
      v = v.slice(1, -1);
    }
    out[t.slice(0, i).trim()] = v;
  }
  return out;
}

function writeEnvFile(filePath, map) {
  const lines = [
    "# AI Profit OS — TRON local secrets (NEVER commit)",
    `# written ${new Date().toISOString()}`,
    "",
  ];
  for (const k of KEYS) {
    if (map[k]) lines.push(`${k}=${map[k]}`);
  }
  for (const [k, v] of Object.entries(map)) {
    if (!KEYS.includes(k) && v) lines.push(`${k}=${v}`);
  }
  lines.push("");
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, lines.join("\n"), { encoding: "utf8", mode: 0o600 });
}

function assertGitIgnored(rel) {
  const r = spawnSync("git", ["check-ignore", "-v", rel.replace(/\\/g, "/")], {
    cwd: ROOT,
    encoding: "utf8",
  });
  if (r.status !== 0) throw new Error(`NOT_GITIGNORED:${rel}`);
  return (r.stdout || "").trim();
}

function maskStatus(map) {
  const status = {};
  for (const k of KEYS) status[k] = map[k] ? "set" : "missing";
  return status;
}

module.exports = {
  ROOT,
  LOCAL_ENV_FILE,
  KMS_HOME,
  KEYS,
  readEnvFile,
  writeEnvFile,
  assertGitIgnored,
  maskStatus,
};
