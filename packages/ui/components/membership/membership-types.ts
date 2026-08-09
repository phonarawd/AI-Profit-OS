import type { MembershipGradeId } from "../../brand/membership";

export type MembershipLadderRung = {
  id: MembershipGradeId | string;
  labelKo?: string;
  depositMinUsdt?: string;
  successMin?: number | null;
  dailyUserMatchCap?: number;
  maxCapitalBand?: string;
  aiPerkFlags?: string[];
};

export type MembershipMeModel = {
  membership: MembershipGradeId | string;
  labelKo?: string;
  dailyUserMatchCap?: number;
  dailyMatchesUsed?: number;
  maxCapitalBand?: string;
  aiPerkFlags?: string[];
  fulfillRate7d?: number | null;
  fulfillRateReadOnly?: boolean;
  ruleInputExcluded?: boolean;
  ladder?: MembershipLadderRung[];
};
