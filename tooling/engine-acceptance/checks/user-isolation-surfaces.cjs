/**
 * QA2 — user isolation 공격면
 * A/B interleave · token 교차 · object id 교체(IDOR)
 * 제품 mutation 0 · 정적 oracle + child verify
 */
"use strict";

const fs = require("node:fs");
const path = require("node:path");
const { ROOT } = require("../lib/hash-scope.cjs");
const { spawnVerify } = require("../lib/spawn-verify.cjs");

function read(rel) {
  const p = path.join(ROOT, rel);
  return fs.existsSync(p) ? fs.readFileSync(p, "utf8") : "";
}

function faceInterleave() {
  const findings = [];
  // 순차 A/B만으로는 부족 — 세션 바인딩 + ownership 재검증 흔적
  const participate = read("services/api-nest/src/opportunities/participate.service.ts");
  const oppCtl = read("services/api-nest/src/opportunities/opportunities.user.controller.ts");
  const conv = read("services/api-nest/src/ai/conversation-state.service.ts");

  if (!oppCtl.includes("JwtAuthGuard") || !oppCtl.includes("sessionUserId")) {
    findings.push("opportunities.user.controller missing JwtAuthGuard/sessionUserId (interleave surface)");
  }
  if (!participate.includes("assertSessionUserId") && !participate.includes("userId = JWT session")) {
    findings.push("participate must bind userId to session (interleave)");
  }
  // conversation ownership fail-closed (동시 세션 교차 방지 축)
  if (conv && !/ownership|fail-closed|userId/i.test(conv)) {
    findings.push("conversation-state ownership binding weak/missing for interleave axis");
  }

  return {
    attack_face: "interleave",
    invariant_id: "INV-ISOLATION-01",
    status: findings.length ? "FAIL" : "PASS",
    findings,
  };
}

function faceTokenCross() {
  const findings = [];
  const guard = read("services/api-nest/src/auth/jwt-auth.guard.ts");
  const jwtCore =
    read("services/api-nest/src/auth/jwt.core.ts") ||
    read("services/api-nest/jwt.core.cjs");
  const wallet = read("services/api-nest/src/wallet/wallet.controller.ts");
  const home = read("services/api-nest/src/home-read/home-read.user.controller.ts");

  if (!guard) {
    findings.push("jwt-auth.guard.ts missing");
  } else if (!guard.includes("canActivate") && !/JwtService|verify|request\.user/i.test(guard)) {
    findings.push("jwt-auth.guard lacks verify/canActivate/request.user binding");
  }
  if (!guard && !jwtCore) {
    findings.push("JWT guard/core missing — token cross cannot be denied");
  }
  // token of A on B resource: sessionUserId from req.user only (query userId 금지)
  if (wallet && !wallet.includes("sessionUserId")) {
    findings.push("wallet.controller must resolve sessionUserId (token cross)");
  }
  if (wallet && /@Query\(\s*["']userId["']\s*\)/.test(wallet)) {
    findings.push("wallet must not accept query userId (token/IDOR mix)");
  }
  if (home && !home.includes("sessionUserId")) {
    findings.push("home-read.user.controller must use sessionUserId (token cross)");
  }
  // Phase0: Nest boot runtime verify는 CI/QA8 축 — 로컬 tiny에서 OOM 유발 금지
  // 정적 session 바인딩만 검사 (제품 mutation 0)

  return {
    attack_face: "token_cross",
    invariant_id: "INV-ISOLATION-01",
    status: findings.length ? "FAIL" : "PASS",
    findings,
    child_verifies: [],
  };
}

function faceObjectIdSwap() {
  const findings = [];
  const wallet = read("services/api-nest/src/wallet/wallet.controller.ts");
  const kyc = read("services/api-nest/src/kyc/kyc.controller.ts");
  const homeMoney = read("services/api-nest/src/wallet/home-money-read.user.controller.ts");
  const participate = read("services/api-nest/src/opportunities/participate.service.ts");

  if (wallet && /@Query\(\s*["']userId["']\s*\)/.test(wallet)) {
    findings.push("wallet IDOR: @Query(userId) forbidden");
  }
  if (kyc && /@Query\(\s*["']userId["']\s*\)/.test(kyc)) {
    findings.push("kyc IDOR: @Query(userId) forbidden");
  }
  if (homeMoney && /@Query\(\s*["']userId["']\s*\)/.test(homeMoney)) {
    findings.push("home-money-read IDOR: @Query(userId) forbidden");
  }
  if (participate && !participate.includes("user_id")) {
    findings.push("participate ownership column user_id missing for object isolation");
  }

  const childWallet = spawnVerify("tooling/verify/wallet-kyc-session-auth.cjs");
  if (!childWallet.ok) {
    findings.push(`verify:wallet-kyc-session-auth exit=${childWallet.exitCode}`);
  }
  const childHome = spawnVerify("tooling/verify/home-money-read-contract.cjs");
  if (!childHome.ok) {
    findings.push(`verify:home-money-read-contract exit=${childHome.exitCode}`);
  }

  return {
    attack_face: "object_id_swap",
    invariant_id: "INV-ISOLATION-01",
    status: findings.length ? "FAIL" : "PASS",
    findings,
    child_verifies: [childWallet, childHome],
  };
}

function runUserIsolationSurfaces() {
  const faces = [faceInterleave(), faceTokenCross(), faceObjectIdSwap()];
  const failCount = faces.filter((f) => f.status === "FAIL").length;
  return {
    check_id: "QA2_USER_ISOLATION_SURFACES",
    status: failCount ? "FAIL" : "PASS",
    invariant_id: "INV-ISOLATION-01",
    required_faces: ["interleave", "token_cross", "object_id_swap"],
    failCount,
    passCount: faces.length - failCount,
    faces,
  };
}

module.exports = { runUserIsolationSurfaces };
