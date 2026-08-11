/**
 * Engine §0.10 — eBay ingest → Asset Master exact identity match.
 * Reuses watch/card/bag evaluate*ListingMatch · fuzzy-alone auto-publish 0.
 * query:* placeholders are never persisted · unmatched → review queue evidence.
 */

const { evaluateWatchListingMatch } = require("./watch-match.cjs");
const { evaluateCardListingMatch } = require("./card-match.cjs");
const { evaluateBagListingMatch } = require("./bag-match.cjs");
const {
  tradingCardSeedsAsAssetMasters,
} = require("./trading-card-seed.cjs");
const { luxuryBagSeedsAsAssetMasters } = require("./luxury-bag-seed.cjs");
const { watchSeedsAsAssetMasters } = require("./watch-seed.cjs");

function defaultDay1Masters() {
  return [
    ...tradingCardSeedsAsAssetMasters(),
    ...luxuryBagSeedsAsAssetMasters(),
    ...watchSeedsAsAssetMasters(),
  ];
}

const EBAY_IMAGE_HOST = "i.ebayimg.com";

/**
 * @param {string | null | undefined} url
 * @returns {boolean}
 */
function isEbayImageHost(url) {
  const raw = String(url ?? "").trim();
  if (!raw) return false;
  try {
    const host = new URL(raw).hostname.toLowerCase();
    return host === EBAY_IMAGE_HOST || host.endsWith(".ebayimg.com");
  } catch {
    return false;
  }
}

/**
 * @param {string | null | undefined} v
 */
function normLoose(v) {
  return String(v ?? "")
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^\p{L}\p{N}]+/gu, " ")
    .replace(/\s+/g, " ")
    .trim();
}

/**
 * @param {string} haystackNorm
 * @param {string | null | undefined} needle
 */
function titleContains(haystackNorm, needle) {
  const n = normLoose(needle);
  if (!n) return false;
  return haystackNorm.includes(n);
}

/**
 * Extract search query hint from ingest listing (query: placeholder or searchQuery).
 * @param {Record<string, unknown>} listing
 */
function extractSearchQuery(listing) {
  if (listing.searchQuery != null && String(listing.searchQuery).trim()) {
    return String(listing.searchQuery).trim();
  }
  const aid = String(listing.assetId ?? "");
  if (aid.startsWith("query:")) return aid.slice("query:".length).trim();
  return "";
}

/**
 * Build listingMeta only when title evidence supports Asset Master identity tokens.
 * @param {string} title
 * @param {object} asset normalizeAssetMaster row
 * @returns {object | null}
 */
function listingMetaFromTitleEvidence(title, asset) {
  const meta = asset.meta && typeof asset.meta === "object" ? asset.meta : {};
  const titleNorm = normLoose(title);
  const category = String(asset.category || meta.category || "");

  if (category === "watch") {
    const brand = meta.brand != null ? String(meta.brand) : "";
    const reference = meta.reference != null ? String(meta.reference) : "";
    const model = meta.model != null ? String(meta.model) : "";
    if (!titleContains(titleNorm, brand) || !titleContains(titleNorm, reference)) {
      return null;
    }
    if (model) {
      const modelCore = model.split(/\s+/)[0];
      if (
        !titleContains(titleNorm, model) &&
        !titleContains(titleNorm, modelCore)
      ) {
        return null;
      }
    }
    return {
      brand,
      reference,
      ...(model ? { model } : {}),
    };
  }

  if (category === "luxury_bag") {
    const brand = meta.brand != null ? String(meta.brand) : "";
    const model = meta.model != null ? String(meta.model) : "";
    const size = meta.size != null ? String(meta.size) : "";
    const color = meta.color != null ? String(meta.color) : "";
    if (!titleContains(titleNorm, brand) || !titleContains(titleNorm, model)) {
      return null;
    }
    if (size && !titleContains(titleNorm, size)) return null;
    if (color && !titleContains(titleNorm, color)) return null;
    return {
      brand,
      model,
      ...(size ? { size } : {}),
      ...(color ? { color } : {}),
    };
  }

  if (category === "trading_card") {
    const set = meta.set != null ? String(meta.set) : "";
    const setName = meta.setName != null ? String(meta.setName) : "";
    const number = meta.number != null ? String(meta.number) : "";
    const finish = meta.finish != null ? String(meta.finish) : "normal";
    const lang = meta.lang != null ? String(meta.lang) : "en";
    const game = meta.game != null ? String(meta.game) : undefined;
    const setOk =
      titleContains(titleNorm, setName) ||
      titleContains(titleNorm, set) ||
      (set && titleContains(titleNorm, set.replace(/(\D+)(\d+)/, "$1 $2")));
    const numberOk =
      titleContains(titleNorm, number) ||
      titleContains(titleNorm, `#${number}`) ||
      (set && number
        ? titleContains(titleNorm, `${set}-${number}`)
        : false);
    if (!setOk || !numberOk) return null;
    return {
      set,
      number,
      lang,
      finish,
      ...(game ? { game } : {}),
    };
  }

  return null;
}

/**
 * ebayQuery hint: search query equals seed ebayQuery AND title still has evidence.
 * @param {string} searchQuery
 * @param {object} asset
 * @param {string} title
 */
function candidateFromEbayQuery(searchQuery, asset, title) {
  const ebayQuery =
    asset.meta && asset.meta.ebayQuery != null
      ? String(asset.meta.ebayQuery)
      : "";
  if (!searchQuery || !ebayQuery) return false;
  if (normLoose(searchQuery) !== normLoose(ebayQuery)) return false;
  return listingMetaFromTitleEvidence(title, asset) != null;
}

/**
 * @param {object} asset
 * @param {object} listingMeta
 * @param {string} title
 */
function evaluateExact(asset, listingMeta, title) {
  const meta = asset.meta && typeof asset.meta === "object" ? asset.meta : {};
  const category = String(asset.category || meta.category || "");

  if (category === "watch") {
    return evaluateWatchListingMatch({
      assetMeta: {
        brand: meta.brand != null ? String(meta.brand) : undefined,
        reference: meta.reference != null ? String(meta.reference) : undefined,
        model: meta.model != null ? String(meta.model) : undefined,
      },
      listingMeta,
      listingTitle: title,
    });
  }
  if (category === "luxury_bag") {
    return evaluateBagListingMatch({
      assetMeta: {
        brand: meta.brand != null ? String(meta.brand) : undefined,
        model: meta.model != null ? String(meta.model) : undefined,
        size: meta.size != null ? String(meta.size) : undefined,
        color: meta.color != null ? String(meta.color) : undefined,
      },
      listingMeta,
      listingTitle: title,
    });
  }
  if (category === "trading_card") {
    return evaluateCardListingMatch({
      assetMeta: {
        set: meta.set != null ? String(meta.set) : undefined,
        number: meta.number != null ? String(meta.number) : undefined,
        lang: meta.lang != null ? String(meta.lang) : "en",
        finish: meta.finish != null ? String(meta.finish) : "normal",
        game: meta.game != null ? String(meta.game) : undefined,
        gradeDeclared:
          meta.gradeDeclared != null ? String(meta.gradeDeclared) : undefined,
      },
      listingMeta,
      listingTitle: title,
    });
  }
  return { canAutoPublish: false, identity: { exact: false, fuzzy: false } };
}

/**
 * Build unmatched review-queue evidence (Ops-visible · silent drop 금지).
 * @param {Record<string, unknown>} listing
 * @param {string} reason
 * @param {object} [extra]
 */
function buildUnmatchedEvidence(listing, reason, extra = {}) {
  const searchQuery = extractSearchQuery(listing);
  return {
    id:
      listing.externalItemId != null
        ? `unmatched_${listing.externalItemId}`
        : listing.id != null
          ? `unmatched_${listing.id}`
          : `unmatched_${Date.now()}`,
    adapterId: String(listing.adapterId || "ebay"),
    externalItemId:
      listing.externalItemId != null ? String(listing.externalItemId) : null,
    listingId: listing.id != null ? String(listing.id) : null,
    title: listing.title != null ? String(listing.title) : null,
    searchQuery: searchQuery || null,
    marketId: listing.marketId != null ? String(listing.marketId) : null,
    marketplaceId:
      listing.marketplaceId != null ? String(listing.marketplaceId) : null,
    priceUsdt: listing.priceUsdt != null ? String(listing.priceUsdt) : null,
    currency: listing.currency != null ? String(listing.currency) : null,
    url: listing.url != null ? String(listing.url) : null,
    imageUrl: listing.imageUrl != null ? String(listing.imageUrl) : null,
    observedAt:
      listing.observedAt != null
        ? String(listing.observedAt)
        : new Date().toISOString(),
    reason,
    evidence: {
      queryPlaceholder: String(listing.assetId || "").startsWith("query:"),
      ebayImageHostOk: isEbayImageHost(listing.imageUrl),
      ...extra,
    },
  };
}

/**
 * Resolve ebay ingest listings against Asset Master exact identity.
 * @param {{
 *   listings: unknown[],
 *   masters?: object[],
 *   now?: string,
 * }} input
 */
function resolveEbayIngestListings(input) {
  const masters = Array.isArray(input.masters)
    ? input.masters
    : defaultDay1Masters();
  const mastersById = new Map(masters.map((m) => [m.assetId, m]));
  /** @type {Record<string, unknown>[]} */
  const matched = [];
  /** @type {ReturnType<typeof buildUnmatchedEvidence>[]} */
  const unmatched = [];
  /** @type {Array<{ adapterId: string, category?: string, matched: boolean, reason?: string, gradeMismatch?: boolean, at: string }>} */
  const matchAttempts = [];
  const at = input.now || new Date().toISOString();

  for (const raw of Array.isArray(input.listings) ? input.listings : []) {
    if (!raw || typeof raw !== "object") continue;
    const listing = /** @type {Record<string, unknown>} */ (raw);
    const adapterId = String(listing.adapterId || "ebay");
    if (adapterId !== "ebay") {
      // non-ebay left for normalize/persist path (admin already has real assetId)
      matched.push({ ...listing });
      continue;
    }

    const title = listing.title != null ? String(listing.title) : "";
    const searchQuery = extractSearchQuery(listing);
    const assetIdRaw = String(listing.assetId ?? "");

    // Already resolved real assetId (seed / prior match) — keep if in masters
    if (assetIdRaw && !assetIdRaw.startsWith("query:")) {
      const master = mastersById.get(assetIdRaw);
      if (!master) {
        unmatched.push(
          buildUnmatchedEvidence(listing, "unknown_asset_id", {
            assetId: assetIdRaw,
          }),
        );
        matchAttempts.push({
          adapterId: "ebay",
          matched: false,
          reason: "unknown_asset_id",
          at,
        });
        continue;
      }
      if (!isEbayImageHost(listing.imageUrl)) {
        unmatched.push(
          buildUnmatchedEvidence(listing, "missing_ebay_image_host", {
            assetId: assetIdRaw,
          }),
        );
        matchAttempts.push({
          adapterId: "ebay",
          category: master.category,
          matched: false,
          reason: "missing_ebay_image_host",
          at,
        });
        continue;
      }
      matched.push({
        ...listing,
        assetId: master.assetId,
        imageSource: "ebay",
        identityMatch: "exact",
        matchedAssetLabel: master.assetLabel,
      });
      matchAttempts.push({
        adapterId: "ebay",
        category: master.category,
        matched: true,
        reason: "prebound_asset_id",
        at,
      });
      continue;
    }

    /** @type {Array<{ asset: object, eval: object }>} */
    const hits = [];
    for (const asset of masters) {
      const byQuery = candidateFromEbayQuery(searchQuery, asset, title);
      const listingMeta = listingMetaFromTitleEvidence(title, asset);
      if (!listingMeta && !byQuery) continue;
      const metaForEval =
        listingMeta || listingMetaFromTitleEvidence(title, asset);
      if (!metaForEval) continue;
      const ev = evaluateExact(asset, metaForEval, title);
      if (ev && ev.canAutoPublish === true) {
        hits.push({ asset, eval: ev });
      }
    }

    if (hits.length !== 1) {
      const reason =
        hits.length === 0 ? "no_exact_identity_match" : "ambiguous_exact_match";
      unmatched.push(
        buildUnmatchedEvidence(listing, reason, {
          hitCount: hits.length,
          hitAssetIds: hits.map((h) => h.asset.assetId),
        }),
      );
      matchAttempts.push({
        adapterId: "ebay",
        matched: false,
        reason,
        at,
      });
      continue;
    }

    if (!isEbayImageHost(listing.imageUrl)) {
      unmatched.push(
        buildUnmatchedEvidence(listing, "missing_ebay_image_host", {
          assetId: hits[0].asset.assetId,
        }),
      );
      matchAttempts.push({
        adapterId: "ebay",
        category: hits[0].asset.category,
        matched: false,
        reason: "missing_ebay_image_host",
        at,
      });
      continue;
    }

    const hit = hits[0];
    matched.push({
      ...listing,
      assetId: hit.asset.assetId,
      imageSource: "ebay",
      identityMatch: "exact",
      matchedAssetLabel: hit.asset.assetLabel,
      searchQuery: searchQuery || undefined,
    });
    matchAttempts.push({
      adapterId: "ebay",
      category: hit.asset.category,
      matched: true,
      reason: "exact_identity",
      gradeMismatch: Boolean(hit.eval.gradeMismatch),
      at,
    });
  }

  return {
    matched,
    unmatched,
    matchAttempts,
    stats: {
      input: Array.isArray(input.listings) ? input.listings.length : 0,
      matched: matched.length,
      unmatched: unmatched.length,
    },
  };
}

/**
 * Guard: resolved matched rows must never carry query: assetId.
 * @param {unknown[]} rows
 */
function assertNoQueryAssetIds(rows) {
  for (const raw of Array.isArray(rows) ? rows : []) {
    if (!raw || typeof raw !== "object") continue;
    const assetId = String(/** @type {Record<string, unknown>} */ (raw).assetId ?? "");
    if (!assetId || assetId.startsWith("query:")) {
      throw new Error(`query: assetId forbidden after identity resolve: ${assetId}`);
    }
  }
  return true;
}

module.exports = {
  EBAY_IMAGE_HOST,
  isEbayImageHost,
  extractSearchQuery,
  listingMetaFromTitleEvidence,
  resolveEbayIngestListings,
  buildUnmatchedEvidence,
  assertNoQueryAssetIds,
};
