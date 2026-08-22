/**
 * FASHIONPHILE PUBLIC_JSON observer.
 * DISCOVERY = /products.json (currency evidence 없으면 nativeCurrency 없음)
 * CONFIRMATION = /products/{handle}.json (price_currency 필수)
 * variants[0] 임의 선택 금지 · compare_at_price / Est. Retail fallback 금지
 * US tag / domain으로 USD 추정 금지.
 */

const { parsePublicJson } = require("../extract/public-json.cjs");
const { validateObservation } = require("../validate.cjs");
const { FASHIONPHILE_PARSER_VERSION } = require("../contract.cjs");
const { isObviouslyMalformedAmount } = require("../validate.cjs");

const SOURCE = "fashionphile";
const ACQUISITION_MODE = "PUBLIC_JSON";
const HOST_RE = /(^|\.)fashionphile\.com$/i;

/**
 * @param {string} rawUrl
 * @returns {{ ok: true, kind: "catalog" | "product", handle?: string, url: string } | { ok: false, reason: string }}
 */
function classifyFashionphileUrl(rawUrl) {
  let parsed;
  try {
    parsed = new URL(String(rawUrl || ""));
  } catch {
    return { ok: false, reason: "invalid_url" };
  }
  if (!HOST_RE.test(parsed.hostname)) {
    return { ok: false, reason: "host_not_fashionphile" };
  }
  const path = parsed.pathname.replace(/\/+$/, "") || "/";
  if (path === "/products.json") {
    return { ok: true, kind: "catalog", url: parsed.toString() };
  }
  const m = path.match(/^\/products\/([^/]+)$/);
  if (!m) return { ok: false, reason: "url_not_product" };
  const handle = m[1].replace(/\.json$/i, "");
  if (!handle) return { ok: false, reason: "handle_missing" };
  return { ok: true, kind: "product", handle, url: parsed.toString() };
}

function confirmationJsonUrl(handle) {
  return `https://www.fashionphile.com/products/${handle}.json`;
}

function canonicalProductUrl(handle) {
  return `https://www.fashionphile.com/products/${handle}`;
}

/**
 * @param {unknown[]} variants
 * @param {{ requireCurrency: boolean }} opts
 */
function resolveCurrentVariant(variants, opts) {
  if (!Array.isArray(variants) || variants.length === 0) {
    return { ok: false, sourceStatus: "PARSE_FAILED", reason: "variants_missing" };
  }

  const available = variants.filter((v) => v && typeof v === "object" && v.available !== false);
  if (available.length === 0) {
    return { ok: false, sourceStatus: "OUT_OF_STOCK", reason: "no_available_variant" };
  }

  const mapped = [];
  for (const v of available) {
    if (Object.prototype.hasOwnProperty.call(v, "compare_at_price") && v.price == null) {
      return { ok: false, sourceStatus: "PARSE_FAILED", reason: "compare_at_price_not_current" };
    }
    const price = v.price == null ? null : String(v.price);
    const currency = v.price_currency == null ? null : String(v.price_currency);
    const sku = v.sku == null ? null : String(v.sku);
    if (price == null || price === "") {
      return { ok: false, sourceStatus: "PARSE_FAILED", reason: "variant_price_missing" };
    }
    if (!/^[0-9]+(\.[0-9]+)?$/.test(price) || isObviouslyMalformedAmount(price)) {
      return { ok: false, sourceStatus: "PARSE_FAILED", reason: "variant_price_invalid" };
    }
    if (opts.requireCurrency && (currency == null || currency === "")) {
      return { ok: false, sourceStatus: "PARSE_FAILED", reason: "variant_currency_missing" };
    }
    mapped.push({ variant: v, price, currency, sku });
  }

  if (mapped.length === 1) {
    return { ok: true, ...mapped[0], variantResolution: "exactly_one" };
  }

  const first = mapped[0];
  const same = mapped.every(
    (row) =>
      row.price === first.price &&
      row.currency === first.currency &&
      row.sku === first.sku,
  );
  if (same) {
    return { ok: true, ...first, variantResolution: "identical_multi" };
  }
  return { ok: false, sourceStatus: "AMBIGUOUS", reason: "variant_price_or_identity_differs" };
}

/**
 * @param {object} product
 */
function pickPrimaryImage(product) {
  const images = Array.isArray(product.images) ? product.images : [];
  const positioned = images.find((img) => img && Number(img.position) === 1 && img.src);
  if (positioned && typeof positioned.src === "string") {
    return { url: positioned.src, alt: positioned.alt ?? null, method: "PUBLIC_JSON" };
  }
  if (
    product.image &&
    typeof product.image.src === "string" &&
    (product.image.position == null || Number(product.image.position) === 1)
  ) {
    return { url: product.image.src, alt: product.image.alt ?? null, method: "PUBLIC_JSON" };
  }
  return null;
}

function newId(prefix) {
  return `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;
}

/**
 * 단일 Shopify product 객체 → SourceObservation (purpose-split)
 * @param {object} product
 * @param {{ purpose: "DISCOVERY" | "CONFIRMATION", fetchedAt: string, observedAt: string, requestUrl: string }} ctx
 */
function observationFromProduct(product, ctx) {
  if (!product || typeof product !== "object") {
    return { ok: false, sourceStatus: "PARSE_FAILED", reason: "product_missing" };
  }

  const handle = String(product.handle || "").trim();
  const externalItemId = product.id == null ? "" : String(product.id);
  if (!externalItemId || !handle) {
    return { ok: false, sourceStatus: "PARSE_FAILED", reason: "source_item_id_missing" };
  }

  const title = String(product.title || "").trim();
  if (!title) {
    return { ok: false, sourceStatus: "PARSE_FAILED", reason: "title_missing" };
  }

  const image = pickPrimaryImage(product);
  if (!image) {
    return { ok: false, sourceStatus: "PARSE_FAILED", reason: "primary_image_missing" };
  }

  const requireCurrency = ctx.purpose === "CONFIRMATION";
  const resolved = resolveCurrentVariant(product.variants, { requireCurrency });
  if (!resolved.ok) {
    return {
      ok: false,
      sourceStatus: resolved.sourceStatus,
      reason: resolved.reason,
    };
  }

  // US 태그/도메인으로 currency를 만들지 않는다. price_currency만.
  let nativeCurrency;
  if (resolved.currency) {
    nativeCurrency = resolved.currency;
  }

  const availability =
    resolved.variant.available === false
      ? "out_of_stock"
      : resolved.variant.available === true
        ? "available"
        : "unknown";

  const observation = {
    id: newId("obs"),
    source: SOURCE,
    externalItemId,
    url: canonicalProductUrl(handle),
    title,
    imageUrl: image.url,
    imageAlt: image.alt,
    observedAt: ctx.observedAt,
    fetchedAt: ctx.fetchedAt,
    observationPurpose: ctx.purpose,
    sourceStatus: "SUCCESS",
    parserVersion: FASHIONPHILE_PARSER_VERSION,
    availability,
    displayAuthorized: false,
    meta: {
      priceKind: "listing_sale",
      brand: product.vendor ? String(product.vendor) : undefined,
      sku: resolved.sku || undefined,
      variantResolution: resolved.variantResolution,
      extractionEvidence: {
        sourceItemId: "PUBLIC_JSON",
        title: "PUBLIC_JSON",
        imageUrl: "PUBLIC_JSON",
        nativeAmount: "PUBLIC_JSON",
        url: "URL_PATTERN",
        ...(nativeCurrency ? { nativeCurrency: "PUBLIC_JSON" } : {}),
      },
    },
  };

  if (resolved.price) observation.nativeAmount = resolved.price;
  if (nativeCurrency) observation.nativeCurrency = nativeCurrency;

  if (ctx.purpose === "DISCOVERY") {
    // Discovery는 currency evidence가 없으면 필드를 남기지 않는다.
    if (!nativeCurrency) {
      delete observation.nativeCurrency;
      if (observation.meta.extractionEvidence.nativeCurrency) {
        delete observation.meta.extractionEvidence.nativeCurrency;
      }
    }
  }

  if (ctx.purpose === "CONFIRMATION" && !nativeCurrency) {
    return { ok: false, sourceStatus: "PARSE_FAILED", reason: "currency_evidence_missing" };
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
  return { ok: true, observation: checked.observation };
}

/**
 * @param {{ document: unknown, purpose: "DISCOVERY" | "CONFIRMATION", url: string, fetchedAt?: string, observedAt?: string, handle?: string, externalItemId?: string }} input
 */
function parseFashionphileDocument(input) {
  const parsed = parsePublicJson(input.document);
  if (!parsed.ok) {
    return { ok: false, sourceStatus: "PARSE_FAILED", reason: parsed.reason };
  }
  const now = new Date().toISOString();
  const fetchedAt = input.fetchedAt || now;
  const observedAt = input.observedAt || fetchedAt;
  const purpose = input.purpose;
  const classified = classifyFashionphileUrl(input.url);
  if (!classified.ok) {
    return { ok: false, sourceStatus: "PARSE_FAILED", reason: classified.reason };
  }

  if (purpose === "CONFIRMATION" && classified.kind === "catalog") {
    return {
      ok: false,
      sourceStatus: "PARSE_FAILED",
      reason: "confirmation_requires_product_json",
    };
  }

  const doc = parsed.document;

  if (classified.kind === "catalog" || Array.isArray(doc.products)) {
    const products = Array.isArray(doc.products) ? doc.products : [];
    if (products.length === 0) {
      return { ok: false, sourceStatus: "NOT_FOUND", reason: "catalog_empty" };
    }
    let selected = products;
    if (input.handle) {
      selected = products.filter((p) => p && String(p.handle) === String(input.handle));
    } else if (input.externalItemId) {
      selected = products.filter((p) => p && String(p.id) === String(input.externalItemId));
    }
    if (selected.length === 0) {
      return { ok: false, sourceStatus: "NOT_FOUND", reason: "catalog_item_not_found" };
    }
    const candidates = [];
    for (const product of selected) {
      const row = observationFromProduct(product, {
        purpose,
        fetchedAt,
        observedAt,
        requestUrl: input.url,
      });
      if (!row.ok) {
        candidates.push(row);
      } else {
        candidates.push(row);
      }
    }
    return {
      ok: true,
      kind: "catalog",
      acquisitionMode: ACQUISITION_MODE,
      candidates,
    };
  }

  const product = doc.product && typeof doc.product === "object" ? doc.product : doc;
  const row = observationFromProduct(product, {
    purpose,
    fetchedAt,
    observedAt,
    requestUrl: input.url,
  });
  if (!row.ok) return row;
  return {
    ok: true,
    kind: "product",
    acquisitionMode: ACQUISITION_MODE,
    observation: row.observation,
  };
}

module.exports = {
  SOURCE,
  ACQUISITION_MODE,
  classifyFashionphileUrl,
  confirmationJsonUrl,
  canonicalProductUrl,
  resolveCurrentVariant,
  pickPrimaryImage,
  observationFromProduct,
  parseFashionphileDocument,
};
