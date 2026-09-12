/**
 * 클래식(아이디·비밀번호) 가입 필드 정책 — 유저웹 classic.ts 계약.
 * username/password 규칙 SSOT. 다른 파일에서 재선언하지 않음.
 */

import { isValidEmail } from "./identity-proof.email";

export const USERNAME_MIN_LEN = 4;
export const USERNAME_MAX_LEN = 20;
/** 첫 글자 소문자 · 나머지 a-z 0-9 _ */
export const USERNAME_PATTERN = /^[a-z][a-z0-9_]{3,19}$/;

/** 유저웹 폼 최소 길이(1f773e92) · 15자에서 8자로 맞춤 */
export const PASSWORD_MIN_LEN = 8;
export const PASSWORD_MAX_LEN = 128;

export const DECLARED_NAME_MIN_LEN = 1;
export const DECLARED_NAME_MAX_LEN = 60;

/** 만 19세+ — Stage B와 동일 */
export const CLASSIC_SIGNUP_MIN_AGE_YEARS = 19;

export const RESERVED_USERNAMES: ReadonlySet<string> = new Set([
  "admin",
  "administrator",
  "root",
  "system",
  "superuser",
  "super",
  "moderator",
  "staff",
  "support",
  "help",
  "helpdesk",
  "operator",
  "operators",
  "owner",
  "webmaster",
  "postmaster",
  "security",
  "abuse",
  "null",
  "undefined",
  "none",
  "anonymous",
  "guest",
  "test",
  "testuser",
  "bot",
  "official",
  "putduk",
  "puttuk",
  "peotteok",
  "aiprofitos",
  "ai-profit-os",
  "aiprofit",
  "todaysprofit",
  "barobenda",
  "hiptk",
  "api",
  "www",
  "app",
  "web",
  "cdn",
  "static",
  "assets",
  "ops",
  "internal",
  "auth",
  "signup",
  "login",
  "logout",
  "wallet",
  "trades",
  "profits",
  "me",
  "onboarding",
  "ads",
  "l",
  "dev",
  "health",
]);

export type ClassicSignupFieldError =
  | "USERNAME_INVALID_FORMAT"
  | "USERNAME_RESERVED"
  | "PASSWORD_TOO_SHORT"
  | "PASSWORD_TOO_LONG"
  | "PASSWORD_CONFIRM_MISMATCH"
  | "DECLARED_NAME_INVALID"
  | "BIRTH_DATE_INVALID"
  | "BIRTH_DATE_TOO_YOUNG"
  | "TERMS_REQUIRED"
  | "EMAIL_INVALID"
  | "CONSENT_VERSION_STALE";

export function usernameCanonical(raw: string): string {
  return typeof raw === "string" ? raw.trim().toLowerCase() : "";
}

export function isValidUsernameFormat(raw: string): boolean {
  if (typeof raw !== "string") return false;
  return USERNAME_PATTERN.test(raw);
}

export function isReservedUsername(raw: string): boolean {
  return RESERVED_USERNAMES.has(usernameCanonical(raw));
}

export function isValidPasswordLength(raw: string): boolean {
  if (typeof raw !== "string") return false;
  const codePointLen = Array.from(raw).length;
  return codePointLen >= PASSWORD_MIN_LEN && codePointLen <= PASSWORD_MAX_LEN;
}

/** 소문자만. Gmail dot/plus 정규화 금지. */
export function emailCanonical(raw: string): string {
  return typeof raw === "string" ? raw.trim().toLowerCase() : "";
}

export type ClassicSignupInput = {
  username: string;
  email: string;
  password: string;
  passwordConfirm: string;
  declaredName: string;
  birthDate: string;
  phoneE164?: string;
  termsAcceptedAt: string;
  privacyAcceptedAt: string;
  marketingConsent?: boolean;
  referralCode?: string;
  turnstileToken?: string;
  termsVersion?: string;
  privacyVersion?: string;
};

function isAgeAtLeast(birthDateIso: string, minYears: number, now = new Date()): boolean {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(birthDateIso);
  if (!m) return false;
  const y = Number(m[1]);
  const mo = Number(m[2]);
  const d = Number(m[3]);
  const birth = new Date(Date.UTC(y, mo - 1, d));
  if (Number.isNaN(birth.getTime())) return false;
  const cutoff = new Date(
    Date.UTC(now.getUTCFullYear() - minYears, now.getUTCMonth(), now.getUTCDate()),
  );
  return birth.getTime() <= cutoff.getTime();
}

export function validateClassicSignupFields(
  input: ClassicSignupInput,
): ClassicSignupFieldError | null {
  if (!isValidUsernameFormat(input.username)) return "USERNAME_INVALID_FORMAT";
  if (isReservedUsername(input.username)) return "USERNAME_RESERVED";
  if (!isValidPasswordLength(input.password)) {
    return Array.from(input.password || "").length < PASSWORD_MIN_LEN
      ? "PASSWORD_TOO_SHORT"
      : "PASSWORD_TOO_LONG";
  }
  if (input.password !== input.passwordConfirm) return "PASSWORD_CONFIRM_MISMATCH";
  const name = (input.declaredName ?? "").trim();
  if (name.length < DECLARED_NAME_MIN_LEN || name.length > DECLARED_NAME_MAX_LEN) {
    return "DECLARED_NAME_INVALID";
  }
  if (!/^\d{4}-\d{2}-\d{2}$/.test(input.birthDate ?? "")) return "BIRTH_DATE_INVALID";
  if (!isAgeAtLeast(input.birthDate, CLASSIC_SIGNUP_MIN_AGE_YEARS)) {
    return "BIRTH_DATE_TOO_YOUNG";
  }
  if (!input.termsAcceptedAt || !input.privacyAcceptedAt) return "TERMS_REQUIRED";
  if (!isValidEmail(input.email)) return "EMAIL_INVALID";
  return null;
}
