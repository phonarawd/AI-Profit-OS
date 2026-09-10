/**
 * Infra §51.9 Auth Flow SSOT · ADR-006
 * User Auth = Nest JWT only · Supabase Auth FORBIDDEN
 * Admin issuer MUST stay separate (§40)
 */

export const USER_JWT_ISSUER = "ai-profit-os-nest" as const;
export const ADMIN_JWT_ISSUER = "ai-profit-os-admin" as const;

/** P0-1 fix — access token TTL · sliding session via POST /auth/refresh */
export const ACCESS_TOKEN_TTL_SEC = 15 * 60;

/** PART9-pre2 — httpOnly 세션쿠키명 · JwtAuthGuard cookie fallback SSOT */
export const USER_SESSION_COOKIE_NAME = "aipo_session" as const;

/** OAuth start↔complete 브라우저 바인딩. 원문 token을 로그하지 않는다. */
export const OAUTH_BIND_COOKIE_NAME = "aipo_oauth_bind" as const;

/** Never accept admin issuer on /auth/* user routes */
export const USER_JWT_AUDIENCE = "peotteok-user" as const;
export const ADMIN_JWT_AUDIENCE = "aipo-ops" as const;

export const OAUTH_PROVIDERS = ["kakao", "google"] as const;
export type OauthProvider = (typeof OAUTH_PROVIDERS)[number];
/** Kakao is primary CTA on Canon auth-login / auth-signup */
export const OAUTH_PRIMARY: OauthProvider = "kakao";

export const AUTH_METHODS = [
  "oauth_kakao",
  "oauth_google",
  "passkey",
  "email_magic",
] as const;
export type AuthMethod = (typeof AUTH_METHODS)[number];

export const ONBOARDING_STAGES = ["A", "B_incomplete", "B_complete"] as const;
export type OnboardingStage = (typeof ONBOARDING_STAGES)[number];

/** §51.9.1 — Stage A / KYC 금지. 프로필 gender는 PROFILE_GENDER_VALUES만. */
export const FORBIDDEN_USER_AUTH_FIELDS = [
  "rrnFull",
  "rrn",
  "gender",
  "addressRequired",
  "residentRegistrationNumber",
] as const;

/** 고객 웹 GenderSelect 실제 선택값 */
export const PROFILE_GENDER_VALUES = ["male", "female"] as const;
export type ProfileGender = (typeof PROFILE_GENDER_VALUES)[number];

export function parseProfileGender(
  raw: unknown,
): { ok: true; value?: ProfileGender } | { ok: false; error: string } {
  if (raw === undefined) return { ok: true };
  if (typeof raw === "string" && (PROFILE_GENDER_VALUES as readonly string[]).includes(raw)) {
    return { ok: true, value: raw as ProfileGender };
  }
  return { ok: false, error: "gender must be male|female" };
}

/** Minimum age for Stage B birthDate (만 19세+) */
export const STAGE_B_MIN_AGE_YEARS = 19;

/** delete-account confirm×2 phrase (Korean UI copy SSOT lives in packages/ui) */
export const DELETE_ACCOUNT_CONFIRM_PHRASE = "탈퇴하겠습니다" as const;
