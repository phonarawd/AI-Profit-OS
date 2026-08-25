export const ADAPTER_ID = "coingecko" as const;
export const SERVICE = "coingecko-adapter" as const;
export const API_BASE = "https://api.coingecko.com/api/v3";
/** Demo plan: 10k credits/mo. 10-minute cadence ≈ 4320 calls/mo. */
export const CACHE_HINT_SEC = 600;
export const UPSTREAM_INTERVAL_SEC = 600;
export const MIN_FETCH_GAP_MS = 9 * 60 * 1000;
/** Bound one upstream HTTP attempt; retry policy still permits at most one transient retry. */
export const UPSTREAM_TIMEOUT_MS = 8_000;
export const COINGECKO_MONTHLY_LIMIT = 10000;
export const VS_CURRENCIES = "krw,usd" as const;
