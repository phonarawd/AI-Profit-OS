/**
 * verify:s3-32-user-auth — S3 / 3.2 C1-C3
 * Connection matrix + signup/Kakao/Turnstile/session wiring.
 * Live Kakao / live Turnstile secret / staging browser stay S6.
 * Production DB apply 0. launchYes must stay false.
 */
"use strict";

const fs = require("fs");
const path = require("path");
const { spawnSync } = require("child_process");

const root = path.resolve(__dirname, "../..");
const fails = [];
const fail = (msg) => fails.push(msg);

function read(rel) {
  const fp = path.join(root, rel);
  if (!fs.existsSync(fp)) {
    fail("missing: " + rel);
    return "";
  }
  return fs.readFileSync(fp, "utf8");
}

function walk(dir, pred, acc = []) {
  if (!fs.existsSync(dir)) return acc;
  for (const ent of fs.readdirSync(dir, { withFileTypes: true })) {
    const abs = path.join(dir, ent.name);
    if (ent.isDirectory()) {
      if (ent.name === "node_modules" || ent.name === "dist") continue;
      walk(abs, pred, acc);
    } else if (pred(ent.name, abs)) acc.push(abs);
  }
  return acc;
}

const matrixRel = "governance/auth/s3-32-connection-matrix.v1.json";
const matrixRaw = read(matrixRel);
let matrix;
try {
  matrix = JSON.parse(matrixRaw);
} catch (err) {
  fail("matrix JSON invalid: " + err.message);
  matrix = { checks: {}, routes: [] };
}

if (matrix.liveE2e !== "NOT_RUN") fail("matrix.liveE2e must stay NOT_RUN until S6");
if (matrix.productionDbApply !== false) fail("matrix must not claim production DB apply");
if (matrix.launchYes !== false) fail("matrix.launchYes must stay false");
if (matrix.stagingBrowser !== "NOT_RUN") fail("matrix.stagingBrowser must stay NOT_RUN");

const liveClaims = ["C2_kakao_live", "C3_turnstile_live_secret", "C3_upstash_live"];
for (const key of liveClaims) {
  if (matrix.checks && matrix.checks[key] !== "NOT_RUN") {
    fail("matrix." + key + " must stay NOT_RUN");
  }
}
if (matrix.checks && matrix.checks.C2_kakao_unlink === "code") {
  fail("C2 unlink must not be claimed as wired");
}

const consentJson = JSON.parse(read("governance/auth/consent-versions.v1.json") || "{}");
const nestConsent = read("services/api-nest/src/auth/consent-versions.ts");
const uiConsent = read("packages/ui/components/auth/consent-versions.ts");
const terms = consentJson.termsVersion;
const privacy = consentJson.privacyVersion;
if (!terms || !privacy) fail("consent-versions JSON missing versions");
if (!nestConsent.includes('"' + terms + '"')) fail("Nest consent version drift");
if (!nestConsent.includes('"' + privacy + '"')) fail("Nest privacy version drift");
if (!uiConsent.includes('"' + terms + '"')) fail("UI consent version drift");
if (!uiConsent.includes('"' + privacy + '"')) fail("UI privacy version drift");

const jwt = read("services/api-nest/src/auth/auth.constants.ts");
if (!jwt.includes("USER_JWT_ISSUER") || !jwt.includes("ADMIN_JWT_ISSUER")) {
  fail("JWT issuer constants missing");
}
if (!jwt.includes('"ai-profit-os-nest"') || !jwt.includes('"ai-profit-os-admin"')) {
  fail("user/admin JWT issuers missing");
}
if (!jwt.includes('"peotteok-user"') || !jwt.includes('"aipo-ops"')) {
  fail("user/admin JWT audiences missing");
}

const classic = read("services/api-nest/src/auth/classic-signup.service.ts");
if (classic.includes('ConflictException("EMAIL_TAKEN")') || classic.includes('BadRequestException("EMAIL_TAKEN")')) {
  fail("classic signup must not throw EMAIL_TAKEN");
}
if (!classic.includes("sendAccountExistsNotice")) {
  fail("classic signup must send account-exists notice instead of enumerating email");
}
if (!classic.includes("USERNAME_TAKEN")) {
  fail("classic signup must still reject taken public username");
}
if (!classic.includes("readConsentVersions")) {
  fail("classic signup must persist consent versions");
}
if (!classic.includes("hashPassword")) {
  fail("classic signup must hash password before persist");
}

const policy = read("services/api-nest/src/auth/classic-signup.policy.ts");
if (!policy.includes("isValidEmail")) fail("classic policy must validate email");
if (!policy.includes("phoneE164")) fail("classic policy must keep phone optional");

const login = read("services/api-nest/src/auth/password-auth.service.ts");
if (!login.includes("EMAIL_NOT_VERIFIED")) {
  fail("classic login must block unverified email");
}

const reset = read("services/api-nest/src/auth/password-auth.service.ts");
if (!/revok|family|logoutAll|revokeFamily/i.test(reset + read("services/api-nest/src/auth/session-rotation.service.ts"))) {
  fail("password reset/session family revoke wiring missing");
}

const pwned = read("services/api-nest/src/auth/pwned-password.service.ts");
if (!pwned.includes("sha1") && !pwned.includes("SHA-1") && !pwned.includes("createHash(\"sha1\")")) {
  fail("HIBP must use SHA-1 prefix, not the stored password hash");
}
if (pwned.includes("hashPassword")) {
  fail("HIBP must not reuse the storage hash");
}

const oauth = read("services/api-nest/src/auth/oauth-identity.service.ts");
if (oauth.includes("providerSubject") && !oauth.includes("kauth.kakao.com/oauth/token")) {
  fail("Kakao must exchange code on the server");
}
if (!oauth.includes("profile_nickname,profile_image,account_email")) {
  fail("Kakao authorize scope missing");
}
if (!oauth.includes("nickname") || !oauth.includes("profile_image")) {
  fail("Kakao profile seed fields missing");
}

const authSvc = read("services/api-nest/src/auth/auth.service.ts");
if (!authSvc.includes("seedOauthProfileOnce")) fail("Kakao seed-once missing");
if (!authSvc.includes("AND display_name IS NULL")) fail("Kakao must not overwrite display_name");
if (!authSvc.includes("AND avatar_url IS NULL")) fail("Kakao must not overwrite avatar_url");
if (!authSvc.includes("OAUTH_EMAIL_IN_USE")) fail("Kakao email collision missing");

const turnstile =
  read("services/api-nest/src/common/turnstile.service.ts") +
  read("services/api-nest/turnstile.policy.cjs");
if (!turnstile.includes("hostnameAllowed") || !turnstile.includes("hitpk.app")) {
  fail("Turnstile hostname allowlist / typo reject missing");
}
if (!turnstile.includes("challengeFresh")) fail("Turnstile expiry check missing");
if (!turnstile.includes("TOKEN_REPLAY")) fail("Turnstile replay check missing");
if (!turnstile.includes("NOT_CONFIGURED")) fail("Turnstile fail-closed missing");
if (/if\s*\(\s*!secret\s*\)[\s\S]{0,80}ok:\s*true/.test(turnstile)) {
  fail("Turnstile must not pass when secret is missing");
}

const guard =
  read("services/api-nest/src/common/turnstile.guard.ts") +
  read("services/api-nest/turnstile.policy.cjs");
for (const action of [
  "signup",
  "login",
  "find-id",
  "password-reset",
  "magic-link",
  "admin-login",
]) {
  if (!guard.includes('"' + action + '"') && !guard.includes("'" + action + "'")) {
    fail("Turnstile guard missing action " + action);
  }
}
if (
  !guard.includes("admin-auth") ||
  guard.indexOf("admin-auth") > guard.indexOf('p.endsWith("/login")')
) {
  fail("admin-auth login action must be classified before generic /login");
}

const limiter = read("services/api-nest/auth-rate-limit.cjs");
if (!limiter.includes('"/auth/signup/classic"')) {
  fail("sensitive rate-limit must include /auth/signup/classic");
}

const refresh = read("apps/web/lib/session-refresh-fetch.ts");
if (!refresh.includes("BroadcastChannel")) fail("tab refresh BroadcastChannel fallback missing");
if (!refresh.includes("navigator") || !refresh.includes("locks")) {
  fail("tab refresh Web Locks path missing");
}
if (!refresh.includes("8000")) fail("refresh timeout missing");

const classicUi = read("apps/web/app/auth/signup/classic/ClassicSignupRuntime.tsx");
if (!classicUi.includes("TurnstileField") || !classicUi.includes('action="signup"')) {
  fail("classic signup missing Turnstile action=signup");
}
if (
  !classicUi.includes("termsVersion") ||
  !(classicUi.includes("CURRENT_TERMS_VERSION") || classicUi.includes(terms))
) {
  fail("classic signup must send current termsVersion");
}
if (!classicUi.includes("!turnstileReady") || !classicUi.includes("turnstileToken")) {
  fail("classic signup must fail-closed without Turnstile");
}

const findId = read("apps/web/app/auth/find-id/FindIdRuntime.tsx");
if (!findId.includes("TurnstileField") || !findId.includes('action="find-id"')) {
  fail("find-id missing Turnstile");
}

const resetUi = read("apps/web/app/auth/reset-password/ResetPasswordRuntime.tsx");
if (!resetUi.includes("TurnstileField") || !resetUi.includes('action="password-reset"')) {
  fail("password-reset request missing Turnstile");
}

const loginUi = read("packages/ui/components/auth/AuthLogin.tsx");
if (!loginUi.includes('action="login"') || !loginUi.includes('action="magic-link"')) {
  fail("login missing Turnstile actions");
}
if (!loginUi.includes("!turnstileReady || !classicToken")) {
  fail("classic login must fail-closed without Turnstile");
}

const signupUi = read("packages/ui/components/auth/AuthSignup.tsx");
if (!signupUi.includes("TurnstileField") || !signupUi.includes('action="magic-link"')) {
  fail("signup magic missing Turnstile");
}

const signupRt = read("apps/web/app/auth/signup/SignupRuntime.tsx");
if (!signupRt.includes("turnstileToken")) {
  fail("SignupRuntime must send turnstileToken with magic consent");
}

const sdkFetch = read("packages/sdk/src/auth/fetch.ts");
if (!sdkFetch.includes("turnstileToken: opts.turnstileToken")) {
  fail("requestMagicLink must send turnstileToken");
}

const sdkClassic = read("packages/sdk/src/auth/classic.ts");
if (!sdkClassic.includes("termsVersion") || !sdkClassic.includes("privacyVersion")) {
  fail("classic SDK must carry consent versions");
}
if (!sdkClassic.includes("turnstileToken")) {
  fail("classic SDK must carry turnstileToken");
}

const hostFiles = walk(path.join(root, "apps/web"), (name) => /\.(ts|tsx|js|cjs)$/.test(name))
  .concat(walk(path.join(root, "packages/ui/components/auth"), (name) => /\.(ts|tsx)$/.test(name)))
  .concat(walk(path.join(root, "packages/sdk/src/auth"), (name) => /\.(ts|tsx)$/.test(name)))
  .map((abs) => path.relative(root, abs).replace(/\\/g, "/"));

for (const rel of hostFiles) {
  const src = read(rel);
  if (src.includes("NEXT_PUBLIC_OAUTH_KAKAO_CLIENT_SECRET")) {
    fail("Kakao client secret must not appear in browser bundle source " + rel);
  }
}

const denyTypo = [
  "packages/ui/components/auth",
  "packages/sdk/src/auth",
  "apps/web/app/auth",
];
for (const dir of denyTypo) {
  const files = walk(path.join(root, dir), (name) => /\.(ts|tsx)$/.test(name));
  for (const abs of files) {
    const src = fs.readFileSync(abs, "utf8");
    if (src.includes("hitpk.app")) {
      fail("hitpk.app typo in consumer auth " + path.relative(root, abs));
    }
  }
}

const pkg = read("package.json");
if (!pkg.includes('"verify:s3-32-user-auth"')) {
  fail("package.json missing verify:s3-32-user-auth");
}
const domain = read("tooling/verify/domain-by-path.cjs");
if (!domain.includes("s3-32-user-auth.cjs")) {
  fail("domain-by-path must trigger s3-32-user-auth.cjs");
}

const selftest = spawnSync(
  process.execPath,
  ["services/api-nest/src/common/turnstile.selftest.cjs"],
  { cwd: root, encoding: "utf8", timeout: 20_000 },
);
process.stdout.write(selftest.stdout || "");
process.stderr.write(selftest.stderr || "");
if (selftest.status !== 0 || !(selftest.stdout || "").includes("[turnstile.selftest] PASS")) {
  fail("turnstile.selftest failed");
}

if (fails.length) {
  console.error("[verify:s3-32-user-auth] FAIL");
  for (const f of fails) console.error(" -", f);
  process.exit(1);
}
console.log(
  "[verify:s3-32-user-auth] PASS (C1-C3 code · LIVE_E2E=NOT_RUN · productionDbApply=0)",
);
