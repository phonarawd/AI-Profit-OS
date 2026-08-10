/**
 * verify:money-wallet-auth-remediation — Money post-r0 Finding A+B
 * A: practiceWelcome JWT + sessionUserId · body.userId 무시
 * B: practiceExpireTick fail-closed machine-auth · Adapters fail-open 복제0
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

const wallet = read("services/api-nest/src/wallet/wallet.controller.ts");
const env = read("services/api-nest/src/config/phase0.env.ts");
const envExample = read(".env.example");
const adapters = read(
  "services/api-nest/src/adapters/adapters.ingest.controller.ts",
);

// Finding A
const welcomeIdx = wallet.search(/\bpracticeWelcome\s*\(/);
if (welcomeIdx < 0) {
  fails.push("practiceWelcome missing");
} else {
  const before = wallet.slice(Math.max(0, welcomeIdx - 280), welcomeIdx);
  if (!/@UseGuards\(JwtAuthGuard\)/.test(before)) {
    fails.push("practiceWelcome must have @UseGuards(JwtAuthGuard)");
  }
  const fnWindow = wallet.slice(welcomeIdx, welcomeIdx + 220);
  if (/body\.userId/.test(fnWindow)) {
    fails.push("practiceWelcome must not trust body.userId");
  }
  if (!/sessionUserId\(req\)/.test(fnWindow)) {
    fails.push("practiceWelcome must use sessionUserId(req)");
  }
}

// Finding B — fail-closed
if (!wallet.includes("assertInternalWalletTickAuth")) {
  fails.push("missing assertInternalWalletTickAuth");
}
if (!wallet.includes("INTERNAL_WALLET_TICK_TOKEN_UNSET")) {
  fails.push("unset token must Unauthorized (fail-closed)");
}
if (!wallet.includes("INTERNAL_WALLET_TICK_TOKEN_INVALID")) {
  fails.push("invalid token must Unauthorized");
}
if (!env.includes("internalWalletTickToken")) {
  fails.push("phase0.env must expose internalWalletTickToken");
}
if (!env.includes('read("INTERNAL_WALLET_TICK_TOKEN")')) {
  fails.push("phase0.env must read INTERNAL_WALLET_TICK_TOKEN");
}
if (!envExample.includes("INTERNAL_WALLET_TICK_TOKEN")) {
  fails.push(".env.example must document INTERNAL_WALLET_TICK_TOKEN");
}

// Adapters fail-open pattern must NOT be copied for wallet tick
const tickIdx = wallet.search(/\bpracticeExpireTick\s*\(/);
if (tickIdx >= 0) {
  const tickFn = wallet.slice(tickIdx, tickIdx + 600);
  if (/if\s*\(\s*token\s*\)/.test(tickFn) || /if\s*\(\s*expected\s*\)/.test(tickFn)) {
    fails.push(
      "practiceExpireTick must not copy Adapters fail-open `if (token) { check }`",
    );
  }
}
if (adapters.includes("if (token)")) {
  // adapters may still be fail-open (Engine Finding C) — wallet must not mirror
}

const pkg = JSON.parse(read("package.json"));
if (!pkg.scripts?.["verify:money-wallet-auth-remediation"]) {
  fails.push("package.json missing verify:money-wallet-auth-remediation");
}
const catalog = read("tooling/verify/CATALOG.md");
if (!catalog.includes("money-wallet-auth-remediation")) {
  fails.push("CATALOG.md missing money-wallet-auth-remediation");
}

if (fails.length) {
  console.error("[verify:money-wallet-auth-remediation] FAIL");
  for (const f of fails) console.error(`  - ${f}`);
  process.exit(1);
}
console.log(
  "[verify:money-wallet-auth-remediation] PASS (A session binding · B fail-closed machine-auth · catalog)",
);
