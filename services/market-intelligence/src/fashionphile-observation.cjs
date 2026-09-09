/**
 * Engine §0.0.2c — FASHIONPHILE public Shopify products.json → observation.
 * SOURCE_OBSERVATION != LISTING_LEG · persistToListingLeg = false.
 * SSOT extract: governance/global-product/parser-implementation-contract.v1.md §10.2
 */

const crypto = require("crypto");
const { OBSERVATION_SOURCES_ALLOWED } = require("./pipeline.cjs");

const SOURCE = "fashionphile";
const STOREFRONT_ORIGIN = "https://www.fashionphile.com";
const PRODUCTS_JSON_PATH = "/products.json";
const DEFAULT_PAGE_LIMIT = 30;
const CACHE_HINT_SEC = 1800;
const PRICE_KIND = "listing_sale";
const NATIVE_CURRENCY_DEFAULT = "USD";

const BAG_TYPE_RE =
  /handbag|bag|purse|tote|clutch|satchel|shoulder|crossbody|backpack|wallet|leather goods|kelly|birkin|constance/i;

/**
 * @param {string | null | undefined} productType
 * @param {string | null | undefined} title
 */
function isLuxuryBagHint(productType, title) {
  return BAG_TYPE_RE.test(`${productType || ""} ${title || ""}`);
}

/**
 * @param {unknown} product
 * @returns {{ price: string, sku: string, variantId: string | null } | null}
 */
function firstPricedVariant(product) {
  const variants = Array.isArray(product?.variants) ? product.variants : [];
  for (const raw of variants) {
    if (!raw || typeof raw !== "object") continue;
    const price = String(raw.price ?? "").trim();
    if (!/^[0-9]+(\.[0-9]+)?$/.test(price)) continue;
    if (Number(price) <= 0) continue;
    const sku = String(raw.sku ?? raw.id ?? "").trim();
    return {
      price,
      sku,
      variantId: raw.id != null ? String(raw.id) : null,
    };
  }
  return null;
}

/**
 * @param {unknown} product
 * @returns {string}
 */
function primaryProductImage(product) {
  const images = Array.isArray(product?.images) ? product.images : [];
  const first = images[0];
  if (first && typeof first === "object" && first.src) {
    return String(first.src).trim();
  }
  if (product?.image && typeof product.image === "object" && product.image.src) {
    return String(product.image.src).trim();
  }
  return "";
}

/**
 * @param {string[]} parts
 */
function contentFingerprint(parts) {
  return crypto.createHash("sha256").update(parts.join("|")).digest("hex");
}

/**
 * @param {string} handle
 */
function productUrlFromHandle(handle) {
  const h = String(handle || "").trim();
  if (!h) return "";
  return `${STOREFRONT_ORIGIN}/products/${encodeURIComponent(h)}`;
}

/**
 * Shopify products.json → observation rows. Never emits listing-leg rows.
 * @param {{
 *   productsJson?: { products?: unknown[] } | null,
 *   observedAt?: string,
 *   nativeCurrency?: string,
 *   page?: number,
 * }} input
 */
function extractFashionphileProducts(input) {
  const observedAt = String(input?.observedAt || new Date().toISOString());
  const nativeCurrency = String(
    input?.nativeCurrency || NATIVE_CURRENCY_DEFAULT,
  ).trim();
  const products = Array.isArray(input?.productsJson?.products)
    ? input.productsJson.products
    : [];
  const accepted = [];
  const rejected = [];

  for (const raw of products) {
    if (!raw || typeof raw !== "object") {
      rejected.push({ reason: "invalid_product", product: raw });
      continue;
    }
    const shopifyId = raw.id != null ? String(raw.id).trim() : "";
    const handle = String(raw.handle ?? "").trim();
    const title = String(raw.title ?? "").trim();
    const brand = String(raw.vendor ?? "").trim();
    const productType = String(raw.product_type ?? "").trim();
    const variant = firstPricedVariant(raw);
    const imageUrl = primaryProductImage(raw);
    const url = productUrlFromHandle(handle);

    if (!shopifyId || !handle) {
      rejected.push({ reason: "STABLE_PRODUCT_ID", shopifyId, handle, title });
      continue;
    }
    if (!isLuxuryBagHint(productType, title)) {
      rejected.push({
        reason: "SUPPORTED_CATEGORY",
        shopifyId,
        handle,
        productType,
        title,
      });
      continue;
    }
    if (!variant) {
      rejected.push({ reason: "VALID_CURRENT_PRICE", shopifyId, handle, title });
      continue;
    }
    if (!imageUrl) {
      rejected.push({ reason: "VALID_IMAGE", shopifyId, handle, title });
      continue;
    }
    if (!url) {
      rejected.push({ reason: "VALID_URL", shopifyId, handle, title });
      continue;
    }

    const externalItemId = [shopifyId, handle, variant.sku || shopifyId].join(
      ":",
    );
    const fingerprint = contentFingerprint([
      SOURCE,
      externalItemId,
      variant.price,
      nativeCurrency,
      imageUrl,
      url,
    ]);
    accepted.push({
      source: SOURCE,
      externalItemId,
      url,
      imageUrl,
      nativeAmount: variant.price,
      nativeCurrency,
      title,
      observedAt,
      staleAt: new Date(
        Date.parse(observedAt) + CACHE_HINT_SEC * 1000,
      ).toISOString(),
      persistToListingLeg: false,
      adapterId: SOURCE,
      meta: {
        priceKind: PRICE_KIND,
        brand,
        sku: variant.sku,
        handle,
        shopifyId,
        variantId: variant.variantId,
        categoryHint: "luxury_bag",
        productType,
      },
      contentFingerprint: fingerprint,
    });
  }

  return {
    source: SOURCE,
    persistToListingLeg: false,
    listingRows: [],
    pageLimit: DEFAULT_PAGE_LIMIT,
    accepted,
    rejected,
  };
}

/**
 * Ingest observation → durable source_observations row. Fail-closed.
 * @param {Record<string, unknown>} obs
 */
function normalizeWebObservationForPersist(obs) {
  if (!obs || typeof obs !== "object") {
    return { ok: false, reason: "invalid_observation" };
  }
  const source = String(obs.source ?? "").trim();
  if (!OBSERVATION_SOURCES_ALLOWED.includes(source)) {
    return { ok: false, reason: `source_not_allowed:${source}` };
  }
  const externalItemId = String(obs.externalItemId ?? "").trim();
  const url = String(obs.url ?? "").trim();
  const imageUrl = String(obs.imageUrl ?? "").trim();
  const nativeAmount = String(obs.nativeAmount ?? "").trim();
  const nativeCurrency = String(obs.nativeCurrency ?? "").trim();
  const observedAt = String(obs.observedAt ?? "").trim();
  const title = String(obs.title ?? "").trim();
  if (!externalItemId) return { ok: false, reason: "STABLE_PRODUCT_ID" };
  if (!url) return { ok: false, reason: "VALID_URL" };
  if (!imageUrl) return { ok: false, reason: "VALID_IMAGE" };
  if (!/^[0-9]+(\.[0-9]+)?$/.test(nativeAmount) || Number(nativeAmount) <= 0) {
    return { ok: false, reason: "VALID_CURRENT_PRICE" };
  }
  if (!nativeCurrency) return { ok: false, reason: "VALID_CURRENCY" };
  if (!observedAt) return { ok: false, reason: "observedAt" };
  const meta =
    obs.meta && typeof obs.meta === "object"
      ? /** @type {Record<string, unknown>} */ (obs.meta)
      : {};
  const priceKind = String(meta.priceKind ?? "").trim();
  if (source === SOURCE && priceKind !== PRICE_KIND) {
    return { ok: false, reason: "PRICE_KIND_ALLOWED" };
  }
  const fingerprint =
    typeof obs.contentFingerprint === "string" && obs.contentFingerprint
      ? obs.contentFingerprint
      : contentFingerprint([
          source,
          externalItemId,
          nativeAmount,
          nativeCurrency,
          imageUrl,
          url,
        ]);
  const observationId = `sob_${source}_${externalItemId}_${observedAt}`.replace(
    /[^a-zA-Z0-9:_-]/g,
    "_",
  );
  return {
    ok: true,
    row: {
      id: observationId,
      source,
      external_item_id: externalItemId,
      observation_purpose: "DISCOVERY",
      source_status: "SUCCESS",
      url,
      observed_at: observedAt,
      payload: {
        source,
        externalItemId,
        url,
        imageUrl,
        nativeAmount,
        nativeCurrency,
        title,
        observedAt,
        staleAt: obs.staleAt ?? null,
        persistToListingLeg: false,
        meta,
        contentFingerprint: fingerprint,
      },
      content_fingerprint: fingerprint,
    },
  };
}

function fashionphileProductsJsonUrl(page = 1) {
  const p = Number.isFinite(page) && page >= 1 ? Math.floor(page) : 1;
  return `${STOREFRONT_ORIGIN}${PRODUCTS_JSON_PATH}?limit=${DEFAULT_PAGE_LIMIT}&page=${p}`;
}

const FASHIONPHILE_COLLECTION_HANDLES = Object.freeze([
  "handbags",
  "hermes",
  "chanel",
  "louis-vuitton",
]);
const FASHIONPHILE_PAGES_PER_COLLECTION = 2;

function isFashionphileProductsUrl(url) {
  try {
    const parsed = new URL(String(url || "").trim());
    if (parsed.protocol !== "https:") return false;
    if (parsed.hostname !== "www.fashionphile.com") return false;
    if (parsed.pathname === "/products.json") return true;
    const match = parsed.pathname.match(
      /^\/collections\/([a-z0-9-]+)\/products\.json$/,
    );
    if (!match) return false;
    return FASHIONPHILE_COLLECTION_HANDLES.includes(match[1]);
  } catch {
    return false;
  }
}

function fashionphileCatalogUrls(pages = FASHIONPHILE_PAGES_PER_COLLECTION) {
  const n =
    Number.isFinite(pages) && pages >= 1 ? Math.min(Math.floor(pages), 4) : 2;
  /** @type {string[]} */
  const urls = [];
  for (const handle of FASHIONPHILE_COLLECTION_HANDLES) {
    for (let page = 1; page <= n; page += 1) {
      urls.push(
        `${STOREFRONT_ORIGIN}/collections/${handle}/products.json?limit=${DEFAULT_PAGE_LIMIT}&page=${page}`,
      );
    }
  }
  return urls;
}

/**
 * Public storefront JSON only. 403 = ACCESS_BLOCKED · 우회 0.
 * @param {string} url
 */
async function fetchFashionphileProductsJson(url) {
  if (!isFashionphileProductsUrl(url)) {
    return {
      ok: false,
      error: "FASHIONPHILE_HOST_NOT_ALLOWED",
      productsJson: null,
    };
  }
  try {
    const res = await fetch(url, {
      method: "GET",
      headers: { accept: "application/json" },
      signal: AbortSignal.timeout(12_000),
    });
    if (res.status === 403 || res.status === 401) {
      return {
        ok: false,
        error: `ACCESS_BLOCKED:${res.status}`,
        productsJson: null,
      };
    }
    if (!res.ok) {
      return {
        ok: false,
        error: `HTTP_${res.status}`,
        productsJson: null,
      };
    }
    const json = await res.json();
    if (!json || !Array.isArray(json.products)) {
      return {
        ok: false,
        error: "malformed_products_json",
        productsJson: null,
      };
    }
    return { ok: true, error: null, productsJson: json };
  } catch (err) {
    return {
      ok: false,
      error: err instanceof Error ? err.message.slice(0, 160) : "fetch_failed",
      productsJson: null,
    };
  }
}

/**
 * Allowlisted collection pages → observation extract. Listing-leg 0.
 * @param {{ pages?: number, observedAt?: string }} [input]
 */
async function fetchFashionphileObservationCatalog(input) {
  const urls = fashionphileCatalogUrls(input?.pages);
  const byId = new Map();
  /** @type {string[]} */
  const fetchErrors = [];
  for (const url of urls) {
    const fetched = await fetchFashionphileProductsJson(url);
    if (fetched.error) fetchErrors.push(`${fetched.error}`);
    const products = fetched.productsJson?.products;
    if (!Array.isArray(products)) continue;
    for (const product of products) {
      if (!product || typeof product !== "object" || product.id == null) continue;
      byId.set(String(product.id), product);
    }
  }
  const observedAt = String(input?.observedAt || new Date().toISOString());
  const extracted = extractFashionphileProducts({
    productsJson: { products: [...byId.values()] },
    observedAt,
  });
  return {
    ...extracted,
    fetchErrors,
    sourcePages: urls.length,
    rawProducts: byId.size,
  };
}

module.exports = {
  FASHIONPHILE_SOURCE: SOURCE,
  FASHIONPHILE_STOREFRONT_ORIGIN: STOREFRONT_ORIGIN,
  FASHIONPHILE_CACHE_HINT_SEC: CACHE_HINT_SEC,
  FASHIONPHILE_PRICE_KIND: PRICE_KIND,
  FASHIONPHILE_PAGE_LIMIT: DEFAULT_PAGE_LIMIT,
  FASHIONPHILE_COLLECTION_HANDLES,
  FASHIONPHILE_PAGES_PER_COLLECTION,
  isLuxuryBagHint,
  isFashionphileProductsUrl,
  extractFashionphileProducts,
  normalizeWebObservationForPersist,
  fashionphileProductsJsonUrl,
  fashionphileCatalogUrls,
  fetchFashionphileProductsJson,
  fetchFashionphileObservationCatalog,
};
