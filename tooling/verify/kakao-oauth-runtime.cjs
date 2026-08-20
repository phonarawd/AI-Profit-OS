#!/usr/bin/env node
/**
 * verify:kakao-oauth-runtime — C-AUTH-001
 * Kakao code→token→profile(scope profile_nickname) · GET callback · 성별0
 * Mock HTTP E2E against kakao-oauth.core.cjs (실 Kakao 계정 불필요).
 */
"use strict";

const fs = require("node:fs");
const path = require("node:path");

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

const CORE_REL = "services/api-nest/kakao-oauth.core.cjs";
const required = [
  CORE_REL,
  "services/api-nest/src/auth/auth.service.ts",
  "services/api-nest/src/auth/auth.controller.ts",
  "services/api-nest/src/auth/auth.routes.ts",
  "apps/web/app/auth/oauth/kakao/page.tsx",
];
for (const f of required) {
  if (!fs.existsSync(path.join(root, f))) fail(`missing: ${f}`);
}

const svc = read("services/api-nest/src/auth/auth.service.ts");
const ctrl = read("services/api-nest/src/auth/auth.controller.ts");
const routes = read("services/api-nest/src/auth/auth.routes.ts");
const page = read("apps/web/app/auth/oauth/kakao/page.tsx");
const coreSrc = read(CORE_REL);

for (const needle of [
  "kakao-oauth.core.cjs",
  "exchangeKakaoCode",
  "completeKakaoCode",
  "oauthBrowserCallback",
  "raw_profile",
  "TERMS_REQUIRED",
  "kakao oauth code required",
]) {
  if (!svc.includes(needle)) fail(`auth.service.ts missing: ${needle}`);
}
if (svc.includes("body.providerSubject ?? body.code")) {
  fail("auth.service.ts must not treat Kakao authorization code as providerSubject");
}

for (const needle of [
  "@Get(AUTH_ROUTES.oauthCallback)",
  "@Get(AUTH_ROUTES.oauthStart)",
  "oauthCallbackGet",
  "oauthBrowserCallback",
  "attachUserSessionCookie",
  "res.redirect(302",
]) {
  if (!ctrl.includes(needle)) fail(`auth.controller.ts missing: ${needle}`);
}

for (const p of [
  "GET /api/v1/auth/oauth/:provider/callback",
  "POST /api/v1/auth/oauth/:provider/callback",
  "GET /api/v1/auth/oauth/:provider/start",
]) {
  if (!routes.includes(p)) fail(`AUTH_HTTP_PATHS missing ${p}`);
}

if (!page.includes('redirect("/api/v1/auth/oauth/kakao/start")')) {
  fail("kakao thin page must redirect to Nest GET start");
}

for (const needle of [
  "kauth.kakao.com/oauth/token",
  "kapi.kakao.com/v2/user/me",
  "profile_nickname",
  "sanitizeKakaoProfile",
]) {
  if (!coreSrc.includes(needle)) fail(`${CORE_REL} missing: ${needle}`);
}

const core = require(path.join(root, CORE_REL));
const SECRET = "kakao_oauth_runtime_secret_min_32_chars!!";

try {
  const cleaned = core.sanitizeKakaoProfile({
    id: 123456789,
    kakao_account: {
      profile: { nickname: "닉네임" },
      email: "a@b.c",
      gender: "male",
      gender_needs_agreement: false,
    },
  });
  if (cleaned.providerSubject !== "123456789") {
    fail("sanitizeKakaoProfile must use kakao id as providerSubject");
  }
  const dumped = JSON.stringify(cleaned.rawProfile);
  if (dumped.includes("gender")) {
    fail("sanitizeKakaoProfile must strip gender fields from raw_profile");
  }
  if (cleaned.nickname !== "닉네임") {
    fail("sanitizeKakaoProfile must keep nickname");
  }
} catch (e) {
  fail(`sanitizeKakaoProfile threw: ${e instanceof Error ? e.message : e}`);
}

try {
  core.sanitizeKakaoProfile({ kakao_account: { profile: { nickname: "x" } } });
  fail("sanitizeKakaoProfile must reject missing id");
} catch {
  /* expected */
}

const authorize = core.buildAuthorizeUrl({
  clientId: "rest-key",
  redirectUri: "http://localhost:4000/api/v1/auth/oauth/kakao/callback",
  state: "state-1",
});
if (!authorize.startsWith("https://kauth.kakao.com/oauth/authorize")) {
  fail("buildAuthorizeUrl host must be kauth.kakao.com");
}
if (!authorize.includes("scope=profile_nickname")) {
  fail("buildAuthorizeUrl must set scope=profile_nickname");
}
if (authorize.includes("gender")) {
  fail("buildAuthorizeUrl must not request gender scope");
}

const redirectUri = core.kakaoRedirectUri("localhost:4000");
if (redirectUri !== "http://localhost:4000/api/v1/auth/oauth/kakao/callback") {
  fail(`kakaoRedirectUri mismatch: ${redirectUri}`);
}

const state = core.signOauthState(
  {
    termsAcceptedAt: "2026-08-20T00:00:00.000Z",
    privacyAcceptedAt: "2026-08-20T00:00:00.000Z",
    marketingConsent: false,
  },
  SECRET,
);
const verified = core.verifyOauthState(state, SECRET);
if (verified.termsAcceptedAt !== "2026-08-20T00:00:00.000Z") {
  fail("oauth state terms round-trip failed");
}
try {
  const tampered = `${state.slice(0, -2)}${state.slice(-2) === "AA" ? "BB" : "AA"}`;
  core.verifyOauthState(tampered, SECRET);
  fail("tampered oauth state must throw");
} catch {
  /* expected */
}

async function mockExchange() {
  const calls = [];
  async function fetchImpl(url, opts) {
    const href = String(url);
    calls.push({ href, method: opts?.method, headers: opts?.headers, body: opts?.body });
    if (href.includes("/oauth/token")) {
      return {
        ok: true,
        status: 200,
        json: async () => ({ access_token: "kakao-access" }),
      };
    }
    if (href.includes("/v2/user/me")) {
      return {
        ok: true,
        status: 200,
        json: async () => ({
          id: 999001,
          kakao_account: {
            profile: { nickname: "퍼뜩유저" },
            gender: "female",
          },
        }),
      };
    }
    throw new Error(`unexpected fetch ${href}`);
  }
  const out = await core.exchangeKakaoCode({
    code: "auth-code-1",
    redirectUri,
    clientId: "rest-key",
    clientSecret: "rest-secret",
    fetchImpl,
  });
  if (out.providerSubject !== "999001") {
    fail("exchangeKakaoCode must use Kakao id, not the authorization code");
  }
  if (JSON.stringify(out.rawProfile).includes("gender")) {
    fail("exchangeKakaoCode rawProfile must strip gender");
  }
  if (calls.length !== 2) fail(`exchangeKakaoCode expected 2 HTTP calls, got ${calls.length}`);
  if (!calls[0]?.href.includes("https://kauth.kakao.com/oauth/token")) {
    fail("first exchange call must be Kakao token endpoint");
  }
  if (!String(calls[0]?.body || "").includes("grant_type=authorization_code")) {
    fail("token exchange must send authorization_code grant");
  }
  if (!String(calls[0]?.body || "").includes("code=auth-code-1")) {
    fail("token exchange must send the authorization code");
  }
  if (!calls[1]?.href.includes("https://kapi.kakao.com/v2/user/me")) {
    fail("second exchange call must be Kakao profile endpoint");
  }
  if (calls[1]?.headers?.Authorization !== "Bearer kakao-access") {
    fail("profile call must use Bearer access_token");
  }
}

const pkg = JSON.parse(read("package.json") || "{}");
if (pkg.scripts?.["verify:kakao-oauth-runtime"] !== "node tooling/verify/kakao-oauth-runtime.cjs") {
  fail("package.json missing verify:kakao-oauth-runtime");
}
const catalog = read("tooling/verify/CATALOG.md");
if (catalog && !catalog.includes("kakao-oauth-runtime")) {
  fail("CATALOG.md must list kakao-oauth-runtime");
}

mockExchange()
  .then(() => {
    if (fails.length) {
      console.error("[verify:kakao-oauth-runtime] FAIL\n- " + fails.join("\n- "));
      process.exit(1);
    }
    console.log(
      "[verify:kakao-oauth-runtime] PASS (code→token→profile · GET callback · gender0 · thin /auth/oauth/kakao)",
    );
  })
  .catch((e) => {
    fail(`exchange mock failed: ${e instanceof Error ? e.message : e}`);
    console.error("[verify:kakao-oauth-runtime] FAIL\n- " + fails.join("\n- "));
    process.exit(1);
  });
