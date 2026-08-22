/**
 * eBay Browse API SourceObservation normalizer.
 * DISCOVERY candidate != CONFIRMED_MARKET_TRUTH.
 * V1 Confirmation: FIXED_PRICE present AND AUCTION absent.
 * item.image.imageUrl only. displayAuthorized = false.
 */

const { validateObservation, isObviouslyMalformedAmount } = require("../validate.cjs");
const { EBAY_PARSER_VERSION, NATIVE_CURRENCIES } = require("../contract.cjs");

const SOURCE = "ebay";
const ACQUISITION_MODE = "API";
const AMOUNT_RE = /^[0-9]+(\.[0-9]+)?$/;
const ASPECT_ALLOW = Object.freeze({
  Model: "model",
  Size: "size",
  Color: "color",
  Colour: "color",
  Style: "style",
  Type: "type",
});

/** Official eBay marketplace site currency — FX 계산이 아님. */
const MARKETPLACE_CURRENCY = Object.freeze({
  EBAY_US: "USD",
  EBAY_GB: "GBP",
  EBAY_DE: "EUR",
  EBAY_AU: "AUD",
});

function newId(prefix) {
  return `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;
}

function asString(value) {
  if (value == null) return "";
  return String(value).trim();
}

function buyingOptionsOf(item) {
  return Array.isArray(item && item.buyingOptions)
    ? item.buyingOptions.map((v) => String(v))
    : [];
}

function isFixedPriceCandidate(options) {
  return options.includes("FIXED_PRICE") && !options.includes("AUCTION");
}

function aspectMap(item) {
  const out = {};
  const rows = Array.isArray(item && item.localizedAspects) ? item.localizedAspects : [];
  for (const row of rows) {
    if (!row || typeof row !== "object") continue;
    const name = asString(row.name);
    const value = asString(row.value);
    const key = ASPECT_ALLOW[name];
    if (!key || !value) continue;
    if (!out[key]) out[key] = value;
  }
  return out;
}

function readConvertedFrom(price) {
  if (!price || typeof price !== "object") return null;
  const amount = asString(price.convertedFromValue);
  const currency = asString(price.convertedFromCurrency);
  if (!amount || !currency) return null;
  return { amount, currency };
}

function amountOk(raw) {
  if (!AMOUNT_RE.test(raw) || isObviouslyMalformedAmount(raw)) return false;
  const n = Number(raw);
  return Number.isFinite(n) && n > 0;
}

function currencyOk(code) {
  return NATIVE_CURRENCIES.includes(code);
}

/**
 * convertedFrom* 없으면 OBSERVED_API_PRICE.
 * NATIVE_CURRENCIES 소속만으로 native_proven 금지.
 */
function resolvePrice(item, requestContext) {
  const price = item && item.price;
  if (!price || price.value == null || price.value === "") {
    return { ok: false, reason: "price_missing" };
  }
  const observedAmount = asString(price.value);
  const observedCurrency = asString(price.currency);
  if (!amountOk(observedAmount)) return { ok: false, reason: "price_malformed" };
  if (!observedCurrency) return { ok: false, reason: "price_currency_missing" };
  if (!currencyOk(observedCurrency) && !readConvertedFrom(price)) {
    return { ok: false, reason: "unsupported_currency" };
  }

  const converted = readConvertedFrom(price);
  if (converted) {
    if (!amountOk(converted.amount)) return { ok: false, reason: "price_malformed" };
    if (!currencyOk(converted.currency)) return { ok: false, reason: "unsupported_currency" };
    return {
      ok: true,
      nativeAmount: converted.amount,
      nativeCurrency: converted.currency,
      localizedAmount: observedAmount,
      localizedCurrency: currencyOk(observedCurrency) ? observedCurrency : null,
      priceSemantics: "native_proven",
    };
  }

  const listingMarketplaceId = asString(item.listingMarketplaceId);
  const requestMarketplaceId = asString(requestContext && requestContext.marketplaceId);
  const official = listingMarketplaceId ? MARKETPLACE_CURRENCY[listingMarketplaceId] : null;
  const marketplaceMatch =
    listingMarketplaceId &&
    requestMarketplaceId &&
    listingMarketplaceId === requestMarketplaceId &&
    official &&
    official === observedCurrency &&
    currencyOk(observedCurrency);

  if (!marketplaceMatch) {
    return {
      ok: false,
      reason: "native_unproven",
      observedAmount,
      observedCurrency: currencyOk(observedCurrency) ? observedCurrency : null,
    };
  }

  return {
    ok: true,
    nativeAmount: observedAmount,
    nativeCurrency: observedCurrency,
    priceSemantics: "native_proven",
  };
}

function availabilityOf(item, nowMs) {
  const endRaw = asString(item && item.itemEndDate);
  if (endRaw) {
    const end = Date.parse(endRaw);
    if (Number.isFinite(end) && end < nowMs) {
      return { sourceStatus: "UNAVAILABLE", availability: "unavailable", reason: "item_ended" };
    }
  }
  const rows = Array.isArray(item && item.estimatedAvailabilities)
    ? item.estimatedAvailabilities
    : [];
  const statuses = rows
    .map((row) => (row && row.estimatedAvailabilityStatus ? String(row.estimatedAvailabilityStatus) : ""))
    .filter(Boolean);
  if (statuses.includes("OUT_OF_STOCK")) {
    return { sourceStatus: "OUT_OF_STOCK", availability: "out_of_stock" };
  }
  if (statuses.includes("IN_STOCK") || statuses.includes("LIMITED_STOCK")) {
    return { availability: "available" };
  }
  return { sourceStatus: "AMBIGUOUS", availability: "unknown", reason: "availability_unknown" };
}

function listingImageUrl(item) {
  const url = item && item.image && item.image.imageUrl;
  return typeof url === "string" && url.trim() ? url.trim() : "";
}

function buildIdentity(item, marketplaceId) {
  const aspects = aspectMap(item);
  const brand = asString(item.brand);
  const mpn = asString(item.mpn);
  const gtin = asString(item.gtin);
  const epid = asString(item.epid);
  const condition = asString(item.condition);
  const model = aspects.model || "";
  const size = aspects.size || "";
  const identityHints = {};
  if (asString(item.legacyItemId)) identityHints.legacyItemId = asString(item.legacyItemId);
  if (gtin) identityHints.gtin = gtin;
  if (epid) identityHints.epid = epid;
  if (asString(item.inferredEpid)) identityHints.inferredEpid = asString(item.inferredEpid);
  if (asString(item.categoryId)) identityHints.categoryId = asString(item.categoryId);
  if (asString(item.categoryPath)) identityHints.categoryPath = asString(item.categoryPath);
  if (aspects.color) identityHints.color = aspects.color;
  if (aspects.style) identityHints.style = aspects.style;
  if (aspects.type) identityHints.type = aspects.type;
  if (marketplaceId) {
    identityHints.marketplaceId = marketplaceId;
    const itemId = asString(item.itemId);
    if (itemId) identityHints.listingLegIdHint = `lst_ebay_${marketplaceId}_${itemId}`;
  }
  const extra = Array.isArray(item.additionalImages) ? item.additionalImages.length : 0;
  if (extra > 0) identityHints.additionalImageCount = String(extra);
  return { brand, mpn, gtin, epid, condition, model, size, identityHints };
}

/**
 * @param {{
 *   item: object,
 *   purpose: "DISCOVERY" | "CONFIRMATION",
 *   observedAt?: string,
 *   fetchedAt?: string,
 *   requestContext?: { marketplaceId?: string },
 * }} input
 */
function parseEbayBrowseItem(input) {
  const item = input && input.item;
  if (!item || typeof item !== "object") {
    return { ok: false, sourceStatus: "PARSE_FAILED", reason: "item_missing" };
  }
  const purpose = input.purpose === "DISCOVERY" ? "DISCOVERY" : "CONFIRMATION";
  const now = new Date();
  const fetchedAt = input.fetchedAt || now.toISOString();
  const observedAt = input.observedAt || fetchedAt;
  const marketplaceId = asString(input.requestContext && input.requestContext.marketplaceId);

  const externalItemId = asString(item.itemId);
  if (!externalItemId) {
    return { ok: false, sourceStatus: "PARSE_FAILED", reason: "item_id_missing" };
  }
  const title = asString(item.title);
  if (!title) return { ok: false, sourceStatus: "PARSE_FAILED", reason: "title_missing" };
  const url = asString(item.itemWebUrl);
  if (!url) return { ok: false, sourceStatus: "PARSE_FAILED", reason: "item_web_url_missing" };
  const imageUrl = listingImageUrl(item);
  if (!imageUrl) return { ok: false, sourceStatus: "PARSE_FAILED", reason: "primary_image_missing" };

  const options = buyingOptionsOf(item);
  if (purpose === "CONFIRMATION") {
    if (options.includes("AUCTION") || !options.includes("FIXED_PRICE")) {
      return {
        ok: false,
        sourceStatus: "AMBIGUOUS",
        reason: "unsupported_buying_option",
        buyingOptions: options,
      };
    }
  } else if (options.length > 0 && !isFixedPriceCandidate(options)) {
    return {
      ok: false,
      sourceStatus: "AMBIGUOUS",
      reason: "unsupported_buying_option",
      buyingOptions: options,
    };
  }

  const avail = availabilityOf(item, Date.parse(observedAt) || now.getTime());
  if (purpose === "CONFIRMATION" && avail.sourceStatus === "UNAVAILABLE") {
    return { ok: false, sourceStatus: "UNAVAILABLE", reason: avail.reason };
  }
  if (purpose === "CONFIRMATION" && avail.sourceStatus === "OUT_OF_STOCK") {
    return { ok: false, sourceStatus: "OUT_OF_STOCK", reason: "out_of_stock" };
  }
  if (purpose === "CONFIRMATION" && avail.sourceStatus === "AMBIGUOUS") {
    return { ok: false, sourceStatus: "AMBIGUOUS", reason: avail.reason };
  }

  const priced = resolvePrice(item, { marketplaceId });
  if (purpose === "CONFIRMATION") {
    if (!priced.ok) {
      return {
        ok: false,
        sourceStatus: priced.reason === "native_unproven" ? "AMBIGUOUS" : "PARSE_FAILED",
        reason: priced.reason,
      };
    }
  }

  const identity = buildIdentity(item, marketplaceId);
  const observation = {
    id: newId("obs"),
    source: SOURCE,
    externalItemId,
    url,
    title,
    imageUrl,
    imageAlt: null,
    observedAt,
    fetchedAt,
    observationPurpose: purpose,
    sourceStatus: "SUCCESS",
    parserVersion: EBAY_PARSER_VERSION,
    availability: avail.availability || "unknown",
    displayAuthorized: false,
    meta: {
      extractionEvidence: {
        sourceItemId: "EXISTING_API",
        title: "EXISTING_API",
        imageUrl: "EXISTING_API",
        url: "EXISTING_API",
      },
      identityHints: identity.identityHints,
    },
  };

  if (identity.brand) observation.meta.brand = identity.brand;
  if (identity.model) observation.meta.model = identity.model;
  if (identity.mpn) observation.meta.modelNumber = identity.mpn;
  if (identity.condition) observation.meta.condition = identity.condition;
  if (identity.size) observation.meta.size = identity.size;
  if (asString(item.categoryPath)) observation.meta.categoryHint = asString(item.categoryPath);

  if (priced.ok) {
    observation.nativeAmount = priced.nativeAmount;
    observation.nativeCurrency = priced.nativeCurrency;
    observation.meta.priceKind = "listing_sale";
    observation.meta.priceSemantics = priced.priceSemantics;
    observation.meta.extractionEvidence.nativeAmount = "EXISTING_API";
    observation.meta.extractionEvidence.nativeCurrency = "EXISTING_API";
    if (priced.localizedAmount) observation.meta.localizedAmount = priced.localizedAmount;
    if (priced.localizedCurrency) observation.meta.localizedCurrency = priced.localizedCurrency;
  }

  const checked = validateObservation(observation);
  if (!checked.ok) {
    return {
      ok: false,
      sourceStatus: checked.sourceStatus,
      reason: checked.reason,
      failures: checked.failures,
    };
  }
  return {
    ok: true,
    kind: "product",
    acquisitionMode: ACQUISITION_MODE,
    observation: checked.observation,
  };
}

function locateEbayItem(input) {
  const externalItemId = asString(input && input.externalItemId);
  if (externalItemId.startsWith("v1|")) {
    return { ok: true, kind: "itemId", itemId: externalItemId };
  }
  const rawUrl = asString(input && input.url);
  if (rawUrl) {
    try {
      const parsed = new URL(rawUrl);
      if (/api\.ebay\.com$/i.test(parsed.hostname) && /\/buy\/browse\/v1\/item\//.test(parsed.pathname)) {
        const rest = decodeURIComponent(parsed.pathname.split("/item/")[1] || "").split("/")[0];
        if (rest && rest !== "get_item_by_legacy_id") {
          return { ok: true, kind: "itemId", itemId: rest };
        }
      }
      if (/(^|\.)ebay\./i.test(parsed.hostname)) {
        const m = parsed.pathname.match(/\/itm\/(?:[^/]+\/)?(\d{6,})/i);
        if (m) return { ok: true, kind: "legacyId", legacyItemId: m[1] };
      }
    } catch {
      return { ok: false, reason: "invalid_url" };
    }
  }
  if (/^\d{6,}$/.test(externalItemId)) {
    return { ok: true, kind: "legacyId", legacyItemId: externalItemId };
  }
  return { ok: false, reason: "ebay_item_locator_missing" };
}

module.exports = {
  SOURCE,
  ACQUISITION_MODE,
  MARKETPLACE_CURRENCY,
  parseEbayBrowseItem,
  locateEbayItem,
  isFixedPriceCandidate,
  buyingOptionsOf,
};
