/**
 * Product image hosts + category icons — UI §48.3a · audit §26/§37
 * Source-agnostic: all IMAGE_SOURCES use the same ProductImage slot.
 */

export const ASSET_IMAGE_SOURCES = [
  "ebay",
  "pokemontcg",
  "ygoprodeck",
  "admin_r2",
] as const;

export type AssetImageSource = (typeof ASSET_IMAGE_SOURCES)[number];

export const ASSET_CATEGORIES = [
  "watch",
  "trading_card",
  "luxury_bag",
] as const;

export type AssetCategory = (typeof ASSET_CATEGORIES)[number];

/** Lux placeholder icons · load-fail / missing only (Engine ASSET_ICON_BY_CATEGORY mirror) */
export const ASSET_ICON_BY_CATEGORY: Record<AssetCategory, string> = {
  watch: "⌚",
  trading_card: "🃏",
  luxury_bag: "👜",
};

export function assetIconForCategory(category: string): string {
  if (category in ASSET_ICON_BY_CATEGORY) {
    return ASSET_ICON_BY_CATEGORY[category as AssetCategory];
  }
  return ASSET_ICON_BY_CATEGORY.watch;
}

/**
 * next/image remotePatterns — Day-1 hotlink allowlist (audit §37/§44 · REL-013).
 * 최소 allowlist. 임의 https 전체 허용 0.
 * Custom R2_ASSET_IMAGES_PUBLIC_BASE 호스트는 app next.config에만 추가한다.
 */
export const PRODUCT_IMAGE_USED_HOSTS = [
  "i.ebayimg.com",
  "images.pokemontcg.io",
  "images.ygoprodeck.com",
  "asset-images.r2.dev",
] as const;

/** `{bucket}.{account}.r2.cloudflarestorage.com` 만. 그 외 ** 와일드카드 금지. */
export const PRODUCT_IMAGE_ALLOWED_WILDCARD_HOSTS = [
  "**.r2.cloudflarestorage.com",
] as const;

export const PRODUCT_IMAGE_REMOTE_PATTERNS = [
  { protocol: "https" as const, hostname: "i.ebayimg.com", pathname: "/**" },
  {
    protocol: "https" as const,
    hostname: "images.pokemontcg.io",
    pathname: "/**",
  },
  {
    protocol: "https" as const,
    hostname: "images.ygoprodeck.com",
    pathname: "/**",
  },
  {
    protocol: "https" as const,
    hostname: "asset-images.r2.dev",
    pathname: "/**",
  },
  {
    protocol: "https" as const,
    hostname: "**.r2.cloudflarestorage.com",
    pathname: "/**",
  },
];
