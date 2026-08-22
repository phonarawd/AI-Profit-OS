/**
 * Chrono24 Confirmation parser — generic product HTML.
 * SOURCE_NATIVE_LISTING_PRICE != LOCALIZED_VIEWER_DISPLAY_PRICE
 * JSON-LD Product 1차 · DOM corroboration · analytics watchPrice 현재가 금지
 * native 미해결이면 CONFIRMATION SUCCESS 금지 (AMBIGUOUS).
 * HTTP-only acquire. Browser fallback 0. Discovery search parser 0.
 */

const { extractLdJsonBlocks, collectProducts } = require("../extract/json-ld.cjs");
const { detectAccessBlock } = require("../extract/access-block.cjs");
const { validateObservation, isObviouslyMalformedAmount } = require("../validate.cjs");
const { CHRONO24_PARSER_VERSION, NATIVE_CURRENCIES } = require("../contract.cjs");

const SOURCE = "chrono24";
const PARSER_VERSION = CHRONO24_PARSER_VERSION;
const HOST_RE = /(^|\.)chrono24\.com$/i;
const LISTING_ID_RE = /--id(\d+)\.htm/i;
const IMAGE_HOST_RE = /^https?:\/\/img\.chrono24\.com\/images\/uhren\//i;
const LOGO_HOST_RE = /static\.chrono24\.com/i;
const AMOUNT_RE = /^[0-9]+(\.[0-9]+)?$/;

const BASIC_INFO_LABELS = Object.freeze({
  price: ["price"],
  listingCode: ["listing code"],
  brand: ["brand"],
  collection: ["collection"],
  model: ["model"],
  reference: ["reference number", "reference"],
  movement: ["movement"],
  caseMaterial: ["case material"],
  year: ["year of production", "year"],
  condition: ["condition"],
  scopeOfDelivery: ["scope of delivery"],
  availability: ["availability"],
  caseDiameter: ["case diameter"],
  dial: ["dial"],
});

function newId(prefix) {
  return `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;
}

function classifyChrono24Url(rawUrl) {
  let parsed;
  try {
    parsed = new URL(String(rawUrl || ""));
  } catch {
    return { ok: false, reason: "invalid_url" };
  }
  if (!HOST_RE.test(parsed.hostname)) {
    return { ok: false, reason: "host_not_chrono24" };
  }
  const path = parsed.pathname || "/";
  const listing = path.match(LISTING_ID_RE);
  if (listing) {
    return {
      ok: true,
      kind: "listing",
      externalItemId: listing[1],
      url: parsed.toString(),
    };
  }
  if (
    /\/search\//i.test(path) ||
    /\/index\.htm$/i.test(path) ||
    /\/ref-[^/]+\.htm$/i.test(path)
  ) {
    return { ok: true, kind: "discovery_surface", url: parsed.toString() };
  }
  return { ok: false, reason: "url_not_listing" };
}

function stripTags(html) {
  return String(html || "")
    .replace(/<script\b[\s\S]*?<\/script>/gi, " ")
    .replace(/<style\b[\s\S]*?<\/style>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/\s+/g, " ")
    .trim();
}

function extractBasicInfo(html) {
  const rows = {};
  const re =
    /<(?:th|td|dt)\b[^>]*>([\s\S]*?)<\/(?:th|td|dt)>\s*<(?:td|dd)\b[^>]*>([\s\S]*?)<\/(?:td|dd)>/gi;
  let m;
  while ((m = re.exec(html))) {
    const label = stripTags(m[1]).toLowerCase();
    const value = stripTags(m[2]);
    if (!label || !value) continue;
    for (const [key, aliases] of Object.entries(BASIC_INFO_LABELS)) {
      if (rows[key]) continue;
      if (aliases.some((alias) => label === alias || label.startsWith(`${alias} `))) {
        rows[key] = value;
      }
    }
  }
  return rows;
}

function brandName(product) {
  const brand = product && product.brand;
  if (brand == null) return "";
  if (typeof brand === "string") return brand.trim();
  if (typeof brand === "object" && brand.name) return String(brand.name).trim();
  return "";
}

function offerNode(product) {
  const offers = product && product.offers;
  if (!offers) return null;
  if (Array.isArray(offers)) return offers[0] && typeof offers[0] === "object" ? offers[0] : null;
  return typeof offers === "object" ? offers : null;
}

function pickPrimaryImage(product) {
  const raw = product && product.image;
  const list = Array.isArray(raw) ? raw : raw == null ? [] : [raw];
  const urls = [];
  for (const item of list) {
    if (typeof item === "string") urls.push(item.trim());
    else if (item && typeof item === "object") {
      const u = item.contentUrl || item.url;
      if (typeof u === "string") urls.push(u.trim());
    }
  }
  const productImage = urls.find((u) => IMAGE_HOST_RE.test(u) && !LOGO_HOST_RE.test(u));
  if (productImage) return { url: productImage, method: "STRUCTURED_DATA" };
  return null;
}

function normalizeAmount(raw) {
  if (raw == null || raw === "") return null;
  const s = String(raw).replace(/,/g, "").trim();
  if (!AMOUNT_RE.test(s) || isObviouslyMalformedAmount(s)) return null;
  return s;
}

function extractSymbolAmounts(text) {
  const src = String(text || "");
  const found = [];
  const tagged = [
    { re: /S\$\s*([0-9][0-9,]*(?:\.[0-9]+)?)/g, currency: "SGD" },
    { re: /US\$\s*([0-9][0-9,]*(?:\.[0-9]+)?)/g, currency: "USD" },
    { re: /A\$\s*([0-9][0-9,]*(?:\.[0-9]+)?)/g, currency: "AUD" },
    { re: /€\s*([0-9][0-9,]*(?:\.[0-9]+)?)/g, currency: "EUR" },
    { re: /£\s*([0-9][0-9,]*(?:\.[0-9]+)?)/g, currency: "GBP" },
    { re: /\bSGD\s*([0-9][0-9,]*(?:\.[0-9]+)?)/gi, currency: "SGD" },
    { re: /\bUSD\s*([0-9][0-9,]*(?:\.[0-9]+)?)/gi, currency: "USD" },
    { re: /\bEUR\s*([0-9][0-9,]*(?:\.[0-9]+)?)/gi, currency: "EUR" },
    { re: /\bGBP\s*([0-9][0-9,]*(?:\.[0-9]+)?)/gi, currency: "GBP" },
  ];
  for (const rule of tagged) {
    rule.re.lastIndex = 0;
    let m;
    while ((m = rule.re.exec(src))) {
      const amount = normalizeAmount(m[1]);
      if (amount) found.push({ amount, currency: rule.currency, owner: "DOM" });
    }
  }
  const bareRe = /(?<![A-Za-z])\$(?!\$)\s*([0-9][0-9,]*(?:\.[0-9]+)?)/g;
  let m;
  while ((m = bareRe.exec(src))) {
    const amount = normalizeAmount(m[1]);
    if (!amount) continue;
    const already = found.some((row) => row.amount === amount);
    if (!already) found.push({ amount, currency: null, owner: "DOM" });
  }
  return found;
}

function analyticsWatchPrices(html) {
  const out = [];
  const re = /watchPrice["'\s:=]+([0-9]+(?:\.[0-9]+)?)/g;
  let m;
  while ((m = re.exec(String(html || "")))) {
    const amount = normalizeAmount(m[1]);
    if (amount) out.push(amount);
  }
  return out;
}

function mapAvailability(raw) {
  const s = String(raw || "");
  if (/OutOfStock|SoldOut/i.test(s)) return "out_of_stock";
  if (/InStock/i.test(s)) return "available";
  if (/Discontinued|Unavailable/i.test(s)) return "unavailable";
  return "unknown";
}

function mapCondition(raw) {
  const s = String(raw || "").trim();
  if (!s) return "";
  const leaf = s.split("/").pop() || s;
  return leaf.replace(/Condition$/i, "") || leaf;
}

function resolveProduct(products) {
  if (!Array.isArray(products) || products.length === 0) {
    return { ok: false, sourceStatus: "PARSE_FAILED", reason: "product_jsonld_missing" };
  }
  const ids = products
    .map((p) => (p && p.productID != null ? String(p.productID).trim() : ""))
    .filter(Boolean);
  const unique = [...new Set(ids)];
  if (products.length > 1 && unique.length > 1) {
    return { ok: false, sourceStatus: "PARSE_FAILED", reason: "conflicting_product_nodes" };
  }
  const withId = products.find((p) => p && p.productID != null && String(p.productID).trim() !== "");
  return { ok: true, product: withId || products[0] };
}

function resolvePriceSemantics({ offer, basicInfo, html }) {
  const localizedAmount = normalizeAmount(offer && offer.price);
  const localizedCurrency =
    offer && offer.priceCurrency ? String(offer.priceCurrency).trim().toUpperCase() : "";
  const watchPrices = analyticsWatchPrices(html);
  if (localizedAmount && watchPrices.includes(localizedAmount)) {
    return { ok: false, sourceStatus: "PARSE_FAILED", reason: "analytics_watchprice_not_current" };
  }

  const domCandidates = extractSymbolAmounts(basicInfo.price || "");
  const distinctAmounts = new Set();
  if (localizedAmount) distinctAmounts.add(localizedAmount);
  for (const row of domCandidates) distinctAmounts.add(row.amount);

  if (!localizedAmount || !localizedCurrency) {
    return { ok: false, sourceStatus: "PARSE_FAILED", reason: "current_price_semantics_unclear" };
  }
  if (!NATIVE_CURRENCIES.includes(localizedCurrency)) {
    return { ok: false, sourceStatus: "PARSE_FAILED", reason: "currency_evidence_missing" };
  }

  return {
    ok: true,
    localizedAmount,
    localizedCurrency,
    distinctAmountCount: distinctAmounts.size,
    priceSemantics: "native_unresolved",
    confirmationMarketTruth: "BLOCKED_NATIVE_PRICE",
  };
}

/**
 * @param {{ html: string, url: string, purpose: "DISCOVERY" | "CONFIRMATION", fetchedAt?: string, observedAt?: string }} input
 */
function parseChrono24ProductDocument(input) {
  const html = input && input.html != null ? String(input.html) : "";
  const blocked = detectAccessBlock({ status: 200, body: html });
  if (blocked.blocked) {
    return { ok: false, sourceStatus: "ACCESS_BLOCKED", reason: blocked.reason };
  }

  const classified = classifyChrono24Url(input.url);
  if (!classified.ok) {
    return { ok: false, sourceStatus: "PARSE_FAILED", reason: classified.reason };
  }
  if (classified.kind === "discovery_surface") {
    return {
      ok: false,
      sourceStatus: "PARSE_FAILED",
      reason: "DISCOVERY_RUNTIME_NOT_IMPLEMENTED",
    };
  }

  const ld = extractLdJsonBlocks(html);
  if (!ld.ok) {
    return { ok: false, sourceStatus: "PARSE_FAILED", reason: ld.reason };
  }
  const resolved = resolveProduct(collectProducts(ld.blocks));
  if (!resolved.ok) return resolved;

  const product = resolved.product;
  const productId = product.productID == null ? "" : String(product.productID).trim();
  if (!productId) {
    return { ok: false, sourceStatus: "PARSE_FAILED", reason: "product_id_missing" };
  }
  if (classified.externalItemId && classified.externalItemId !== productId) {
    return { ok: false, sourceStatus: "PARSE_FAILED", reason: "conflicting_id" };
  }

  const title = String(product.name || "").trim();
  if (!title) {
    return { ok: false, sourceStatus: "PARSE_FAILED", reason: "title_missing" };
  }

  const image = pickPrimaryImage(product);
  if (!image) {
    return { ok: false, sourceStatus: "PARSE_FAILED", reason: "primary_image_missing" };
  }

  const offer = offerNode(product);
  const basicInfo = extractBasicInfo(html);
  const prices = resolvePriceSemantics({ offer, basicInfo, html });
  if (!prices.ok) return prices;

  const now = new Date().toISOString();
  const fetchedAt = input.fetchedAt || now;
  const observedAt = input.observedAt || fetchedAt;
  const purpose = input.purpose || "CONFIRMATION";
  const canonicalUrl = offer && typeof offer.url === "string" && offer.url.trim()
    ? offer.url.trim()
    : classified.url;

  const identityHints = {};
  if (product.productionDate) identityHints.year = String(product.productionDate);
  if (basicInfo.year) identityHints.year = identityHints.year || basicInfo.year;
  if (basicInfo.listingCode) identityHints.listingCode = basicInfo.listingCode;
  if (basicInfo.dial) identityHints.dial = basicInfo.dial;
  if (basicInfo.scopeOfDelivery) identityHints.scopeOfDelivery = basicInfo.scopeOfDelivery;
  if (basicInfo.movement) identityHints.movement = basicInfo.movement;
  if (basicInfo.caseMaterial) identityHints.caseMaterial = basicInfo.caseMaterial;

  const observation = {
    id: newId("obs"),
    source: SOURCE,
    externalItemId: productId,
    url: canonicalUrl,
    title,
    imageUrl: image.url,
    imageAlt: null,
    observedAt,
    fetchedAt,
    observationPurpose: purpose,
    sourceStatus: "AMBIGUOUS",
    parserVersion: PARSER_VERSION,
    availability: mapAvailability(offer && offer.availability),
    displayAuthorized: false,
    meta: {
      brand: brandName(product) || basicInfo.brand || undefined,
      model: basicInfo.model || basicInfo.collection || undefined,
      modelNumber: product.sku ? String(product.sku) : basicInfo.reference || undefined,
      condition: mapCondition(offer && offer.itemCondition) || basicInfo.condition || undefined,
      size: basicInfo.caseDiameter || undefined,
      localizedAmount: prices.localizedAmount,
      localizedCurrency: prices.localizedCurrency,
      priceSemantics: prices.priceSemantics,
      identityHints: Object.keys(identityHints).length ? identityHints : undefined,
      extractionEvidence: {
        sourceItemId: "STRUCTURED_DATA",
        title: "STRUCTURED_DATA",
        imageUrl: image.method,
        localizedAmount: "STRUCTURED_DATA",
        localizedCurrency: "STRUCTURED_DATA",
        url: offer && offer.url ? "STRUCTURED_DATA" : "URL_PATTERN",
        ...(basicInfo.model || basicInfo.reference ? { model: "DOM" } : {}),
      },
    },
  };

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
    ok: false,
    sourceStatus: "AMBIGUOUS",
    reason: "native_vs_localized_unresolved",
    confirmationParserLogic: "PASS",
    confirmationMarketTruth: "BLOCKED_NATIVE_PRICE",
    acquisitionMode: "STRUCTURED_DATA",
    observation: checked.observation,
  };
}

/**
 * HTTP-only. Browser fallback 없음.
 * @param {{ url: string, fetchImpl?: typeof fetch, now?: Date }} input
 */
async function acquireChrono24Document(input) {
  const classified = classifyChrono24Url(input.url);
  if (!classified.ok) {
    return { ok: false, sourceStatus: "PARSE_FAILED", reason: classified.reason };
  }
  if (classified.kind === "discovery_surface") {
    return {
      ok: false,
      sourceStatus: "PARSE_FAILED",
      reason: "DISCOVERY_RUNTIME_NOT_IMPLEMENTED",
    };
  }

  const fetchImpl = input.fetchImpl || globalThis.fetch;
  if (typeof fetchImpl !== "function") {
    return { ok: false, sourceStatus: "TEMPORARY_ERROR", reason: "fetch_unavailable" };
  }

  let response;
  try {
    response = await fetchImpl(classified.url, {
      headers: { accept: "text/html,application/xhtml+xml" },
    });
  } catch {
    return { ok: false, sourceStatus: "TEMPORARY_ERROR", reason: "fetch_error" };
  }

  let text = "";
  try {
    text = await response.text();
  } catch {
    return { ok: false, sourceStatus: "TEMPORARY_ERROR", reason: "read_error" };
  }

  const blocked = detectAccessBlock({
    status: response.status,
    headers: response.headers,
    body: text,
  });
  if (blocked.blocked) {
    return { ok: false, sourceStatus: "ACCESS_BLOCKED", reason: blocked.reason };
  }
  if (response.status === 404) {
    return { ok: false, sourceStatus: "NOT_FOUND", reason: "http_404" };
  }
  if (!response.ok) {
    return { ok: false, sourceStatus: "TEMPORARY_ERROR", reason: `http_${response.status}` };
  }

  return {
    ok: true,
    html: text,
    url: classified.url,
    fetchedAt: (input.now || new Date()).toISOString(),
    acquisitionMode: "HTTP",
  };
}

async function observeChrono24(input) {
  const acquired = await acquireChrono24Document({
    url: input.url,
    fetchImpl: input.fetchImpl,
    now: input.now,
  });
  if (!acquired.ok) return acquired;
  return parseChrono24ProductDocument({
    html: acquired.html,
    url: acquired.url,
    purpose: input.purpose,
    fetchedAt: acquired.fetchedAt,
    observedAt: acquired.fetchedAt,
  });
}

module.exports = {
  SOURCE,
  PARSER_VERSION,
  classifyChrono24Url,
  acquireChrono24Document,
  parseChrono24ProductDocument,
  observeChrono24,
  detectAccessBlock,
};
