/**
 * verify:auth-session-cookie — PART9-pre2
 * main.ts cookie-parser · USER_SESSION_COOKIE_NAME · Set-Cookie / clearCookie
 * E2E 브라우저 로그인 ≠ 본 게이트 (플랜 § verify 강화 원칙)
 */
const fs = require("fs");
const path = require("path");
const { spawnSync } = require("child_process");

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

const main = read("services/api-nest/src/main.ts");
if (!main.includes("cookie-parser") || !main.includes("cookieParser()")) {
  fails.push("main.ts must register cookie-parser middleware");
}

const constants = read("services/api-nest/src/auth/auth.constants.ts");
if (!constants.includes('USER_SESSION_COOKIE_NAME = "aipo_session"')) {
  fails.push('auth.constants.ts must define USER_SESSION_COOKIE_NAME = "aipo_session"');
}
if (!constants.includes("ACCESS_TOKEN_TTL_SEC")) {
  fails.push("auth.constants.ts must keep ACCESS_TOKEN_TTL_SEC (cookie maxAge SSOT)");
}

const ctrl = read("services/api-nest/src/auth/auth.controller.ts");
for (const needle of [
  "USER_SESSION_COOKIE_NAME",
  "res.cookie(",
  "clearCookie(",
  "httpOnly: true",
  "passthrough: true",
]) {
  if (!ctrl.includes(needle)) {
    fails.push(`auth.controller.ts missing session-cookie wiring: ${needle}`);
  }
}

// 로그인 성공 경로 — signup / oauthCallback / magicLinkVerify / passkeyAuthVerify / refresh
for (const route of [
  "signup",
  "oauthCallback",
  "magicLinkVerify",
  "passkeyAuthVerify",
  "refresh",
]) {
  if (!ctrl.includes(route)) {
    fails.push(`auth.controller.ts must expose ${route} for Set-Cookie paths`);
  }
}
if (!ctrl.includes("attachUserSessionCookie") && !ctrl.includes("res.cookie(")) {
  fails.push("auth.controller.ts must Set-Cookie on session mint paths");
}
if (!ctrl.includes("logout")) {
  fails.push("auth.controller.ts must keep logout for clearCookie");
}

const guard = read("services/api-nest/src/auth/jwt-auth.guard.ts");
if (!guard.includes("USER_SESSION_COOKIE_NAME")) {
  fails.push("jwt-auth.guard.ts must cookie-fallback via USER_SESSION_COOKIE_NAME");
}
if (!guard.includes("cookies?")) {
  fails.push("jwt-auth.guard.ts Request type must include cookies");
}

const adminCookies =
  read("services/api-nest/src/common/admin-session.cookies.ts") +
  read("services/api-nest/src/common/admin-session.csrf.ts");
const adminBar = read("apps/admin/components/AdminSessionBar.tsx");
const adminApi = read("apps/admin/lib/admin-api.ts");
if (!adminCookies.includes('ADMIN_SESSION_COOKIE_NAME = "aipo_admin_session"')) {
  fails.push("admin session cookie must be aipo_admin_session");
}
if (!adminCookies.includes("httpOnly: true") || !adminCookies.includes('sameSite: "strict"')) {
  fails.push("admin session cookie must be HttpOnly + SameSite=strict");
}
if (adminBar.includes("sessionStorage") || adminApi.includes("sessionStorage")) {
  fails.push("admin UI must not store a privileged bearer in sessionStorage");
}
if (adminApi.includes("Authorization") && adminApi.includes("Bearer")) {
  fails.push("admin-api must not attach a JS-held Authorization bearer");
}

const pkg = read("services/api-nest/package.json");
if (!pkg.includes('"cookie-parser"')) {
  fails.push("services/api-nest/package.json must depend on cookie-parser");
}

const runtime = spawnSync(
  process.execPath,
  [
    "--test",
    "--experimental-strip-types",
    "services/api-nest/src/common/admin-session.runtime.test.ts",
  ],
  { cwd: root, encoding: "utf8", timeout: 30_000 },
);
process.stdout.write(runtime.stdout || "");
process.stderr.write(runtime.stderr || "");
if (runtime.status !== 0) {
  fails.push("admin session runtime tests failed");
}

if (fails.length) {
  console.error("[verify:auth-session-cookie] FAIL\n- " + fails.join("\n- "));
  process.exit(1);
}
console.log("[verify:auth-session-cookie] PASS");
