/**
 * 유저 Opportunity 카드 모델 — schemas/opportunity-card.v1 + balance-aware bucket
 * arbitrageTypeKo = Engine 투영 · UI 맵 금지
 */
export type OpportunityBucket = "affordable" | "nearMiss" | "lockedHigh";

export type OpportunityCardModel = {
  id: string;
  /** Engine §4.2a pass-through */
  arbitrageTypeKo: string;
  buyMarketLabelKo?: string;
  sellMarketLabelKo?: string;
  buyMarketId?: string;
  sellMarketId?: string;
  assetLabel: string;
  assetImageUrl?: string | null;
  assetImageAltKo: string;
  assetImageSource?: string | null;
  assetIcon?: string | null;
  category: string;
  requiredCapitalUsdt: string;
  expectedProfitUsdt: string;
  aiConfidenceScore: number;
  buyPriceUsdt?: string | null;
  sellPriceUsdt?: string | null;
  platformMarginUsdt?: string | null;
  compareReady?: boolean;
  sellSuccessRate?: number;
  sellSuccessWindowDays?: number;
  tags?: string[];
  bucket?: OpportunityBucket;
  suggestDepositUsdt?: string | null;
  /** §51.19 Adapter Health */
  staleAt?: string | null;
  lastAdapterSyncAt?: string | null;
  sourceCount?: number;
  ctaLockReasonKo?: string | null;
};
