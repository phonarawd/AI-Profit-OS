/**
 * Money §43.6 — withdraw step-up policy Owns (SSOT).
 * PWA §23.6 = browser/RP/@simplewebauthn UX only · OTP/PIN/recovery policy redefinition FORBIDDEN.
 */

export const WITHDRAW_STEP_UP_TTL_SEC = 60;

/** Ordered fallbacks — WebAuthn primary · non-WebAuthn fallback REQUIRED */
export const WITHDRAW_STEP_UP_PRIORITY = [
  "webauthn",
  "email_otp",
  "pin",
  "recovery",
] as const;

export type WithdrawStepUpMethod = (typeof WITHDRAW_STEP_UP_PRIORITY)[number];

/** Day-1 SMTP SSOT = Resend free tier (SMS OTP = L2 optional) */
export const WITHDRAW_EMAIL_PROVIDER = "resend" as const;

export const WITHDRAW_STEP_UP_CODES = {
  STEP_UP_REQUIRED: "WITHDRAW_STEP_UP_REQUIRED",
  PIN_REQUIRED: "PIN_REQUIRED",
  PIN_LOCKED: "PIN_LOCKED",
  CHALLENGE_EXPIRED: "STEP_UP_CHALLENGE_EXPIRED",
  ORIGIN_REJECTED: "STEP_UP_ORIGIN_REJECTED",
  WEBAUTHN_REVOKED: "WEBAUTHN_REVOKED",
  WEBAUTHN_STEP_UP_NOT_READY: "WEBAUTHN_STEP_UP_NOT_READY",
  EMAIL_STEP_UP_VERIFICATION_REQUIRED: "EMAIL_STEP_UP_VERIFICATION_REQUIRED",
  PIN_ENROLLMENT_STEP_UP_REQUIRED: "PIN_ENROLLMENT_STEP_UP_REQUIRED",
  STEP_UP_TOKEN_EXPIRED: "STEP_UP_TOKEN_EXPIRED",
  STEP_UP_TOKEN_REPLAYED: "STEP_UP_TOKEN_REPLAYED",
} as const;

export const ADMIN_CREDENTIAL_AUDIT = {
  pinReset: "admin.user.withdraw_pin.reset",
  webauthnRevoke: "admin.user.webauthn.revoke",
} as const;

/** Normalize APP_HOST → origin allowlist entry (host[:port], no scheme) */
export function normalizeAppHost(appHost: string): string {
  const raw = (appHost || "").trim().toLowerCase();
  if (!raw) return "";
  try {
    if (raw.includes("://")) {
      const u = new URL(raw);
      return u.host;
    }
  } catch {
    /* fall through */
  }
  return raw.replace(/^https?:\/\//, "").replace(/\/.*$/, "");
}

export function originAllowed(
  requestOrigin: string,
  appHost: string,
): boolean {
  const allowed = normalizeAppHost(appHost);
  if (!allowed) return false;
  const got = normalizeAppHost(requestOrigin);
  return got === allowed;
}

export function nextFallbackAfter(
  method: WithdrawStepUpMethod,
): WithdrawStepUpMethod | null {
  const i = WITHDRAW_STEP_UP_PRIORITY.indexOf(method);
  if (i < 0 || i >= WITHDRAW_STEP_UP_PRIORITY.length - 1) return null;
  return WITHDRAW_STEP_UP_PRIORITY[i + 1]!;
}

/** Pure: wipe leaves PIN path requiring re-register */
export function pinStateAfterAdminWipe(): {
  mustReset: true;
  pinHash: null;
  toastCode: "WITHDRAW_PIN_RESET";
  nextWithdrawCode: "PIN_REQUIRED";
} {
  return {
    mustReset: true,
    pinHash: null,
    toastCode: "WITHDRAW_PIN_RESET",
    nextWithdrawCode: "PIN_REQUIRED",
  };
}
