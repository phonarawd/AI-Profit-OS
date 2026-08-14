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

/**
 * PTF-00C-R1 §4/§6 — deterministic tick runtime budget. A full upstream
 * outage must never make one scheduled tick run indefinitely.
 *
 * Chosen comfortably below BOTH:
 * - the cron cadence (wrangler.toml triggers.crons — every 15 minutes =
 *   900_000ms) — a tick must finish long before the next one is due, or
 *   ticks would pile up.
 * - the listing staleness horizon (CACHE_HINT_SEC=300_000ms) — a tick must
 *   leave real margin inside the freshness window for ingest + persistence.
 *
 * 60_000ms is 1/15 of the cron cadence and 1/5 of the staleness horizon.
 * This is an internal engineering budget only — no eBay production rate
 * limit is committed to this repo, so this number is derived from OUR OWN
 * schedule/staleness constants, never from an assumed upstream quota.
 */
export const TICK_BUDGET_MS = 60_000;

/**
 * Below this much remaining tick budget, a new upstream HTTP call is not
 * even attempted — it is recorded as `deadline_exceeded` evidence instead.
 * Keeps the tick from starting a call it cannot possibly complete usefully.
 */
export const MIN_CALL_BUDGET_MS = 500;

/**
 * Bounded concurrency for the marketplace×query loop. Derived from this
 * worker's OWN configured query volume (DEFAULT_MARKETPLACES=2 ×
 * DEFAULT_SEARCH_QUERIES=16 = 32 units/tick by default; up to
 * EBAY_MARKETPLACE_IDS.length=4 × 16 = 64 units/tick at maximum configured
 * marketplaces) — not from an assumed eBay burst quota (none is published
 * in this repo). High enough to make real progress inside TICK_BUDGET_MS
 * instead of wasting the whole budget on a strictly-serial queue; low
 * enough to avoid an uncontrolled request burst against a third party.
 */
export const TICK_CONCURRENCY = 6;
