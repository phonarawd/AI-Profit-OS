/**
 * User feed DTO — Nest OpportunitiesUserService.listFeed / getById
 * + DayPulseService.getToday (UI §51.24)
 * Classification / principal math = Engine·Money Owns · SDK pass-through only
 */

export type OpportunityFeedItem = Record<string, unknown> & {
  id: string;
};

/** Raw listFeed JSON + UI BalanceAwareHome prop mapping */
export type OpportunityFeedResponse = {
  principalUsdt: string;
  nearMissCapUsdt?: string;
  classificationOwner?: string;
  affordableCount: number;
  /** API Fact (Engine §0.0.5.1) */
  nearMissCount: number;
  /**
   * BalanceAwareHome prop 매핑 — listFeed.nearMissCount → nearMissExtraCount
   * (PART9a · UI 재계산 금지)
   */
  nearMissExtraCount: number;
  lockedHighCount?: number;
  hiddenCount?: number;
  topSuggestDepositUsdt?: string | null;
  v1FeedArbitrageTypes?: string[];
  items: OpportunityFeedItem[];
};

export type OpportunityDetailResponse = {
  principalUsdt: string;
  nearMissCapUsdt?: string;
  classificationOwner?: string;
  item: OpportunityFeedItem;
};

export type DayPulseResponse = {
  asOf: string;
  tz: "Asia/Seoul" | string;
  source: "live";
  g4Merge: false | boolean;
  platformSafeStopToday: number;
  settlementCompletedToday: number;
  scope: "platform" | string;
  presence: {
    enabled: boolean;
    liveSessionCount: number | null;
  };
};

export type UserFeedRequestOpts = {
  apiBase?: string;
  /** Bearer (optional) · session cookie는 credentials:include */
  getAccessToken?: () => string | null | Promise<string | null>;
  signal?: AbortSignal;
};
