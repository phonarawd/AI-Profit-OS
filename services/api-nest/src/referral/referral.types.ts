/**
 * Money §51.5 Referral · Viral Ladder contracts.
 * User-facing invite copy Owns = UI §5.9.1a (packages/ui/copy/ko/invite.ts).
 * Money Owns = amounts · journals · guards · Pool FIFO · clawback only.
 *
 * FORBIDDEN: capPerReferrerMonth · invite-count reject reason · principal reward credit.
 */

export const REFERRAL_FORBIDDEN_CONFIG_KEYS = ["capPerReferrerMonth"] as const;

export const REFERRAL_EDGE_STATUSES = [
  "bound",
  "l1_done",
  "l2_pending_hold",
  "l2_released",
  "l3_done",
  "held_risk",
  "clawed_back",
  "queued_pool",
] as const;
export type ReferralEdgeStatus = (typeof REFERRAL_EDGE_STATUSES)[number];

export const REFERRAL_LEVELS = ["L1", "L2", "L3"] as const;
export type ReferralLevel = (typeof REFERRAL_LEVELS)[number];

export const REFERRAL_PAYOUT_STATUSES = [
  "pending",
  "held",
  "queued_pool",
  "released",
  "clawed_back",
  "cancelled",
] as const;
export type ReferralPayoutStatus = (typeof REFERRAL_PAYOUT_STATUSES)[number];

export type ReferralTierId = "seed" | "flame" | "rocket" | "whale_maker";

export type ReferralProgramConfig = {
  enabled: boolean;
  rewardsEnabled: boolean;
  l1RefereeExtraPracticeUsdt: string;
  l2ReferrerPct: string;
  l2ReferrerHardCapUsdt: string;
  l2RefereePracticeCapUsdt: string;
  l3ReferrerFlatUsdt: string;
  l3ReferrerHardCapUsdt: string;
  l3RefereeRewardKind: "fee_coupon" | "practice" | "none";
  clawbackHoursL2: number;
  minRefereeDepositUsdt: string;
  sharePerUserPerDay: number;
  systemPayoutCapPerDayUsdt?: string;
  promoPoolTopUpPolicy: "manual" | "pct_of_prior_week_margin";
  promoPoolTopUpPct?: string;
  tiers: Array<{
    id: ReferralTierId;
    minValidInvites: number;
    perks: string[];
  }>;
  /** Runtime ops (not in JSON schema required) */
  accrualHalted?: boolean;
  updatedAt?: string;
  updatedByAdminId?: string;
};

/** Day-1 0원 런칭 defaults · rewardsEnabled=false · invite ∞ */
export const DAY1_REFERRAL_PROGRAM_DEFAULTS: ReferralProgramConfig = {
  enabled: true,
  rewardsEnabled: false,
  l1RefereeExtraPracticeUsdt: "0",
  l2ReferrerPct: "0.05",
  l2ReferrerHardCapUsdt: "3",
  l2RefereePracticeCapUsdt: "1",
  l3ReferrerFlatUsdt: "1",
  l3ReferrerHardCapUsdt: "1",
  l3RefereeRewardKind: "fee_coupon",
  clawbackHoursL2: 72,
  minRefereeDepositUsdt: "20",
  sharePerUserPerDay: 30,
  promoPoolTopUpPolicy: "manual",
  tiers: [
    { id: "seed", minValidInvites: 0, perks: ["badge_seed"] },
    { id: "flame", minValidInvites: 3, perks: ["badge_flame", "share_boost"] },
    {
      id: "rocket",
      minValidInvites: 10,
      perks: ["badge_rocket", "fee_coupon"],
    },
    {
      id: "whale_maker",
      minValidInvites: 30,
      perks: ["badge_whale", "share_boost", "fee_coupon"],
    },
  ],
  accrualHalted: false,
};

export type ReferralEdge = {
  id: string;
  referrerUserId: string;
  refereeUserId: string;
  code: string;
  boundAt: string;
  levelsAchieved: ReferralLevel[];
  status: ReferralEdgeStatus;
  qualifyingDepositUsdt?: string;
  computedL2ReferrerUsdt?: string;
  idempotencyKeys: string[];
  l2HoldUntil?: string;
  l2ReleasedAt?: string;
};

export type ReferralProgramPatchInput = {
  updatedByAdminId: string;
  changeReason: string;
  enabled?: boolean;
  rewardsEnabled?: boolean;
  accrualHalted?: boolean;
  l1RefereeExtraPracticeUsdt?: string;
  l2ReferrerPct?: string;
  l2ReferrerHardCapUsdt?: string;
  l2RefereePracticeCapUsdt?: string;
  l3ReferrerFlatUsdt?: string;
  l3ReferrerHardCapUsdt?: string;
  l3RefereeRewardKind?: ReferralProgramConfig["l3RefereeRewardKind"];
  clawbackHoursL2?: number;
  minRefereeDepositUsdt?: string;
  sharePerUserPerDay?: number;
  systemPayoutCapPerDayUsdt?: string | null;
  promoPoolTopUpPolicy?: ReferralProgramConfig["promoPoolTopUpPolicy"];
  promoPoolTopUpPct?: string | null;
  tiers?: ReferralProgramConfig["tiers"];
};

export type PoolTopUpInput = {
  amountUsdt: string;
  updatedByAdminId: string;
  changeReason: string;
  idempotencyKey: string;
};

export type ClawbackInput = {
  edgeId: string;
  adminId: string;
  reason: string;
  idempotencyKey: string;
};

export type ReleaseHoldInput = {
  edgeId: string;
  adminId: string;
  reason: string;
  idempotencyKey: string;
};

/** Reject reason codes that must NEVER appear for invite-count */
export const FORBIDDEN_INVITE_COUNT_REJECT_CODES = [
  "INVITE_MONTHLY_CAP",
  "REFERRER_MONTHLY_CAP",
  "capPerReferrerMonth",
  "INVITE_COUNT_EXCEEDED",
] as const;
