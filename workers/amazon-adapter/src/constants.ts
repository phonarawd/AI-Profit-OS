/** amazon-adapter — Engine §0.0.1c Phase1+ listing leg · official partner */

export const ADAPTER_ID = "amazon" as const;
export const SERVICE = "amazon-adapter" as const;

export const AMAZON_MARKET_IDS = [
  "amazon_us",
  "amazon_jp",
  "amazon_de",
] as const;

export type AmazonMarketId = (typeof AMAZON_MARKET_IDS)[number];

/** PA-API 5.0 host + marketplace id per partner market */
export const AMAZON_MARKETPLACE: Record<
  AmazonMarketId,
  { host: string; marketplaceId: string; region: string }
> = {
  amazon_us: {
    host: "webservices.amazon.com",
    marketplaceId: "ATVPDKIKX0DER",
    region: "us-east-1",
  },
  amazon_jp: {
    host: "webservices.amazon.co.jp",
    marketplaceId: "A1VC38T7YXB528",
    region: "us-west-2",
  },
  amazon_de: {
    host: "webservices.amazon.de",
    marketplaceId: "A1PA6795UKMFR9",
    region: "eu-west-1",
  },
};

export const DEFAULT_MARKETPLACES: AmazonMarketId[] = [
  "amazon_us",
  "amazon_jp",
  "amazon_de",
];

export const CACHE_HINT_SEC = 600;
export const LISTING_LEG_PHASE = "Phase1+" as const;
