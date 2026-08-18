/** Compliance API paths · UI Owns=Admin/Web · contracts Owns=Money §42 */

export const COMPLIANCE_USER_ROUTES = {
  kycStatus: "kyc/status",
  kycSubmit: "kyc/submit",
} as const;

export const COMPLIANCE_ADMIN_ROUTES = {
  kycQueue: "compliance/kyc",
  kycApprove: "compliance/kyc/:userId/approve",
  kycReject: "compliance/kyc/:userId/reject",
  kycDocUrl: "compliance/kyc/:userId/doc-url",
} as const;
