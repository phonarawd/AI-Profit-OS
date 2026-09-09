/** fashionphile-parser — observation only · not a listing leg */

export const ADAPTER_ID = "fashionphile" as const;
export const SERVICE = "fashionphile-parser" as const;
export const CACHE_HINT_SEC = 1800;
export const LISTING_LEG = false;
export const STOREFRONT_ORIGIN = "https://www.fashionphile.com";
export const PAGE_LIMIT = 30;
export const PAGES_PER_COLLECTION = 2;
export const COLLECTION_HANDLES = [
  "handbags",
  "hermes",
  "chanel",
  "louis-vuitton",
] as const;
export const DEFAULT_PRODUCTS_URL = `${STOREFRONT_ORIGIN}/products.json?limit=${PAGE_LIMIT}&page=1`;

export function fashionphileCatalogUrls(
  pages = PAGES_PER_COLLECTION,
): string[] {
  const n = Number.isFinite(pages) && pages >= 1 ? Math.min(Math.floor(pages), 4) : 2;
  const urls: string[] = [];
  for (const handle of COLLECTION_HANDLES) {
    for (let page = 1; page <= n; page += 1) {
      urls.push(
        `${STOREFRONT_ORIGIN}/collections/${handle}/products.json?limit=${PAGE_LIMIT}&page=${page}`,
      );
    }
  }
  return urls;
}
