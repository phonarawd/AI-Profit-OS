/** ebay-adapter — Engine §0.0 ACTIVE · multi marketplaceId listing legs */

export const ADAPTER_ID = "ebay" as const;
export const SERVICE = "ebay-adapter" as const;

/** Browse API marketplaceId enum (Day-1) */
export const EBAY_MARKETPLACE_IDS = [
  "EBAY_US",
  "EBAY_GB",
  "EBAY_DE",
  "EBAY_AU",
] as const;

export type EbayMarketplaceId = (typeof EBAY_MARKETPLACE_IDS)[number];

export const MARKETPLACE_TO_MARKET_ID: Record<EbayMarketplaceId, string> = {
  EBAY_US: "ebay_us",
  EBAY_GB: "ebay_gb",
  EBAY_DE: "ebay_de",
  EBAY_AU: "ebay_au",
};

/** Default P0 legs — buy US × sell GB (same app key) */
export const DEFAULT_MARKETPLACES: EbayMarketplaceId[] = [
  "EBAY_US",
  "EBAY_GB",
];

export const CACHE_HINT_SEC = 300;
export const OAUTH_SCOPE = "https://api.ebay.com/oauth/api_scope";
export const BROWSE_BASE = "https://api.ebay.com/buy/browse/v1";
export const IDENTITY_BASE = "https://api.ebay.com/identity/v1";
