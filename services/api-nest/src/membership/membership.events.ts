/** Phase0 in-process · NATS subject names identical at Phase1+ */

export const MEMBERSHIP_EVENTS = {
  force: "admin.user.membership.force",
  matchPolicyUpdated: "admin.user.match_policy.updated",
} as const;
