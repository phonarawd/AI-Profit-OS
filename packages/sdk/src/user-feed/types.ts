/**
 * User feed DTO — Nest OpportunitiesUserService.toUserCard
 * + DayPulseService.getToday (UI §51.24)
 * Classification / principal math = Engine·Money Owns · SDK pass-through only
 *
 * Exact typed contract. Record ghost 금지.
 * user surface에 없는 키를 타입에 올리지 않는다:
 * partnerLabel / partner / officialPartner / official / title
 */

export type OpportunityAssetImageSource =
  | "ebay"
  | "pokemontcg"
  | "ygoprodeck"
  | "admin_r2";

/**
 * listFeed / getById user card.
 * Money: USDT·marginPct = string · expectedProfitKrwApprox = number.
 * buyMarket* 는 toUserCard top-level lift. 없으면 필드 자체 absent.
 */
export type OpportunityFeedItem = {
  id: string;
  assetId: string | null;
  assetLabel: string | null;
  assetImageUrl: string | null;
  assetImageSource: OpportunityAssetImageSource | null;
  assetImageAltKo: string | null;
  arbitrageType: string | null;
  arbitrageTypeKo: string | null;
  expectedProfitUsdt: string | null;
  expectedProfitKrwApprox: number | null;
  requiredCapitalUsdt: string | null;
  estimatedDurationSec: number | null;
  staleAt: string | null;
  status: string | null;
  bucket: string | null;
  marginPct: string | null;
  buyMarketId?: string;
  buyMarketLabelKo?: string;
  /** getById pricing lift. list에 없어도 됨. 클라 재계산 금지 */
  sellMarketId?: string;
  sellMarketLabelKo?: string;
  buyPriceUsdt?: string;
  sellPriceUsdt?: string;
  grossSpreadUsdt?: string;
  /** getById pass-through · participate optimistic lock. list에 없어도 됨 */
  pricingVersion?: number;
  /** Engine suggest. 클라 재계산 금지 */
  suggestDepositUsdt?: string | null;
  compareReady?: boolean;
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
  principalUsdt: string | null;
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

/**
 * GET /api/v1/opportunities 실패.
 * status만 가진 작은 타입. 새 client 프레임워크 아님.
 * 401 = AUTH_REQUIRED. 0 = network. 그 외 HTTP/malformed.
 */
export class OpportunityFeedError extends Error {
  readonly status: number;

  constructor(status: number, message?: string) {
    super(message ?? `opportunity_feed_${status}`);
    this.name = "OpportunityFeedError";
    this.status = status;
  }
}

export function isOpportunityFeedError(
  err: unknown,
): err is OpportunityFeedError {
  return err instanceof OpportunityFeedError;
}
