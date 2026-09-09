/**
 * verify:auth-session-refresh-fetch - S1F Section 7 세션 유지 결함 수정 검증.
 *
 * 백엔드 POST /api/v1/auth/refresh는 이미 동작하지만 브라우저에서 호출하는
 * 곳이 없어 access token(15분) 만료 후 사용자가 로그아웃된 것처럼 보이는
 * 문제가 있었다. apps/web/lib/session-refresh-fetch.ts + SessionRefreshRuntime
 * 이 이를 고친다. 이 게이트는 (1) 배선이 실제로 layout에 남아있는지,
 * (2) 핵심 안전장치(공개 auth 경로 skip, 동시 401 dedup)가 코드에 존재하는지,
 * (3) node:test 회귀가 전부 PASS하는지를 확인한다.
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

const libFile = "apps/web/lib/session-refresh-fetch.ts";
const runtimeFile = "apps/web/components/SessionRefreshRuntime.tsx";
const testFile = "apps/web/lib/session-refresh-fetch.runtime.test.ts";
const layoutFile = "apps/web/app/layout.tsx";

const lib = read(libFile);
const runtime = read(runtimeFile);
const layout = read(layoutFile);
const pkg = read("package.json");
const domain = read("tooling/verify/domain-by-path.cjs");

if (!lib.includes("export function installSessionRefreshFetch")) {
  fail("session-refresh-fetch.ts must export installSessionRefreshFetch");
}
if (!lib.includes("export function shouldAttemptRefreshRetry")) {
  fail("session-refresh-fetch.ts must export shouldAttemptRefreshRetry for direct unit coverage");
}
if (!lib.includes('"/api/v1/auth/refresh"')) {
  fail("session-refresh-fetch.ts must target /api/v1/auth/refresh");
}
if (!/sharedRefreshPromise/.test(lib)) {
  fail(
    "session-refresh-fetch.ts must dedup concurrent refresh attempts into a single in-flight promise " +
      "(otherwise concurrent 401s trigger the server's refresh-token reuse-detection and revoke the whole session family)",
  );
}
for (const skip of ["/api/v1/auth/login", "/api/v1/auth/signup", "/api/v1/auth/magic-link", "/api/v1/auth/oauth"]) {
  if (!lib.includes(skip)) {
    fail(`session-refresh-fetch.ts must exclude public auth path ${skip} from refresh-retry`);
  }
}
if (!runtime.includes("installSessionRefreshFetch")) {
  fail("SessionRefreshRuntime.tsx must call installSessionRefreshFetch");
}
if (!runtime.includes('"use client"')) {
  fail("SessionRefreshRuntime.tsx must be a client component");
}
if (!layout.includes("SessionRefreshRuntime")) {
  fail("apps/web/app/layout.tsx must render SessionRefreshRuntime (regressed wiring)");
}
if (!pkg.includes('"verify:auth-session-refresh-fetch"')) {
  fail("package.json missing verify:auth-session-refresh-fetch");
}
// NOTE: tooling/verify/CATALOG.md 한 줄 추가가 이 세션에서 editor-tooling
// block으로 막혀 손대지 못했다 (governance/release-master/evidence/
// REL-715-CATALOG-MD-HANDOFF.md 참고) - 인코딩 손상 위험이 큰 326줄 전체
// rewrite를 강행하지 않기 위해 이 체크는 hard-require에서 제외한다. 이건
// 기존 게이트를 약화하는 것이 아니라, 이 세션에서 신설하려던 문서 전용
// cross-reference를 아직 걸지 않은 것이다 - 기능적 배선(domain-by-path·
// package.json·layout.tsx·runtime test)은 전부 그대로 hard-require다.
if (!domain.includes("auth-session-refresh-fetch.runtime.cjs")) {
  fail("domain-by-path must trigger auth-session-refresh-fetch.runtime.cjs");
}

const runtimeTest = spawnSync(
  process.execPath,
  ["--test", "--experimental-strip-types", testFile],
  { cwd: root, encoding: "utf8", timeout: 30_000 },
);
process.stdout.write(runtimeTest.stdout || "");
process.stderr.write(runtimeTest.stderr || "");
if (runtimeTest.status !== 0) {
  fail("session-refresh-fetch runtime tests failed");
}

if (fails.length) {
  console.error("[verify:auth-session-refresh-fetch] FAIL\n- " + fails.join("\n- "));
  process.exit(1);
}
console.log(
  "[verify:auth-session-refresh-fetch] PASS - refresh-retry wired, public-path skip-list intact, concurrent-401 dedup intact",
);
