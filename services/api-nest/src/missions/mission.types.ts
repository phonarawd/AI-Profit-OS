/**
 * Money §51.8a contracts · Engine §48.13.4 fanout boundary.
 * Accrual/Pool/clawback Owns = Money · UI copy Owns = UI §5.9.5.
 */

export const MISSION_ACCRUAL_STATUSES = [
  "pending",
  "pending_hold",
  "queued_pool",
  "posting",
  "released",
  "clawed_back",
  "halted",
  "skipped",
] as const;
export type MissionAccrualStatus = (typeof MISSION_ACCRUAL_STATUSES)[number];

export const MISSION_REWARD_KINDS = [
  "none",
  "practice",
  "promo_profit",
  "fee_coupon",
] as const;
export type MissionRewardKind = (typeof MISSION_REWARD_KINDS)[number];

export type MissionDefinitionRow = {
  id: string;
  section: string;
  title_ko: string;
  body_ko: string;
  trigger_event: string;
  trigger_predicate: Record<string, unknown>;
  reward_kind: MissionRewardKind;
  reward_amount_usdt: string | null;
  auto_claim: boolean;
  growth_required: boolean;
  release_hold_hours: number;
  status: "draft" | "live" | "paused" | "ended";
};

export type MissionProgramConfig = {
  rewardsEnabled: boolean;
  accrualHalted: boolean;
  m05MinDepositUsdt: string;
  m07FirstSettlementUsdt: string;
  d03DailyParticipateUsdt: string;
  releaseHoldHoursM05: number;
  releaseHoldHoursM07: number;
  systemMissionPayoutCapPerDayUsdt: string | null;
  clawbackHoursMission: number;
};

/** Day-1 defaults · Money §51.8a.5 · 0원 until Growth ON */
export const DAY1_MISSION_PROGRAM_DEFAULTS: MissionProgramConfig = {
  rewardsEnabled: false,
  accrualHalted: false,
  m05MinDepositUsdt: "20",
  m07FirstSettlementUsdt: "2",
  d03DailyParticipateUsdt: "0",
  releaseHoldHoursM05: 48,
  releaseHoldHoursM07: 24,
  systemMissionPayoutCapPerDayUsdt: null,
  clawbackHoursMission: 72,
};

export type SettlementCompletedPayload = {
  event: typeof import("./mission.events").SETTLEMENT_EVENTS.completed;
  journalId: string;
  userId: string;
  tradeId?: string;
  userNetProfitUsdt?: string;
  /** Explicit: fanout never mutates the settlement journal */
  settlementLedgerImmutable: true;
  source: "ledger.journal.posted";
};

export type MissionDomainEventName =
  | "settlement.completed"
  | "deposit.confirmed"
  | "participate.confirmed"
  | "profile.completed"
  | "kyc.submitted"
  | "pwa.installed";

export type MissionEvaluateContext = {
  event: MissionDomainEventName | string;
  userId: string;
  sourceEventId: string;
  amountUsdt?: string;
  isFirstSettlement?: boolean;
  isFirstDeposit?: boolean;
};
