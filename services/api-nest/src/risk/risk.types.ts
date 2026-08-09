/** Money §49.9 types — P1~P24 · E1~E12 · risk state · queue */

export const RISK_STATUSES = [
  "active",
  "flagged",
  "restricted",
  "frozen",
  "banned",
] as const;
export type RiskStatus = (typeof RISK_STATUSES)[number];

export const RISK_SEVERITIES = ["info", "warn", "high", "p0"] as const;
export type RiskSeverity = (typeof RISK_SEVERITIES)[number];

export const RISK_QUEUE_STATUSES = [
  "open",
  "acked",
  "resolved",
  "auto_frozen",
] as const;
export type RiskQueueStatus = (typeof RISK_QUEUE_STATUSES)[number];

export type P49RuleCode =
  | "P1"
  | "P2"
  | "P3"
  | "P4"
  | "P5"
  | "P6"
  | "P7"
  | "P8"
  | "P9"
  | "P10"
  | "P11"
  | "P12"
  | "P13"
  | "P14"
  | "P15"
  | "P16"
  | "P17"
  | "P18"
  | "P19"
  | "P20"
  | "P21"
  | "P22"
  | "P23"
  | "P24"
  | "E1"
  | "E2"
  | "E3"
  | "E4"
  | "E5"
  | "E6"
  | "E7"
  | "E8"
  | "E9"
  | "E10"
  | "E11"
  | "E12";

export type RiskRuleDef = {
  code: P49RuleCode;
  kind: "abuse" | "error";
  title: string;
  defense: string;
  detect: string;
  severity: RiskSeverity;
  /** When true, signal auto-links freeze path */
  freezeOnHit?: boolean;
  /** Toast / HTTP code when user-facing */
  toastCode?: string;
};

export type RiskStatusEffects = {
  withdrawBlocked: boolean;
  principalWithdrawCapped: boolean;
  mergeBlocked: boolean;
  participateBlocked: boolean;
  loginBlocked: boolean;
};

export type UserRiskStateV1 = {
  userId: string;
  status: RiskStatus;
  reason?: string;
  updatedAt: string;
  effects: RiskStatusEffects;
};

export type RiskSignalV1 = {
  id: string;
  userId: string | null;
  ruleCode: P49RuleCode;
  severity: RiskSeverity;
  queueStatus: RiskQueueStatus;
  detail: Record<string, unknown>;
  freezeLinked: boolean;
  createdAt: string;
  resolvedAt?: string | null;
};

export type RiskQueueV1 = {
  version: 1;
  tab: "queue";
  moneyCircuitOpen: boolean;
  items: RiskSignalV1[];
};

/** Day-1 restricted principal daily cap (USDT) */
export const RESTRICTED_PRINCIPAL_DAILY_CAP_USDT = "100";

/** Profit withdraw rate limit — P9 */
export const PROFIT_WITHDRAW_RATE_LIMIT_PER_MIN = 5;
