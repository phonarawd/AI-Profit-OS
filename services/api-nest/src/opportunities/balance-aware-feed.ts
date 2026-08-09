/**
 * Engine §0.0.5.1 — Nest bridge: override merge → MI balance-aware classification
 * Money Owns principal read · UI Owns copy · Admin Owns override CRUD / execution-policy feed
 */

import {
  mergeUserOpportunityOverride,
  type UserOpportunityOverrideV1,
} from "./user-opportunity-override.merge";

// eslint-disable-next-line @typescript-eslint/no-require-imports
const mi = require("@aipo/market-intelligence") as typeof import("@aipo/market-intelligence");

export const BALANCE_AWARE_CLASSIFICATION_OWNER = mi.CLASSIFICATION_OWNER;
export const FEED_BUCKETS = mi.FEED_BUCKETS;
export const SUGGEST_TICK_USDT = mi.SUGGEST_TICK_USDT;
export const NEAR_MISS_CAP_FLOOR_USDT = mi.NEAR_MISS_CAP_FLOOR_USDT;

export const ceilToTick = mi.ceilToTick;
export const computeSuggestDepositUsdt = mi.computeSuggestDepositUsdt;
export const resolveNearMissCapUsdt = mi.resolveNearMissCapUsdt;
export const classifyAffordability = mi.classifyAffordability;
export const buildBalanceAwareFeed = mi.buildBalanceAwareFeed;
export const nearMissCapFromExecutionPolicy = mi.nearMissCapFromExecutionPolicy;

export type BalanceAwareFeedCardInput = {
  id: string;
  requiredCapitalUsdt: string;
  expectedProfitUsdt: string;
  compareReady: boolean;
  capitalBand?: string | null;
  aiPick?: boolean;
  marginPct?: string | null;
  status?: string;
};

/**
 * Apply Admin §9.8.9 override then classify into affordable/nearMiss/lockedHigh.
 * hidden → feed exclude 100% · forceShow → nearMiss promote when capital short ·
 * compareReady false→true forge NEVER.
 */
export function buildBalanceAwareFeedWithOverrides(input: {
  principalUsdt: string;
  cards: BalanceAwareFeedCardInput[];
  overridesByOpportunityId?: Record<
    string,
    UserOpportunityOverrideV1 | null | undefined
  >;
  /** execution-policy.feed.nearMissCapUsdt · null → Day-1 max(50, principal×0.25) */
  policyNearMissCapUsdt?: string | null;
  executionPolicy?: { feed?: { nearMissCapUsdt?: string } } | null;
}): ReturnType<typeof buildBalanceAwareFeed> {
  const policyCap =
    input.policyNearMissCapUsdt ??
    nearMissCapFromExecutionPolicy(input.executionPolicy ?? null);

  const mergedCards = (input.cards || []).map((card) => {
    const ov = input.overridesByOpportunityId?.[card.id] ?? null;
    const merged = mergeUserOpportunityOverride(
      {
        expectedProfitUsdt: card.expectedProfitUsdt,
        compareReady: card.compareReady,
      },
      ov,
    );
    return {
      id: card.id,
      requiredCapitalUsdt: card.requiredCapitalUsdt,
      expectedProfitUsdt: merged.expectedProfitUsdt,
      compareReady: merged.compareReady,
      capitalBand: merged.capitalBandForce ?? card.capitalBand ?? null,
      aiPick: card.aiPick === true,
      marginPct: merged.marginPctOverride ?? card.marginPct ?? null,
      status: card.status ?? "available",
      excludeFromFeed: merged.excludeFromFeed,
      forceShow: merged.forceShow,
      pinOrder: merged.pinOrder,
    };
  });

  return buildBalanceAwareFeed({
    principalUsdt: input.principalUsdt,
    cards: mergedCards,
    policyNearMissCapUsdt: policyCap,
  });
}
