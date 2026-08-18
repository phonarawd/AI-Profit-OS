/**
 * Bridge → @aipo/market-intelligence membership (§0.0.7)
 */

// eslint-disable-next-line @typescript-eslint/no-require-imports
const mi = require("@aipo/market-intelligence") as typeof import("@aipo/market-intelligence");

export const MEMBERSHIP_ENUM = mi.MEMBERSHIP_ENUM;
export const MEMBERSHIP_LADDER = mi.MEMBERSHIP_LADDER;
export const MEMBERSHIP_LABEL_KO = mi.MEMBERSHIP_LABEL_KO;
export const isMembership = mi.isMembership;
export const membershipDefaults = mi.membershipDefaults;
export const membershipLabelKo = mi.membershipLabelKo;
export const resolveMembership = mi.resolveMembership;
export const projectUserMembership = mi.projectUserMembership;
export const mergeEffectivePolicy = mi.mergeEffectivePolicy;
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
