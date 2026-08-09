/** UI §5.9.5 · Money §51.8a.7 read shape (표시 전용) */

export type BenefitCardStatus =
  | "locked"
  | "available"
  | "in_progress"
  | "pending_hold"
  | "posting"
  | "released"
  | "queued_pool"
  | "expired"
  | "skipped";

export type BenefitRewardKind =
  | "none"
  | "practice"
  | "promo_profit"
  | "fee_coupon";

export type BenefitSection = "daily" | "oneTime" | "weekly" | "streak";

export type BenefitMissionCardModel = {
  missionId: string;
  section: BenefitSection;
  /** API sectionRaw — campaign_inline 캐러셀 분기용 */
  sectionRaw?: string;
  titleKo: string;
  bodyKo: string;
  icon?: string | null;
  deepRoute?: string | null;
  rewardKind: BenefitRewardKind;
  rewardAmountUsdt?: string | null;
  autoClaim?: boolean;
  status: BenefitCardStatus;
  /** Weekly progress — 서버 권위 · 없으면 바 숨김 */
  progress?: { current: number; target: number } | null;
  /** Credits currency FORBIDDEN */
  creditsCurrency?: false;
};

export type BenefitSummaryModel = {
  claimableCount: number;
  pendingHoldCount: number;
  queuedPoolCount?: number;
  releasedCount?: number;
  releasedMonthUsdt: string;
  /** 서버/페이지가 넘기면 Hero ≈₩ 표기 · 없으면 USDT만 */
  releasedMonthKrwApprox?: string | null;
  rewardsEnabled: boolean;
  accrualHalted?: boolean;
  creditsCurrency?: false;
};

export type BenefitCampaignSlide = {
  id: string;
  title: string;
  body?: string;
  href?: string;
};
