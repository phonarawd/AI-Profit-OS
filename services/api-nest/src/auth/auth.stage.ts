/**
 * Infra §51.9.1 Stage A/B field + gate SSOT (중복0)
 * UI forms / Money withdraw gate against these helpers — do not fork field lists.
 */

import {
  FORBIDDEN_USER_AUTH_FIELDS,
  STAGE_B_MIN_AGE_YEARS,
  type OnboardingStage,
} from "./auth.constants";

/** Stage A (즉시 가입) — required + optional */
export const STAGE_A_REQUIRED_FIELDS = [
  "termsAcceptedAt",
  "privacyAcceptedAt",
] as const;

export const STAGE_A_OPTIONAL_FIELDS = [
  "marketingConsent",
  "referralCode",
] as const;

/** Stage A identity — at least one auth method */
export const STAGE_A_IDENTITY_METHODS = [
  "oauth_kakao",
  "oauth_google",
  "passkey",
  "email_magic",
] as const;

/** Stage B (출금·KYC 전) */
export const STAGE_B_REQUIRED_FIELDS = [
  "displayName",
  "phoneE164",
  "birthDate",
] as const;

/** email required when OAuth/Passkey path did not supply one */
export const STAGE_B_EMAIL_WHEN_MISSING = "email" as const;

export const STAGE_B_DISPLAY_NAME = { min: 2, max: 40 } as const;
/** KR mobile E.164 — Nest validates; UI masks separately */
export const STAGE_B_PHONE_E164_PATTERN = /^\+[1-9][0-9]{7,14}$/;

export type StageASignupInput = {
  method: (typeof STAGE_A_IDENTITY_METHODS)[number];
  termsAcceptedAt: string;
  privacyAcceptedAt: string;
  marketingConsent?: boolean;
  referralCode?: string;
  /** email magic path */
  email?: string;
  oauth?: { provider: "kakao" | "google"; providerSubject: string; email?: string };
  passkey?: { credentialId: string };
};

export type StageBProfileInput = {
  displayName: string;
  phoneE164: string;
  birthDate: string;
  email?: string;
};

export type StageGateCapability =
  | "deposit"
  | "practice"
  | "participate"
  | "withdraw"
  | "kyc_submit";

/** §51.9 — Stage B incomplete blocks withdraw + KYC submit only */
const STAGE_GATES: Record<OnboardingStage, ReadonlySet<StageGateCapability>> = {
  A: new Set(["deposit", "practice", "participate"]),
  B_incomplete: new Set(["deposit", "practice", "participate"]),
  B_complete: new Set([
    "deposit",
    "practice",
    "participate",
    "withdraw",
    "kyc_submit",
  ]),
};

export function isCapabilityAllowed(
  stage: OnboardingStage,
  capability: StageGateCapability,
): boolean {
  return STAGE_GATES[stage].has(capability);
}

export function assertNoForbiddenAuthFields(
  body: Record<string, unknown>,
): string | null {
  for (const key of FORBIDDEN_USER_AUTH_FIELDS) {
    if (Object.prototype.hasOwnProperty.call(body, key) && body[key] != null) {
      return `forbidden field: ${key}`;
    }
  }
  return null;
}

export function validateStageA(input: StageASignupInput): string | null {
  if (!STAGE_A_IDENTITY_METHODS.includes(input.method)) {
    return "invalid Stage A identity method";
  }
  if (!input.termsAcceptedAt || !input.privacyAcceptedAt) {
    return "termsAcceptedAt and privacyAcceptedAt required";
  }
  if (input.method === "email_magic" && !input.email) {
    return "email required for email_magic";
  }
  if (
    (input.method === "oauth_kakao" || input.method === "oauth_google") &&
    !input.oauth?.providerSubject
  ) {
    return "oauth.providerSubject required";
  }
  if (input.method === "passkey" && !input.passkey?.credentialId) {
    return "passkey.credentialId required";
  }
  return null;
}

export function isAgeAtLeast(
  birthDateIso: string,
  minYears: number,
  now = new Date(),
): boolean {
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

export function validateStageB(
  input: StageBProfileInput,
  opts: { emailAlreadyKnown: boolean },
): string | null {
  const name = input.displayName?.trim() ?? "";
  if (
    name.length < STAGE_B_DISPLAY_NAME.min ||
    name.length > STAGE_B_DISPLAY_NAME.max
  ) {
    return `displayName must be ${STAGE_B_DISPLAY_NAME.min}~${STAGE_B_DISPLAY_NAME.max} chars`;
  }
  if (!STAGE_B_PHONE_E164_PATTERN.test(input.phoneE164 ?? "")) {
    return "phoneE164 must be E.164";
  }
  if (!isAgeAtLeast(input.birthDate, STAGE_B_MIN_AGE_YEARS)) {
    return `birthDate must be age ${STAGE_B_MIN_AGE_YEARS}+`;
  }
  if (!opts.emailAlreadyKnown) {
    if (!input.email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(input.email)) {
      return "email required when missing from Stage A identity";
    }
  }
  return null;
}

/** delete-account §51.9 guards (Money ledger owns balance truth) */
export type DeleteAccountGuardSnapshot = {
  lockedUsdt: number;
  pendingWithdrawCount: number;
  principalUsdt: number;
  profitUsdt: number;
  practiceUsdt: number;
};

export function evaluateDeleteAccountGuards(
  snap: DeleteAccountGuardSnapshot,
): { ok: true } | { ok: false; reason: string } {
  if (snap.lockedUsdt > 0) {
    return { ok: false, reason: "locked balance must be 0" };
  }
  if (snap.pendingWithdrawCount > 0) {
    return { ok: false, reason: "pending withdraw must be 0" };
  }
  const open =
    snap.principalUsdt + snap.profitUsdt + snap.practiceUsdt;
  if (open > 0) {
    return { ok: false, reason: "ledger balance must be 0 before delete" };
  }
  return { ok: true };
}
