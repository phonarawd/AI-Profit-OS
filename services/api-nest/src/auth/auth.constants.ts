/**
 * Infra §51.9 Auth Flow SSOT · ADR-006
 * User Auth = Nest JWT only · Supabase Auth FORBIDDEN
 * Admin issuer MUST stay separate (§40)
 */

export const USER_JWT_ISSUER = "ai-profit-os-nest" as const;
export const ADMIN_JWT_ISSUER = "ai-profit-os-admin" as const;

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

/** §51.9.1 — fields banned on user auth forms forever */
export const FORBIDDEN_USER_AUTH_FIELDS = [
  "rrnFull",
  "rrn",
  "gender",
  "addressRequired",
  "residentRegistrationNumber",
] as const;

/** Minimum age for Stage B birthDate (만 19세+) */
export const STAGE_B_MIN_AGE_YEARS = 19;

/** delete-account confirm×2 phrase (Korean UI copy SSOT lives in packages/ui) */
export const DELETE_ACCOUNT_CONFIRM_PHRASE = "탈퇴하겠습니다" as const;
