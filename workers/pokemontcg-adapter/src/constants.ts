export const ADAPTER_ID = "pokemontcg" as const;
export const SERVICE = "pokemontcg-adapter" as const;
export const API_BASE = "https://api.pokemontcg.io/v2";
/** Meta cache 24h · price cache ≥1h (plan §0.0.1) */
export const CACHE_HINT_SEC = 3600;
