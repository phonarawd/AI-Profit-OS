/**
 * Money §42 — KYC withdraw one-time gate (pure helpers).
 * participate / deposit / practice — NO kyc check.
 * withdraw — approved only · else KYC_WITHDRAW_REQUIRED.
 */

import type { KycStatus } from "./compliance.types";

export const KYC_WITHDRAW_REQUIRED = "KYC_WITHDRAW_REQUIRED" as const;

/**
 * §42 — participate never requires KYC.
 * HTTP shape for verify:kyc-withdraw-only (200 without kyc).
 */
export function participateGate(_kycStatus: KycStatus): {
  ok: true;
  status: 200;
  kycRequired: false;
} {
  // NO kyc check — deposit/participate/practice allowed regardless of KYC
  return { ok: true, status: 200, kycRequired: false };
}

/**
 * §42 — withdraw requires kycStatus=approved.
 * Returns null when allowed; otherwise problem code for 403.
 */
export function assertWithdrawKyc(kycStatus: KycStatus): null | typeof KYC_WITHDRAW_REQUIRED {
  if (kycStatus !== "approved") return KYC_WITHDRAW_REQUIRED;
  return null;
}

/** True when UI should auto-redirect to /me/kyc (none|rejected). */
export function shouldRedirectToKyc(kycStatus: KycStatus): boolean {
  return kycStatus === "none" || kycStatus === "rejected";
}

/** True when withdraw form is hidden (pending review). */
export function isKycPending(kycStatus: KycStatus): boolean {
  return kycStatus === "pending";
}
