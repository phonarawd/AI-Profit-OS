/** Money §42 — KYC withdraw one-time gate contracts */

export type KycStatus = "none" | "pending" | "approved" | "rejected";

export type KycIdDocType = "kr_id" | "driver" | "passport";

/** Reject reason min length (§42.3) */
export const KYC_REJECT_REASON_MIN = 10;

/** Admin R2 signed URL TTL ≤5m (§42.2.1) */
export const KYC_SIGNED_URL_TTL_SEC = 300;

/** Retention after account close — default years (settings key) */
export const KYC_RETENTION_YEARS_DEFAULT = 5;

export const KYC_ID_DOC_TYPES: readonly KycIdDocType[] = [
  "kr_id",
  "driver",
  "passport",
] as const;

export type KycStatusV1 = {
  userId: string;
  kycStatus: KycStatus;
  submissionId?: string;
  decidedAt?: string;
  rejectReason?: string;
};

export type KycSubmissionV1 = {
  submissionId: string;
  userId: string;
  legalName: string;
  phoneE164: string;
  birthDate: string;
  idDocType: KycIdDocType;
  idDocR2Key: string;
  selfieR2Key?: string;
  status: KycStatus;
  rejectReason?: string;
  createdAt: string;
  decidedAt?: string;
};

export type KycDecideResult = {
  ok: true;
  decision: "approved" | "rejected";
  status: KycStatusV1;
  toastCode: "KYC_APPROVED" | "KYC_REJECTED";
};

export type KycDocSignedUrl = {
  userId: string;
  submissionId: string;
  r2Key: string;
  signedUrl: string;
  expiresInSec: number;
  /** never expose public bucket URL */
  publicAccess: false;
};
