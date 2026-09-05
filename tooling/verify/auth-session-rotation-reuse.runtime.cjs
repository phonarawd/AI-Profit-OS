/**
 * verify:auth-session-rotation-reuse - S1F Section 11 필수 회귀:
 * "이전 refresh token 재사용 탐지".
 *
 * session-rotation.service.ts는 이번 세션에서 신설된 refresh-token rotation
 * + family 단위 reuse-detection 로직이다. 실제 자금/계정 접근을 지키는
 * 코드인데도 자동 테스트가 0개였다 - 이 게이트는 그 회귀 스위트가 실제로
 * 존재하고 계속 PASS하는지 확인한다.
 *
 * session-rotation.service.ts는 TypeScript parameter property
 * (`constructor(private readonly db: ...)`)를 쓰기 때문에 node:test +
 * --experimental-strip-types(strip-only)로는 직접 실행할 수 없다 (ERR_
 * UNSUPPORTED_TYPESCRIPT_SYNTAX) - 그래서 이 스위트는 auth-jwt-runtime.cjs와
 * 동일한 패턴(scoped tsc build -> compiled dist/*.selftest.js 실행 -> stdout
 * 의 "ALL PASS" 확인)을 따른다.
 */
"use strict";

const fs = require("node:fs");
const path = require("node:path");
const { spawnSync } = require("node:child_process");

const root = path.resolve(__dirname, "../..");
const fails = [];

function fail(msg) {
  fails.push(msg);
}

function read(rel) {
  const fp = path.join(root, rel);
  if (!fs.existsSync(fp)) {
    fail(`missing: ${rel}`);
    return "";
  }
  return fs.readFileSync(fp, "utf8");
}

const testFile = "services/api-nest/src/auth/session-rotation.reuse.selftest.ts";
const svcFile = "services/api-nest/src/auth/session-rotation.service.ts";

const testSrc = read(testFile);
const svc = read(svcFile);
const pkg = read("package.json");
const domain = read("tooling/verify/domain-by-path.cjs");

if (!testSrc.includes("ForbiddenException")) {
  fail("reuse selftest must assert the ForbiddenException reuse path");
}
if (!/concurrent/i.test(testSrc)) {
  fail("reuse selftest must cover the concurrent double-rotate race, not just sequential reuse");
}
if (!svc.includes("REFRESH_TOKEN_REUSE_DETECTED")) {
  fail("session-rotation.service.ts must still throw REFRESH_TOKEN_REUSE_DETECTED (regressed contract)");
}
if (!pkg.includes('"verify:auth-session-rotation-reuse"')) {
  fail("package.json missing verify:auth-session-rotation-reuse");
}
// NOTE: CATALOG.md 문서 전용 cross-reference는 이 세션 내 editor-tooling
// block으로 추가하지 못했다 (governance/release-master/evidence/
// REL-710-714-PLAN-SSOT-UPDATE-HANDOFF.md와 동일한 클래스의 이슈) - 기능
// 배선(domain-by-path·package.json·selftest)은 전부 hard-require다.
if (!domain.includes("auth-session-rotation-reuse.runtime.cjs")) {
  fail("domain-by-path must trigger auth-session-rotation-reuse.runtime.cjs");
}

const tscBin = require.resolve("typescript/bin/tsc");
const build = spawnSync(
  process.execPath,
  [tscBin, "-p", path.join(root, "services/api-nest/tsconfig.json")],
  { cwd: root, encoding: "utf8" },
);
process.stdout.write(build.stdout || "");
process.stderr.write(build.stderr || "");
if (build.status !== 0) {
  fail("services/api-nest tsc build failed - cannot run session-rotation.reuse.selftest");
} else {
  const selftestJs = path.join(
    root,
    "services/api-nest/dist/auth/session-rotation.reuse.selftest.js",
  );
  if (!fs.existsSync(selftestJs)) {
    fail(`missing compiled selftest: ${selftestJs}`);
  } else {
    const run = spawnSync(process.execPath, [selftestJs], {
      cwd: root,
      encoding: "utf8",
      timeout: 30_000,
    });
    process.stdout.write(run.stdout || "");
    process.stderr.write(run.stderr || "");
    if (run.status !== 0 || !(run.stdout || "").includes("ALL PASS")) {
      fail("session-rotation.reuse.selftest did not report ALL PASS");
    }
  }
}

if (fails.length) {
  console.error("[verify:auth-session-rotation-reuse] FAIL\n- " + fails.join("\n- "));
  process.exit(1);
}
console.log(
  "[verify:auth-session-rotation-reuse] PASS - reuse detection + concurrent race + fail-closed all covered",
);
