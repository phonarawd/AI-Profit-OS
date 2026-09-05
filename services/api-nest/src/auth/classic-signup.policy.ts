/**
 * Classic (username/password) signup field policy — Infra §51.9.1.
 * Founder-locked product policy (PUTDUK S1F directive §5), not invented here:
 *
 *   username: 4~20 chars, lowercase ascii letters + digits + underscore only,
 *             first char must be a lowercase letter, canonical = itself
 *             (charset already excludes uppercase — canonicalization is a
 *             defense-in-depth second layer, never the only guard).
 *   password: 15~128 chars, NO composition rules (no forced upper/digit/
 *             symbol), unicode + whitespace allowed, paste/autofill allowed
 *             (enforced by NOT doing anything that blocks paste — there is
 *             no client-side restriction here), breached passwords blocked
 *             separately (pwned-password.service.ts), no periodic forced
 *             rotation (this module never expires a password by age).
 *
 * NIST SP 800-63B §5.1.1.2 / OWASP Authentication Cheat Sheet (2026) both
 * agree: minimum length + breach-corpus check + unicode support > forced
 * composition rules. This file is the single SSOT for both the Nest
 * validator and (via the same shape) any future duplicate-avoidance check —
 * do not re-declare these bounds elsewhere.
 */

export const USERNAME_MIN_LEN = 4;
export const USERNAME_MAX_LEN = 20;
/** First char must be a lowercase letter; remaining chars a-z 0-9 _. */
export const USERNAME_PATTERN = /^[a-z][a-z0-9_]{3,19}$/;

export const PASSWORD_MIN_LEN = 15;
export const PASSWORD_MAX_LEN = 128;

export const DECLARED_NAME_MIN_LEN = 1;
export const DECLARED_NAME_MAX_LEN = 60;

/** 만 19세+ — Stage B와 동일 기준(§51.9.1 STAGE_B_MIN_AGE_YEARS). */
export const CLASSIC_SIGNUP_MIN_AGE_YEARS = 19;

/**
 * Reserved usernames — admin/system/brand/route-collision. Lowercase only
 * (matches USERNAME_PATTERN's own charset restriction). Extend, never shrink
 * without a documented reason: removing an entry can let a real account
 * later collide with a future system/brand/route name.
 */
export const RESERVED_USERNAMES: ReadonlySet<string> = new Set([
  // system / role words
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
  // brand / legal (ADR-002 — 퍼뜩/PUTDUK/AI Profit OS 및 폐기 브랜드)
  "putduk",
  "puttuk",
  "peotteok",
  "aiprofitos",
  "ai-profit-os",
  "aiprofit",
  "todaysprofit",
  "barobenda",
  "hiptk",
  // api / infra words
  "api",
  "www",
  "app",
  "web",
  "cdn",
  "static",
  "assets",
  "ops",
  "internal",
  // top-level app route segments (apps/web/app/*) — prevents any future
  // `/u/:username`-style profile URL from colliding with a real route
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
  | "EMAIL_INVALID";

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
  // Length in Unicode code points, not UTF-16 code units — a password made
  // of astral-plane characters (surrogate pairs) must not be undercounted
  // or overcounted relative to what the user perceives as "characters".
  const codePointLen = Array.from(raw).length;
  return codePointLen >= PASSWORD_MIN_LEN && codePointLen <= PASSWORD_MAX_LEN;
}

/** `email_canonical` — lowercase only. Deliberately NOT gmail-dot/plus
 * stripping (Founder decision — provider-specific canonicalization forbidden). */
export function emailCanonical(raw: string): string {
  return typeof raw === "string" ? raw.trim().toLowerCase() : "";
}

export type ClassicSignupInput = {
  username: string;
  email: string;
  password: string;
  passwordConfirm: string;
  declaredName: string;
  birthDate: string; // YYYY-MM-DD
  phoneE164?: string;
  termsAcceptedAt: string;
  privacyAcceptedAt: string;
  marketingConsent?: boolean;
  referralCode?: string;
  turnstileToken?: string;
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

/** Pure structural validation only — uniqueness/HIBP/Turnstile are separate,
 * async, service-layer concerns (kept out of this pure function on purpose). */
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
  return null;
}
