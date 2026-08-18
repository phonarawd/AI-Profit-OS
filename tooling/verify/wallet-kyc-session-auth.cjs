/**
 * verify:wallet-kyc-session-auth — PART9-pre2
 * Wallet 유저 라우트(+practiceWelcome + KRW deposit own-read) + Kyc 2라우트 JwtAuthGuard · session userId
 * 내부 라우트(JWT 미부착) 허용리스트 · practiceExpireTick=machine-auth(별도 verify)
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

/** method 선언 직전 데코레이터 구간에 JwtAuthGuard 존재 여부 */
function methodHasGuard(src, methodName) {
  const idx = src.search(new RegExp(`\\b${methodName}\\s*\\(`));
  if (idx < 0) return false;
  const window = src.slice(Math.max(0, idx - 220), idx);
  return /@UseGuards\(JwtAuthGuard\)/.test(window);
}

/** method 선언 직전 데코레이터에 JwtAuthGuard가 있으면 true (내부 라우트 금지용) */
function methodImmediatelyGuarded(src, methodName) {
  const idx = src.search(new RegExp(`\\b${methodName}\\s*\\(`));
  if (idx < 0) return false;
  // 직전 메서드 경계(~직전 `}` 이후)만 본다
  const before = src.slice(0, idx);
  const lastClose = before.lastIndexOf("\n  }");
  const window = before.slice(lastClose >= 0 ? lastClose : Math.max(0, idx - 220));
  return /@UseGuards\(JwtAuthGuard\)/.test(window);
}

const wallet = read("services/api-nest/src/wallet/wallet.controller.ts");
const kyc = read("services/api-nest/src/compliance/kyc.controller.ts");

if (!wallet.includes("JwtAuthGuard")) {
  fails.push("wallet.controller.ts must import/use JwtAuthGuard");
}
if (!kyc.includes("JwtAuthGuard")) {
  fails.push("kyc.controller.ts must import/use JwtAuthGuard");
}

// 클래스 전체 가드 금지 — 내부 7라우트 고장 방지
if (/@UseGuards\(JwtAuthGuard\)\s*\r?\n@Controller/.test(wallet)) {
  fails.push(
    "wallet.controller.ts must NOT class-decorate @UseGuards(JwtAuthGuard) — per-route only",
  );
}

const userMethods = [
  "getBuckets",
  "mergeProfit",
  "practiceWelcome",
  "myDepositAddress",
  "createKrwDeposit",
  "listKrwDeposits",
  "getKrwDeposit",
  "createDepositDispute",
  "createStepUpChallenge",
  "verifyStepUp",
  "setWithdrawPin",
  "createWithdraw",
];
for (const m of userMethods) {
  if (!wallet.includes(`${m}(`) && !new RegExp(`\\b${m}\\s*\\(`).test(wallet)) {
    fails.push(`wallet.controller.ts missing user route method: ${m}`);
    continue;
  }
  if (!methodHasGuard(wallet, m)) {
    fails.push(`${m} must be preceded by @UseGuards(JwtAuthGuard)`);
  }
}

const guardCount = (wallet.match(/@UseGuards\(JwtAuthGuard\)/g) || []).length;
if (guardCount < 10) {
  fails.push(
    `wallet.controller.ts must apply @UseGuards(JwtAuthGuard) on ≥10 user routes (found ${guardCount})`,
  );
}

if (!wallet.includes("sessionUserId")) {
  fails.push("wallet.controller.ts must resolve sessionUserId (not query/body userId)");
}

// 유저 라우트 시그니처에서 query userId 제거 확인
if (wallet.includes('@Query("userId")')) {
  fails.push('wallet.controller.ts user routes must not use @Query("userId")');
}

// getBuckets / myDepositAddress 등이 sessionUserId를 쓰는지
for (const needle of [
  "this.sessionUserId(req)",
  "private sessionUserId(",
]) {
  if (!wallet.includes(needle)) {
    fails.push(`wallet.controller.ts missing: ${needle}`);
  }
}

const internalMethods = [
  "observeUsdtDeposit",
  "chainWatcherTick",
  "chainWatcherStatus",
  "chainSweeperTick",
  "chainSweeperStatus",
  "practiceExpireTick",
];
for (const m of internalMethods) {
  if (!new RegExp(`\\b${m}\\s*\\(`).test(wallet)) {
    fails.push(`wallet.controller.ts must keep internal route: ${m}`);
    continue;
  }
  if (methodImmediatelyGuarded(wallet, m)) {
    fails.push(
      `${m} is internal — must NOT have @UseGuards(JwtAuthGuard) (allowlist)`,
    );
  }
}
if (!wallet.includes("assertInternalWalletTickAuth")) {
  fails.push(
    "practiceExpireTick must use fail-closed assertInternalWalletTickAuth",
  );
}

// Kyc 2라우트
for (const m of ["status", "submit"]) {
  if (!new RegExp(`\\b${m}\\s*\\(`).test(kyc)) {
    fails.push(`kyc.controller.ts missing method: ${m}`);
  }
  if (!methodHasGuard(kyc, m)) {
    fails.push(`kyc ${m} must be preceded by @UseGuards(JwtAuthGuard)`);
  }
}
const kycGuards = (kyc.match(/@UseGuards\(JwtAuthGuard\)/g) || []).length;
if (kycGuards < 2) {
  fails.push(
    `kyc.controller.ts must apply @UseGuards(JwtAuthGuard) on status+submit (found ${kycGuards})`,
  );
}
if (!kyc.includes("sessionUserId") || !kyc.includes("this.sessionUserId(req)")) {
  fails.push("kyc.controller.ts must use sessionUserId");
}
if (kyc.includes('@Query("userId")')) {
  fails.push('kyc.controller.ts must not use @Query("userId")');
}
if (/userId:\s*String\(body\.userId/.test(kyc)) {
  fails.push("kyc submit must not trust body.userId");
}

if (fails.length) {
  console.error("[verify:wallet-kyc-session-auth] FAIL\n- " + fails.join("\n- "));
  process.exit(1);
}
console.log("[verify:wallet-kyc-session-auth] PASS");
