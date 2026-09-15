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
  /** 횟수만 변경. 품질(minProfit/stale/strictness)은 건드리지 않음 */
  capOnly?: boolean;
};

/** 회원별 참여 횟수 단독 지정 · 0=신규 참여 차단 */
export type PutMemberDailyMatchCapRequest = {
  dailyUserMatchCap?: number;
  reason: string;
  updatedByAdminId: string;
  /** override cap만 해제. 품질 override 행은 유지 */
  clear?: boolean;
};

export type DailyMatchQuotaV1 = {
  userId: string;
  cap: number;
  used: number;
  remaining: number;
  source: string;
  blocked: boolean;
  usedCountBasis: "accepted_participate_requests_kst_day";
  timezone?: "Asia/Seoul";
  kstDay?: string;
  baseRemaining?: number;
  bonusRemaining?: number;
  participateRemaining?: number;
  explicitParticipateBlock?: boolean;
  storeStatus?: "ready" | "unready";
  schemaReady?: boolean;
  persistence?: string;
  providerKind?: string;
  bonusSource?: string;
  gradeCapSource?: string;
};

export type PutGradeDailyCapRequest = {
  grade: MembershipId;
  dailyUserMatchCap: number;
  reason: string;
  updatedByAdminId: string;
  expectedRevision?: number;
};

export type GrantBonusMatchesRequest = {
  amount: number;
  reason: string;
  updatedByAdminId: string;
  idempotencyKey: string;
};

export type ReclaimBonusMatchesRequest = {
  amount?: number;
  reason: string;
  updatedByAdminId: string;
};

/** RBAC · schemas/admin-rbac.v1.json */
export const USER_MEMBERSHIP_FORCE_CAPABILITY = "userMembershipForce" as const;
export const USER_MATCH_POLICY_CAPABILITY = "userMatchPolicy" as const;

/** 제품 Journey v19. execution-policy 5단계 초안과 다름 */
export const JOURNEY_V19_STEPS = [
  "product",
  "compare",
  "cargo",
  "flight",
  "buyer",
  "settle",
  "complete",
] as const;

export type JourneyV19Step = (typeof JOURNEY_V19_STEPS)[number];

export type JourneyV19Phase = {
  id: JourneyV19Step;
  atSec: number;
};

/** 사용자 GET presentationProfile. compiled v19 ≠ 운영자 초 저장 완료 */
export type UserPresentationProfileV1 = {
  kind: "user_display_journey";
  audience: "putduk-web";
  profileId: string;
  profileContractVersion: number;
  steps: JourneyV19Step[];
  phases: JourneyV19Phase[];
  phaseAtSec: Record<JourneyV19Step, number>;
  totalDurationSec: number;
  revision: number;
  persistence:
    | "compiled_v19_schema_unready"
    | "compiled_v19"
    | "compiled_v19_five_step_ignored"
    | "runtime_persist";
  schemaReady: boolean;
  schemaApplied: boolean;
  storeStatus: "ready" | "unready";
  operatorSecondsApplied: boolean;
  operatorTimeSettingsComplete: boolean;
  compiledV19IsNotOperatorComplete: boolean;
  fiveStepDraftIgnored?: boolean;
  moneyUntouched: true;
  capUntouched: true;
  gradeUntouched: true;
  engineDeadlineUntouched: true;
  resultUntouched: true;
  settleTriggeredByPresentation: false;
};

export type PutPresentationProfileRequest = {
  profile: {
    profileId?: string;
    contractVersion?: number;
    phases: JourneyV19Phase[];
    totalDurationSec: number;
  };
  reason: string;
  updatedByAdminId: string;
  expectedRevision?: number;
};

export const MEMBERSHIP_AUDIT = {
  force: "admin.user.membership.force",
  matchPolicy: "admin.user.match_policy.updated",
  gradeDaily: "admin.membership.grade_daily_cap.updated",
  bonusGrant: "admin.user.membership.bonus_grant",
  bonusReclaim: "admin.user.membership.bonus_reclaim",
  presentation: "admin.membership.presentation_profile.updated",
} as const;
