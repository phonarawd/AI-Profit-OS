export const ADAPTER_ID = "frankfurter" as const;
export const SERVICE = "frankfurter-adapter" as const;
export const API_BASE = "https://api.frankfurter.dev";
/** Daily fiat quote · 1h cache (plan §0.0.1) */
export const CACHE_HINT_SEC = 3600;
/** Prevent one public fiat reference fetch from hanging the scheduled tick. */
export const UPSTREAM_TIMEOUT_MS = 8_000;
