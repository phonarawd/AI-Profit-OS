/** Engine §0.0.7 / Admin §9.8.10 contracts */

export type MembershipId = "sprout" | "entry" | "core" | "high" | "vip";

export type MatchStrictness =
  | "lenient"
  | "standard"
  | "tight"
  | "scarce"
  | "custom";

export type CapitalBand = "micro" | "small" | "mid" | "high" | "whale";

export type UserMembershipV1 = {
  userId: string;
  membership: MembershipId;
  maxCapitalBand: CapitalBand;
  dailyUserMatchCap: number;
  matchStrictness: MatchStrictness;
  adminForce?: boolean;
  aiPerkFlags?: string[];
  fulfillRate7d?: number | null;
  dailyMatchesUsed: number;
  updatedAt?: string;
};

export type ForceMembershipRequest = {
  membership: MembershipId;
  reason: string;
  updatedByAdminId: string;
  /** clear force → recompute from deposit/success */
  clearForce?: boolean;
};

export type UserMatchPolicyOverrideV1 = {
  userId: string;
  matchStrictnessOverride?: MatchStrictness;
  minProfitUsdt?: string;
  staleAllowanceSec?: number;
  maxRematchCount?: number;
  dailyUserMatchCap?: number;
  reason: string;
  updatedByAdminId: string;
  updatedAt: string;
};

export type PutMatchPolicyOverrideRequest = {
  matchStrictnessOverride?: MatchStrictness;
  minProfitUsdt?: string;
  staleAllowanceSec?: number;
  maxRematchCount?: number;
  dailyUserMatchCap?: number;
  reason: string;
  updatedByAdminId: string;
  /** delete override row */
  clear?: boolean;
};

/** RBAC · schemas/admin-rbac.v1.json */
export const USER_MEMBERSHIP_FORCE_CAPABILITY = "userMembershipForce" as const;
export const USER_MATCH_POLICY_CAPABILITY = "userMatchPolicy" as const;

export const MEMBERSHIP_AUDIT = {
  force: "admin.user.membership.force",
  matchPolicy: "admin.user.match_policy.updated",
} as const;
