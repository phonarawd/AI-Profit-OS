/**
 * Engine §0.0 / §0.0.6 — Asset Master helpers (SKU 1:1 · image fields).
 * Hydrate priority / publish guard = asset-image.cjs.
 */

const ASSET_CATEGORIES = Object.freeze([
  "watch",
  "trading_card",
  "luxury_bag",
]);

const IMAGE_SOURCES = Object.freeze([
  "ebay",
  "pokemontcg",
  "ygoprodeck",
  "admin_r2",
]);

const IMAGE_RIGHTS_NOTE_KO = "시세 참고용";

/**
 * @typedef {object} AssetMasterInput
 * @property {string} assetId
 * @property {'watch'|'trading_card'|'luxury_bag'} category
 * @property {string} assetLabel
 * @property {string} imageUrl
 * @property {'ebay'|'pokemontcg'|'ygoprodeck'|'admin_r2'} imageSource
 * @property {string} [imageAltKo]
 * @property {string} [imageFetchedAt]
 * @property {object} [meta]
 */

/**
 * Normalize / validate Asset Master row for Admin upsert.
 * @param {AssetMasterInput} input
 */
function normalizeAssetMaster(input) {
  const assetId = String(input.assetId ?? "").trim();
  if (!assetId) throw new Error("assetId required");

  if (!ASSET_CATEGORIES.includes(input.category)) {
    throw new Error(`invalid category: ${input.category}`);
  }
  if (!IMAGE_SOURCES.includes(input.imageSource)) {
    throw new Error(`invalid imageSource: ${input.imageSource}`);
  }

  const imageUrl = String(input.imageUrl ?? "").trim();
  if (!imageUrl) throw new Error("imageUrl required");

  const assetLabel = String(input.assetLabel ?? "").trim();
  if (!assetLabel) throw new Error("assetLabel required");

  return {
    assetId,
    category: input.category,
    assetLabel,
    imageUrl,
    imageSource: input.imageSource,
    imageAltKo: String(input.imageAltKo ?? assetLabel).trim() || assetLabel,
    imageRightsNoteKo: IMAGE_RIGHTS_NOTE_KO,
    imageFetchedAt: input.imageFetchedAt || null,
    meta: input.meta && typeof input.meta === "object" ? input.meta : {},
  };
}

/**
 * @param {{ imageUrl?: string | null }} assetOrOpp
 * @returns {boolean}
 */
function isImageMissing(assetOrOpp) {
  const url = String(assetOrOpp?.imageUrl ?? "").trim();
  return url.length === 0;
}

module.exports = {
  ASSET_CATEGORIES,
  IMAGE_SOURCES,
  IMAGE_RIGHTS_NOTE_KO,
  normalizeAssetMaster,
  isImageMissing,
};
