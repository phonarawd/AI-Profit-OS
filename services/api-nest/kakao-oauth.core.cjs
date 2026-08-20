/**
 * Kakao Login (user OAuth) — Infra §51.9 · Track C C-AUTH-001
 * code → token → profile(scope profile_nickname) · 성별 필드 저장 0
 * jwt.core.cjs와 같이 src 밖에 두어 dist/src 양쪽에서 같은 상대경로로 resolve.
 *
 * Ads/Kakao Business Auth secret과 혼동 금지.
 */
"use strict";

const { sign, verify } = require("./jwt.core.cjs");

const KAKAO_AUTHORIZE = "https://kauth.kakao.com/oauth/authorize";
const KAKAO_TOKEN = "https://kauth.kakao.com/oauth/token";
const KAKAO_ME = "https://kapi.kakao.com/v2/user/me";
const KAKAO_SCOPE = "profile_nickname";
const OAUTH_STATE_TYP = "oauth_state";
const OAUTH_STATE_AUD = "peotteok-oauth-state";
const USER_JWT_ISSUER = "ai-profit-os-nest";
const STATE_TTL_SEC = 600;

const GENDER_KEYS = new Set([
  "gender",
  "gender_needs_agreement",
  "gender_type",
  "is_default_gender",
]);

function originFromHost(host) {
  if (typeof host !== "string" || !host.trim()) {
    throw new Error("host required");
  }
  const h = host.trim().replace(/\/$/, "");
  if (h.startsWith("http://") || h.startsWith("https://")) return h;
  return h.includes("localhost") || h.startsWith("127.")
    ? `http://${h}`
    : `https://${h}`;
}

function kakaoRedirectUri(apiHost) {
  return `${originFromHost(apiHost)}/api/v1/auth/oauth/kakao/callback`;
}

function appOrigin(appHost) {
  return originFromHost(appHost);
}

function continuePathAfterOauth(onboardingStage) {
  return onboardingStage === "B_complete"
    ? "/"
    : "/auth/complete-profile";
}

function buildAuthorizeUrl(opts) {
  const clientId = opts?.clientId;
  const redirectUri = opts?.redirectUri;
  const state = opts?.state;
  if (!clientId || !redirectUri || !state) {
    throw new Error("clientId, redirectUri, state required");
  }
  const u = new URL(KAKAO_AUTHORIZE);
  u.searchParams.set("client_id", clientId);
  u.searchParams.set("redirect_uri", redirectUri);
  u.searchParams.set("response_type", "code");
  u.searchParams.set("scope", KAKAO_SCOPE);
  u.searchParams.set("state", state);
  return u.toString();
}

function stripGenderDeep(value) {
  if (Array.isArray(value)) return value.map(stripGenderDeep);
  if (value && typeof value === "object") {
    const out = {};
    for (const [k, v] of Object.entries(value)) {
      if (GENDER_KEYS.has(k)) continue;
      out[k] = stripGenderDeep(v);
    }
    return out;
  }
  return value;
}

function sanitizeKakaoProfile(raw) {
  if (!raw || typeof raw !== "object") {
    throw new Error("kakao profile missing");
  }
  const id = raw.id;
  if (id == null || String(id).trim() === "") {
    throw new Error("kakao profile id missing");
  }
  const cleaned = stripGenderDeep(raw);
  const account =
    cleaned.kakao_account && typeof cleaned.kakao_account === "object"
      ? cleaned.kakao_account
      : {};
  const profile =
    account.profile && typeof account.profile === "object" ? account.profile : {};
  const nickname =
    typeof profile.nickname === "string" ? profile.nickname : undefined;
  const email = typeof account.email === "string" ? account.email : undefined;
  return {
    providerSubject: String(id),
    nickname,
    email,
    rawProfile: cleaned,
  };
}

function signOauthState(payload, secret, opts) {
  if (!payload || typeof payload !== "object") {
    throw new Error("oauth state payload required");
  }
  return sign(
    {
      sub: OAUTH_STATE_TYP,
      typ: OAUTH_STATE_TYP,
      termsAcceptedAt:
        typeof payload.termsAcceptedAt === "string"
          ? payload.termsAcceptedAt
          : "",
      privacyAcceptedAt:
        typeof payload.privacyAcceptedAt === "string"
          ? payload.privacyAcceptedAt
          : "",
      marketingConsent: payload.marketingConsent === true,
      referralCode:
        typeof payload.referralCode === "string" ? payload.referralCode : "",
    },
    secret,
    {
      issuer: USER_JWT_ISSUER,
      audience: OAUTH_STATE_AUD,
      expiresInSec: opts?.expiresInSec ?? STATE_TTL_SEC,
      nowMs: opts?.nowMs,
    },
  );
}

function verifyOauthState(state, secret, opts) {
  const payload = verify(state, secret, {
    issuer: USER_JWT_ISSUER,
    audience: OAUTH_STATE_AUD,
    nowMs: opts?.nowMs,
  });
  if (payload.typ !== OAUTH_STATE_TYP) {
    throw new Error("invalid oauth state typ");
  }
  return {
    termsAcceptedAt:
      typeof payload.termsAcceptedAt === "string" ? payload.termsAcceptedAt : "",
    privacyAcceptedAt:
      typeof payload.privacyAcceptedAt === "string"
        ? payload.privacyAcceptedAt
        : "",
    marketingConsent: payload.marketingConsent === true,
    referralCode:
      typeof payload.referralCode === "string" ? payload.referralCode : "",
  };
}

async function readJsonResponse(res, label) {
  let body = {};
  try {
    body = await res.json();
  } catch {
    body = {};
  }
  if (!res.ok) {
    const err = new Error(`${label} failed`);
    err.status = res.status;
    throw err;
  }
  return body;
}

async function exchangeKakaoCode(opts) {
  const code = opts?.code;
  const redirectUri = opts?.redirectUri;
  const clientId = opts?.clientId;
  const clientSecret = opts?.clientSecret;
  const fetchImpl = opts?.fetchImpl ?? globalThis.fetch;
  if (!code || !redirectUri || !clientId || !clientSecret) {
    throw new Error("kakao code exchange requires code, redirectUri, clientId, clientSecret");
  }
  if (typeof fetchImpl !== "function") {
    throw new Error("fetchImpl required");
  }

  const tokenRes = await fetchImpl(KAKAO_TOKEN, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "authorization_code",
      client_id: clientId,
      client_secret: clientSecret,
      redirect_uri: redirectUri,
      code: String(code),
    }).toString(),
  });
  const tokenBody = await readJsonResponse(tokenRes, "kakao token");
  const accessToken = tokenBody.access_token;
  if (typeof accessToken !== "string" || !accessToken) {
    throw new Error("kakao access_token missing");
  }

  const meUrl = new URL(KAKAO_ME);
  meUrl.searchParams.set(
    "property_keys",
    JSON.stringify(["kakao_account.profile"]),
  );
  const meRes = await fetchImpl(meUrl.toString(), {
    method: "GET",
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  const meBody = await readJsonResponse(meRes, "kakao profile");
  return sanitizeKakaoProfile(meBody);
}

module.exports = {
  KAKAO_AUTHORIZE,
  KAKAO_TOKEN,
  KAKAO_ME,
  KAKAO_SCOPE,
  OAUTH_STATE_AUD,
  STATE_TTL_SEC,
  originFromHost,
  kakaoRedirectUri,
  appOrigin,
  continuePathAfterOauth,
  buildAuthorizeUrl,
  sanitizeKakaoProfile,
  stripGenderDeep,
  signOauthState,
  verifyOauthState,
  exchangeKakaoCode,
};
