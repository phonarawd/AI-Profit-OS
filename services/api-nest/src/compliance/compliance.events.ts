/** Phase0 in-process · NATS subject names identical at Phase1+ */

export const COMPLIANCE_EVENTS = {
  kycSubmitted: "compliance.kyc.submitted",
  kycApproved: "compliance.kyc.approved",
  kycRejected: "compliance.kyc.rejected",
} as const;
