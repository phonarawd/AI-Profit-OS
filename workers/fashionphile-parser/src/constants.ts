/** fashionphile-parser — observation only · not a listing leg */

export const ADAPTER_ID = "fashionphile" as const;
export const SERVICE = "fashionphile-parser" as const;
export const CACHE_HINT_SEC = 1800;
export const LISTING_LEG = false;
export const DEFAULT_PRODUCTS_URL =
  "https://www.fashionphile.com/products.json?limit=30&page=1";
