/**
 * Bridge → @aipo/market-intelligence membership (§0.0.7)
 */

type MembershipQuotaExports = {
  readExplicitNonNegativeInt: (value: unknown) => number | null;
  NEW_SIGNUP_DAILY_MATCH_CAP: number;
  GRADE_DAILY_MATCH_DEFAULTS: Readonly<Record<string, number>>;
  QUOTA_DAY_TIMEZONE: string;
  resolveMemberDailyMatchCap: (input: {
    userId?: string;
    overrideDailyUserMatchCap?: unknown;
    membershipRowCap?: unknown;
    gradePolicyCap?: unknown;
    ladderCap?: unknown;
    policyCap?: unknown;
  }) => { cap: number; source: string; userId: string };
  projectDailyMatchQuota: (input: {
    userId?: string;
    used: unknown;
    overrideDailyUserMatchCap?: unknown;
    membershipRowCap?: unknown;
    gradePolicyCap?: unknown;
    ladderCap?: unknown;
    policyCap?: unknown;
    at?: Date | string | number;
  }) => {
    userId: string;
    cap: number;
    used: number;
    remaining: number;
    source: string;
    blocked: boolean;
    usedCountBasis: "accepted_participate_requests_kst_day";
    timezone?: string;
    kstDay?: string;
  };
  rowCapAfterGradeChange: (input: {
    hasIndividualCapOverride: boolean;
    currentRowCap: unknown;
    nextGradeCap: unknown;
  }) => { rowCap: number; preservedOverride: boolean; usageReset: false };
  kstDayKey: (at?: Date | string | number) => string;
};

// eslint-disable-next-line @typescript-eslint/no-require-imports
const mi = require("@aipo/market-intelligence") as typeof import("@aipo/market-intelligence") &
  MembershipQuotaExports;

export const MEMBERSHIP_ENUM = mi.MEMBERSHIP_ENUM;
export const MEMBERSHIP_LADDER = mi.MEMBERSHIP_LADDER as Record<
  string,
  { dailyUserMatchCap: number }
>;
export const MEMBERSHIP_LABEL_KO = mi.MEMBERSHIP_LABEL_KO;
export const isMembership = mi.isMembership;
export const membershipDefaults = mi.membershipDefaults;
export const membershipLabelKo = mi.membershipLabelKo;
export const resolveMembership = mi.resolveMembership;
export const maxMembership = mi.maxMembership;
export const MEMBERSHIP_RANK = mi.MEMBERSHIP_RANK;
export const projectUserMembership = mi.projectUserMembership;
export const mergeEffectivePolicy = mi.mergeEffectivePolicy;
export const readExplicitNonNegativeInt = mi.readExplicitNonNegativeInt;
export const NEW_SIGNUP_DAILY_MATCH_CAP = mi.NEW_SIGNUP_DAILY_MATCH_CAP;
export const GRADE_DAILY_MATCH_DEFAULTS = mi.GRADE_DAILY_MATCH_DEFAULTS;
export const QUOTA_DAY_TIMEZONE = mi.QUOTA_DAY_TIMEZONE;
export const resolveMemberDailyMatchCap = mi.resolveMemberDailyMatchCap;
export const projectDailyMatchQuota = mi.projectDailyMatchQuota;
export const rowCapAfterGradeChange = mi.rowCapAfterGradeChange as (input: {
  hasIndividualCapOverride: boolean;
  currentRowCap: unknown;
  nextGradeCap: unknown;
}) => { rowCap: number; preservedOverride: boolean; usageReset: false };
export const kstDayKey = mi.kstDayKey as (at?: Date | string | number) => string;
export const checkParticipateMembershipGuards =
  mi.checkParticipateMembershipGuards;
export const computeFulfillRate7d = mi.computeFulfillRate7d;
export const membershipBandOverlayStrictness =
  mi.membershipBandOverlayStrictness;
export const assertMembershipSnapshots = mi.assertMembershipSnapshots;
export const applyMatchStrictness = mi.applyMatchStrictness;
export const expandMatchStrictness = mi.expandMatchStrictness;
export const isMatchStrictness = mi.isMatchStrictness;
export const day1ExecutionPolicyDefaults = mi.day1ExecutionPolicyDefaults;
