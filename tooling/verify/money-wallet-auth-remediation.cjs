/**
 * verify:money-wallet-auth-remediation — Money post-r0 Finding A+B
 * A: practiceWelcome JWT + sessionUserId · body.userId 무시
 * B: practice/chain internal routes fail-closed machine-auth · unauthenticated money mutation 0
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

// Finding B — all internal wallet mutation/control routes fail closed
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

for (const method of [
  "practiceExpireTick",
  "observeUsdtDeposit",
  "chainWatcherTick",
  "chainWatcherStatus",
  "chainSweeperTick",
  "chainSweeperStatus",
]) {
  const idx = wallet.search(new RegExp("\\b" + method + "\\s*\\("));
  if (idx < 0) {
    fails.push(method + " missing");
    continue;
  }
  const before = wallet.slice(Math.max(0, idx - 220), idx + 900);
  if (!before.includes('@Headers("x-internal-wallet-token")')) {
    fails.push(method + " must require x-internal-wallet-token");
  }
  if (!before.includes("this.assertInternalWalletTickAuth(headerToken)")) {
    fails.push(method + " must authenticate before operation");
  }
}

const observeIdx = wallet.search(/\bobserveUsdtDeposit\s*\(/);
if (observeIdx >= 0) {
  const observeFn = wallet.slice(observeIdx, observeIdx + 1100);
  const authAt = observeFn.indexOf("this.assertInternalWalletTickAuth(headerToken)");
  const mutateAt = observeFn.indexOf("this.usdtDeposit.observe");
  if (authAt < 0 || mutateAt < 0 || authAt > mutateAt) {
    fails.push("observeUsdtDeposit must authenticate before deposit/ledger mutation");
  }
}

// Fail-open token checks must NOT be used for wallet machine routes
const tickIdx = wallet.search(/\bpracticeExpireTick\s*\(/);
if (tickIdx >= 0) {
  const tickFn = wallet.slice(tickIdx, tickIdx + 600);
  if (/if\s*\(\s*token\s*\)/.test(tickFn) || /if\s*\(\s*expected\s*\)/.test(tickFn)) {
    fails.push(
      "practiceExpireTick must not copy Adapters fail-open `if (token) { check }`",
    );
  }
}
if (/if\s*\(\s*token\s*\)/.test(adapters)) {
  fails.push("adapter ingest fail-open token pattern reintroduced");
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
  "[verify:money-wallet-auth-remediation] PASS (A session binding · B all internal wallet chain/tick routes fail closed · catalog)",
);
