export type MarketId =
  | "ebay_us"
  | "ebay_gb"
  | "ebay_de"
  | "ebay_au"
  | "admin";

export type CapitalBand = "micro" | "small" | "mid" | "high" | "whale";

export type UpdateOpportunityPricingRequest = {
  adminBuyUsdt?: string;
  adminSellUsdt?: string;
  adminMarginPct?: string;
  useAdminOverride: boolean;
  expectedPricingVersion: number;
  buyMarketId?: MarketId;
  sellMarketId?: MarketId;
  updatedByAdminId: string;
  reason: string;
  reasonCode: string;
  role?: string;
};

export type OpportunityAdminListQuery = {
  compareReady?: boolean;
  gradeMismatch?: boolean;
  /** query key = image_missing (Admin / Engine §0.0.6) */
  image_missing?: boolean;
  capitalBand?: CapitalBand;
  status?: "available" | "paused" | "expired" | "circuit_open";
  category?: "watch" | "trading_card" | "luxury_bag";
  limit?: number;
};

export type OpportunityAdminListItem = {
  id: string;
  pricingVersion: number;
  assetId: string;
  assetLabel: string;
  assetImageUrl: string;
  category: string;
  status: string;
  expectedProfitUsdt: string;
  requiredCapitalUsdt: string;
  capitalBand: string | null;
  compareReady: boolean;
  gradeMismatch: boolean;
  imageMissing: boolean;
  pricing: Record<string, unknown>;
  pricedAt: string;
  staleAt: string;
};
