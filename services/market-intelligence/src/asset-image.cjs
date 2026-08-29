/**
 * Engine §0.0.6 — assetImageUrl hydrate · SKU 1:1 · available 공개 가드.
 * Priority (오차0 · 코드 1곳):
 *   1) Asset Master.imageUrl (Admin / R2) → admin_r2
 *   2) catalog API (pokemontcg | ygoprodeck)
 *   3) listing thumbnail (ebay)
 *   4) missing → available 자동 공개 금지 · Admin queue image_missing
 */

const {
  ASSET_CATEGORIES,
  IMAGE_SOURCES,
  IMAGE_RIGHTS_NOTE_KO,
  isImageMissing,
} = require("./asset-master.cjs");

/** PUTDUK placeholder icons · load-fail fallback only (UI §48.3a) */
const ASSET_ICON_BY_CATEGORY = Object.freeze({
  watch: "⌚",
  trading_card: "🃏",
  luxury_bag: "👜",
});

/** Catalog imageSource allowed only for trading_card */
const CATALOG_IMAGE_SOURCES = Object.freeze(["pokemontcg", "ygoprodeck"]);

/**
 * @param {'watch'|'trading_card'|'luxury_bag'|string} category
 * @returns {string}
 */
function assetIconForCategory(category) {
  return ASSET_ICON_BY_CATEGORY[category] || "⌚";
}

/**
 * Cross-category image ban (시계 기회에 카드 CDN 등).
 * @param {{ category: string, imageSource: string }} input
 * @returns {{ ok: boolean, reason?: string }}
 */
function assertCategoryImageSource(input) {
  const category = String(input.category ?? "");
  const imageSource = String(input.imageSource ?? "");
  if (!ASSET_CATEGORIES.includes(category)) {
    return { ok: false, reason: `invalid category: ${category}` };
  }
  if (!IMAGE_SOURCES.includes(imageSource)) {
    return { ok: false, reason: `invalid imageSource: ${imageSource}` };
  }
  if (CATALOG_IMAGE_SOURCES.includes(imageSource) && category !== "trading_card") {
    return {
      ok: false,
      reason: `cross_category: ${imageSource} forbidden for ${category}`,
    };
  }
  if (imageSource === "ebay" && category === "trading_card") {
    // ebay listing thumbs OK for cards too (secondary after catalog)
    return { ok: true };
  }
  return { ok: true };
}

/**
 * SKU 1:1 — same assetImageUrl must not bind to two assetIds.
 * @param {{ assetId: string, assetImageUrl: string, bindings?: Record<string, string> }} input
 *   bindings = map url → assetId already claimed
 * @returns {{ ok: boolean, reason?: string }}
 */
function assertSkuImageOneToOne(input) {
  const assetId = String(input.assetId ?? "").trim();
  const url = String(input.assetImageUrl ?? "").trim();
  if (!assetId) return { ok: false, reason: "assetId required" };
  if (!url) return { ok: true }; // missing handled by publish guard
  const bindings = input.bindings && typeof input.bindings === "object"
    ? input.bindings
    : {};
  const owner = bindings[url];
  if (owner && owner !== assetId) {
    return {
      ok: false,
      reason: `sku_1_1_violation: url bound to ${owner}, not ${assetId}`,
    };
  }
  return { ok: true };
}

/**
 * @typedef {object} ResolveAssetImageInput
 * @property {string} assetId
 * @property {'watch'|'trading_card'|'luxury_bag'} category
 * @property {string} assetLabel
 * @property {{ imageUrl?: string, imageSource?: string, imageAltKo?: string, imageFetchedAt?: string } | null} [assetMaster]
 * @property {{ imageUrl?: string, imageSmall?: string, imageLarge?: string, imageSource?: 'pokemontcg'|'ygoprodeck', family?: string } | null} [catalog]
 * @property {{ imageUrl?: string } | null} [listing]
 * @property {Record<string, string>} [skuBindings]
 */

/**
 * Resolve hydrate in fixed priority. Never fetches at user click path.
 * @param {ResolveAssetImageInput} input
 */
function resolveAssetImage(input) {
  const assetId = String(input.assetId ?? "").trim();
  const category = input.category;
  const assetLabel = String(input.assetLabel ?? "").trim() || assetId;
  const assetIcon = assetIconForCategory(category);

  const tryApply = (imageUrl, imageSource, imageAltKo, imageFetchedAt) => {
    const url = String(imageUrl ?? "").trim();
    if (!url) return null;
    const src = String(imageSource ?? "").trim();
    const catOk = assertCategoryImageSource({ category, imageSource: src });
    if (!catOk.ok) return null;
    const skuOk = assertSkuImageOneToOne({
      assetId,
      assetImageUrl: url,
      bindings: input.skuBindings,
    });
    if (!skuOk.ok) return null;
    return {
      assetId,
      category,
      assetLabel,
      assetImageUrl: url,
      assetImageSource: src,
      assetImageAltKo: String(imageAltKo ?? assetLabel).trim() || assetLabel,
      imageRightsNoteKo: IMAGE_RIGHTS_NOTE_KO,
      assetIcon,
      imageMissing: false,
      imageFetchedAt: imageFetchedAt || null,
      hydrateRank: null,
    };
  };

  // 1) Asset Master (Admin seed / R2)
  const master = input.assetMaster;
  if (master && String(master.imageUrl ?? "").trim()) {
    const hit = tryApply(
      master.imageUrl,
      master.imageSource || "admin_r2",
      master.imageAltKo,
      master.imageFetchedAt,
    );
    if (hit) {
      hit.hydrateRank = 1;
      return hit;
    }
  }

  // 2) Catalog API
  const catalog = input.catalog;
  if (catalog) {
    const catUrl =
      catalog.imageUrl ||
      catalog.imageSmall ||
      catalog.imageLarge ||
      "";
    let catSource = catalog.imageSource;
    if (!catSource) {
      if (catalog.family === "yugioh") catSource = "ygoprodeck";
      else catSource = "pokemontcg";
    }
    const hit = tryApply(catUrl, catSource, assetLabel, null);
    if (hit) {
      hit.hydrateRank = 2;
      return hit;
    }
  }

  // 3) Listing thumbnail (ebay Browse)
  const listing = input.listing;
  if (listing && String(listing.imageUrl ?? "").trim()) {
    const hit = tryApply(listing.imageUrl, "ebay", assetLabel, null);
    if (hit) {
      hit.hydrateRank = 3;
      return hit;
    }
  }

  // 4) missing
  return {
    assetId,
    category,
    assetLabel,
    assetImageUrl: "",
    assetImageSource: "admin_r2",
    assetImageAltKo: assetLabel,
    imageRightsNoteKo: IMAGE_RIGHTS_NOTE_KO,
    assetIcon,
    imageMissing: true,
    imageFetchedAt: null,
    hydrateRank: 4,
  };
}

/**
 * available 자동 공개 가드.
 * compareReady AND assetImageUrl non-empty ·
 * 예외: useAdminOverride && imageOptional===true (기본 false)
 *
 * @param {{
 *   compareReady: boolean,
 *   assetImageUrl?: string | null,
 *   useAdminOverride?: boolean,
 *   imageOptional?: boolean,
 * }} input
 * @returns {boolean}
 */
function canAutoPublishAvailable(input) {
  if (input.compareReady !== true) return false;
  const url = String(input.assetImageUrl ?? "").trim();
  if (url.length > 0) return true;
  if (input.useAdminOverride === true && input.imageOptional === true) {
    return true;
  }
  return false;
}

/**
 * @param {{
 *   compareReady: boolean,
 *   assetImageUrl?: string | null,
 *   useAdminOverride?: boolean,
 *   imageOptional?: boolean,
 *   category?: string,
 *   imageSource?: string,
 *   assetId?: string,
 *   skuBindings?: Record<string, string>,
 * }} input
 * @returns {{ ok: boolean, fails: string[] }}
 */
function assertPublishImageGuard(input) {
  const fails = [];
  if (input.compareReady !== true) fails.push("compareReady_false");
  const empty = isImageMissing({ imageUrl: input.assetImageUrl });
  const optionalOk =
    input.useAdminOverride === true && input.imageOptional === true;
  if (empty && !optionalOk) fails.push("assetImageUrl_empty");
  if (input.category && input.imageSource) {
    const cat = assertCategoryImageSource({
      category: input.category,
      imageSource: input.imageSource,
    });
    if (!cat.ok) fails.push(cat.reason || "cross_category");
  }
  if (input.assetId && input.assetImageUrl) {
    const sku = assertSkuImageOneToOne({
      assetId: input.assetId,
      assetImageUrl: input.assetImageUrl,
      bindings: input.skuBindings,
    });
    if (!sku.ok) fails.push(sku.reason || "sku_1_1");
  }
  return { ok: fails.length === 0, fails };
}

/**
 * Project resolve result onto OpportunityCard image fields.
 * @param {ReturnType<typeof resolveAssetImage>} resolved
 */
function toOpportunityImageProjection(resolved) {
  return {
    assetImageUrl: resolved.assetImageUrl,
    assetImageSource: resolved.assetImageSource,
    assetImageAltKo: resolved.assetImageAltKo,
    assetIcon: resolved.assetIcon,
    imageMissing: resolved.imageMissing,
    imageRightsNoteKo: resolved.imageRightsNoteKo,
  };
}

module.exports = {
  ASSET_ICON_BY_CATEGORY,
  CATALOG_IMAGE_SOURCES,
  assetIconForCategory,
  assertCategoryImageSource,
  assertSkuImageOneToOne,
  resolveAssetImage,
  canAutoPublishAvailable,
  assertPublishImageGuard,
  toOpportunityImageProjection,
};
