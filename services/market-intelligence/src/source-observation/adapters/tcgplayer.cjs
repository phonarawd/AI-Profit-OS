/**
 * TCGplayer public product page → SourceObservation.
 * API 0. HTTP_HTML 후 필요할 때만 BROWSER_RENDERED.
 * 추출: STRUCTURED_DATA → EMBEDDED_STATE → labeled DOM.
 * title-only / source-local id를 manufacturer identity로 쓰지 않는다.
 */

const { extractLdJsonBlocks, collectProducts } = require("../extract/json-ld.cjs");
const { detectAccessBlock } = require("../extract/access-block.cjs");
const { validateObservation, isObviouslyMalformedAmount } = require("../validate.cjs");
const { TCGPLAYER_PARSER_VERSION, NATIVE_CURRENCIES } = require("../contract.cjs");
const { acquireBrowserRenderedDocument } = require("../acquire/browser-rendered.cjs");

const SOURCE = "tcgplayer";
const PARSER_VERSION = TCGPLAYER_PARSER_VERSION;
const HOST_RE = /(^|\.)tcgplayer\.com$/i;
const PRODUCT_PATH_RE = /\/product\/(\d+)(?:\/|$)/i;
const CATEGORY_ROOT = "/categories/trading-and-collectible-card-games/";
const PRODUCT_IMAGE_RE =
  /^https?:\/\/(?:tcgplayer-cdn\.tcgplayer\.com|product-images\.tcgplayer\.com)\/product\/\d+_in_\d+x\d+\.(?:jpg|jpeg|png|webp)/i;
const AMOUNT_RE = /^[0-9]+(\.[0-9]+)?$/;
const CARD_NUMBER_RE = /\b(\d{1,3})\s*\/\s*(\d{1,3})\b/;

function newId(prefix) {
  return `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;
}

function stripTags(html) {
  return String(html || "")
    .replace(/<script\b[\s\S]*?<\/script>/gi, " ")
    .replace(/<style\b[\s\S]*?<\/style>/gi, " ")
    .replace(/<br\s*\/?>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&quot;/gi, '"')
    .replace(/&#39;/gi, "'")
    .replace(/\s+/g, " ")
    .trim();
}

function normalizeAmount(raw) {
  if (raw == null || raw === "") return null;
  const s = String(raw).replace(/,/g, "").replace(/^\$/, "").trim();
  if (!AMOUNT_RE.test(s) || isObviouslyMalformedAmount(s)) return null;
  return s;
}

function classifyTcgplayerUrl(rawUrl) {
  let parsed;
  try {
    parsed = new URL(String(rawUrl || ""));
  } catch {
    return { ok: false, reason: "invalid_url" };
  }
  if (!HOST_RE.test(parsed.hostname)) {
    return { ok: false, reason: "host_not_tcgplayer" };
  }
  const product = (parsed.pathname || "").match(PRODUCT_PATH_RE);
  if (!product) {
    return { ok: false, reason: "url_not_product" };
  }
  return {
    ok: true,
    kind: "product",
    externalItemId: product[1],
    url: parsed.toString(),
  };
}

function locateTcgplayerProduct(input) {
  const rawUrl = String((input && input.url) || "").trim();
  if (rawUrl) return classifyTcgplayerUrl(rawUrl);
  const id = String((input && input.externalItemId) || "").trim();
  if (/^\d+$/.test(id)) {
    return classifyTcgplayerUrl(`https://www.tcgplayer.com/product/${id}`);
  }
  return { ok: false, reason: "tcgplayer_locator_missing" };
}

function isChallengeDocument(html, status, headers) {
  return detectAccessBlock({ status: status || 200, headers, body: html }).blocked;
}

function isGenericShell(html) {
  const text = String(html || "");
  if (/product__item-details__attributes/i.test(text)) return false;
  if (/spotlight__price/i.test(text)) return false;
  if (/application\/ld\+json/i.test(text) && /"@type"\s*:\s*"Product"/i.test(text)) {
    return false;
  }
  const emptyApp = /<div[^>]*id=["']app["'][^>]*>\s*<\/div>/i.test(text);
  const needsJs = /doesn't work properly without JavaScript/i.test(text);
  return emptyApp || needsJs;
}

function isProductDocument(html) {
  const text = String(html || "");
  if (isGenericShell(text)) return false;
  return (
    /product__item-details__attributes/i.test(text) ||
    (/application\/ld\+json/i.test(text) && /"@type"\s*:\s*"Product"/i.test(text)) ||
    /spotlight__price/i.test(text)
  );
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

function resolveProduct(products) {
  if (!Array.isArray(products) || products.length === 0) {
    return { ok: false, reason: "product_jsonld_missing" };
  }
  const withSku = products.find((p) => p && p.sku != null && String(p.sku).trim() !== "");
  return { ok: true, product: withSku || products[0] };
}

function extractStructuredProduct(html) {
  const ld = extractLdJsonBlocks(html);
  if (!ld.ok) {
    return { ok: false, reason: ld.reason, product: null };
  }
  const resolved = resolveProduct(collectProducts(ld.blocks));
  if (!resolved.ok) return { ok: false, reason: resolved.reason, product: null };
  return { ok: true, product: resolved.product, method: "STRUCTURED_DATA" };
}

function walkEmbeddedCandidate(node, depth, hits) {
  if (!node || typeof node !== "object" || depth > 6) return;
  if (Array.isArray(node)) {
    for (const item of node.slice(0, 30)) walkEmbeddedCandidate(item, depth + 1, hits);
    return;
  }
  const setName = node.setName || node.set_name;
  const cardNumber = node.cardNumber || node.card_number || node.number;
  const productId = node.productId || node.product_id || node.sku;
  if (setName || cardNumber) {
    hits.push({
      productId: productId != null ? String(productId).trim() : "",
      name: node.name || node.productName || node.cleanName || "",
      setName: setName ? String(setName).trim() : "",
      cardNumber: cardNumber ? String(cardNumber).trim() : "",
      game: node.productLineName || node.categoryName || node.game || "",
    });
  }
  const keys = Object.keys(node);
  if (keys.length > 40) return;
  for (const key of keys) {
    if (key === "props" || key === "pageProps" || key === "product" || key === "state" || key === "data") {
      walkEmbeddedCandidate(node[key], depth + 1, hits);
    }
  }
}

function extractEmbeddedState(html) {
  const blocks = [];
  const next = String(html || "").match(
    /<script\b[^>]*id=["']__NEXT_DATA__["'][^>]*>([\s\S]*?)<\/script>/i,
  );
  if (next) blocks.push(next[1]);
  const initial = String(html || "").match(/window\.__INITIAL_STATE__\s*=\s*(\{[\s\S]*?\});/);
  if (initial) blocks.push(initial[1]);
  const nuxt = String(html || "").match(/window\.__NUXT__\s*=\s*(\{[\s\S]*?\});/);
  if (nuxt) blocks.push(nuxt[1]);
  const hits = [];
  for (const raw of blocks) {
    try {
      walkEmbeddedCandidate(JSON.parse(raw), 0, hits);
    } catch {
      return { ok: false, reason: "malformed_embedded_state", found: false };
    }
  }
  if (!hits.length) return { ok: true, found: false, record: null };
  return { ok: true, found: true, record: hits[0], method: "EMBEDDED_STATE" };
}

function extractLabeledAttributes(html) {
  const rows = {};
  const re = /<strong\b[^>]*>([\s\S]*?)<\/strong>\s*<span\b[^>]*>([\s\S]*?)<\/span>/gi;
  let m;
  while ((m = re.exec(String(html || "")))) {
    const label = stripTags(m[1]).replace(/:\s*$/, "").trim();
    const value = stripTags(m[2]);
    if (!label || !value) continue;
    const key = label.toLowerCase();
    if (!rows[key]) rows[key] = value;
  }
  return rows;
}

function labeledCardNumber(rows) {
  for (const [label, value] of Object.entries(rows)) {
    if (!/card\s*number/.test(label)) continue;
    const m = String(value).match(CARD_NUMBER_RE);
    if (m) return `${m[1]}/${m[2]}`;
  }
  return "";
}

function labeledSet(rows) {
  for (const [label, value] of Object.entries(rows)) {
    if (label === "set" || label === "set name" || label.startsWith("set name")) {
      return String(value).trim();
    }
  }
  return "";
}

function collectBreadcrumbBlocks(html) {
  const blocks = [];
  const navRe = /<nav\b[^>]*>([\s\S]*?)<\/nav>/gi;
  let m;
  while ((m = navRe.exec(String(html || "")))) blocks.push(m[1]);
  const labeledRe =
    /<(?:ol|ul|div|nav)\b[^>]*class=["'][^"']*(?:breadcrumb|crumbs?)[^"']*["'][^>]*>([\s\S]*?)<\/(?:ol|ul|div|nav)>/gi;
  while ((m = labeledRe.exec(String(html || "")))) blocks.push(m[1]);
  return blocks;
}

function crumbsFromBlock(block) {
  const crumbs = [];
  const re = /<a\b[^>]*href=["']([^"']+)["'][^>]*>([\s\S]*?)<\/a>/gi;
  let m;
  while ((m = re.exec(String(block || "")))) {
    let href = m[1].replace(/&amp;/g, "&");
    const text = stripTags(m[2]);
    if (!text) continue;
    try {
      href = new URL(href, "https://www.tcgplayer.com").pathname;
    } catch {
      continue;
    }
    crumbs.push({ href, text });
  }
  let game = "";
  let set = "";
  for (const crumb of crumbs) {
    const path = crumb.href.replace(/\/+$/, "");
    if (!path.toLowerCase().includes(CATEGORY_ROOT.slice(0, -1))) continue;
    const rest = path.slice(path.toLowerCase().indexOf(CATEGORY_ROOT) + CATEGORY_ROOT.length);
    const parts = rest.split("/").filter(Boolean);
    if (parts.length === 1 && !game) game = crumb.text;
    if (parts.length >= 2 && !set) set = crumb.text;
  }
  return { game, set };
}

function namesOverlap(left, right) {
  const a = String(left || "").toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
  const b = String(right || "").toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
  if (!a || !b) return false;
  return a === b || a.includes(b) || b.includes(a);
}

function extractBreadcrumbs(html, structuredGame) {
  const candidates = collectBreadcrumbBlocks(html)
    .map((block) => crumbsFromBlock(block))
    .filter((row) => row.game || row.set);
  if (structuredGame) {
    const matched = candidates.find((row) => namesOverlap(row.game, structuredGame) && row.set);
    if (matched) return matched;
  }
  return candidates.find((row) => row.game && row.set) || candidates[0] || { game: "", set: "" };
}

function extractH1(html) {
  const m = String(html || "").match(/<h1\b[^>]*>([\s\S]*?)<\/h1>/i);
  return m ? stripTags(m[1]) : "";
}

function collectImageUrls(html) {
  const urls = [];
  const srcRe = /<(?:img|source)\b[^>]*(?:src|data-src)=["']([^"']+)["'][^>]*>/gi;
  let m;
  while ((m = srcRe.exec(String(html || "")))) urls.push(m[1]);
  const srcsetRe = /srcset=["']([^"']+)["']/gi;
  while ((m = srcsetRe.exec(String(html || "")))) {
    for (const part of m[1].split(",")) {
      const url = part.trim().split(/\s+/)[0];
      if (url) urls.push(url);
    }
  }
  return urls;
}

function pickProductImage(html, product) {
  for (const raw of collectImageUrls(html)) {
    if (/undefined_in/i.test(raw)) continue;
    if (!PRODUCT_IMAGE_RE.test(raw)) continue;
    return { url: raw, method: "DOM" };
  }
  const raw = product && product.image;
  const list = Array.isArray(raw) ? raw : raw == null ? [] : [raw];
  for (const item of list) {
    const url =
      typeof item === "string"
        ? item
        : item && typeof item === "object"
          ? item.contentUrl || item.url || ""
          : "";
    if (!url || /undefined_in/i.test(url)) continue;
    if (PRODUCT_IMAGE_RE.test(url)) return { url, method: "STRUCTURED_DATA" };
  }
  return null;
}

function extractSpotlightAmount(html) {
  const m = String(html || "").match(
    /class=["'][^"']*spotlight__price[^"']*["'][^>]*>\s*\$?\s*([0-9][0-9,]*(?:\.[0-9]+)?)/i,
  );
  return m ? normalizeAmount(m[1]) : null;
}

function mapAvailability(raw) {
  const s = String(raw || "");
  if (/OutOfStock|SoldOut/i.test(s)) return "out_of_stock";
  if (/InStock/i.test(s)) return "available";
  if (/Discontinued|Unavailable/i.test(s)) return "unavailable";
  return "unknown";
}

function emptyDiagnostics() {
  return {
    structuredDataFound: false,
    embeddedStateFound: false,
    domFieldsFound: {
      game: false,
      set: false,
      cardNumber: false,
      title: false,
      image: false,
      listingPrice: false,
    },
  };
}

/**
 * @param {{ html: string, url: string, purpose?: string, fetchedAt?: string, observedAt?: string, acquisitionMode?: string }} input
 */
function parseTcgplayerProductDocument(input) {
  const html = input && input.html != null ? String(input.html) : "";
  const diagnostics = emptyDiagnostics();
  const blocked = detectAccessBlock({ status: 200, body: html });
  if (blocked.blocked) {
    return { ok: false, sourceStatus: "ACCESS_BLOCKED", reason: blocked.reason, diagnostics };
  }
  if (isGenericShell(html)) {
    return { ok: false, sourceStatus: "PARSE_FAILED", reason: "generic_shell", diagnostics };
  }

  const classified = classifyTcgplayerUrl(input.url);
  if (!classified.ok) {
    return { ok: false, sourceStatus: "PARSE_FAILED", reason: classified.reason, diagnostics };
  }

  const structured = extractStructuredProduct(html);
  const product = structured.ok ? structured.product : null;
  diagnostics.structuredDataFound = Boolean(product);

  const embedded = extractEmbeddedState(html);
  if (!embedded.ok) {
    return { ok: false, sourceStatus: "PARSE_FAILED", reason: embedded.reason, diagnostics };
  }
  diagnostics.embeddedStateFound = Boolean(embedded.found);

  const labeled = extractLabeledAttributes(html);
  const structuredGame = brandName(product) || (embedded.record && embedded.record.game) || "";
  const crumbs = extractBreadcrumbs(html, structuredGame);
  const h1 = extractH1(html);
  const ldName = product && product.name ? String(product.name).trim() : "";
  const title = h1 || ldName;
  diagnostics.domFieldsFound.title = Boolean(h1);

  const productId =
    (product && product.sku != null ? String(product.sku).trim() : "") ||
    (embedded.record && embedded.record.productId) ||
    classified.externalItemId;
  if (!productId) {
    return { ok: false, sourceStatus: "PARSE_FAILED", reason: "product_id_missing", diagnostics };
  }
  if (classified.externalItemId && classified.externalItemId !== productId) {
    return { ok: false, sourceStatus: "PARSE_FAILED", reason: "conflicting_id", diagnostics };
  }
  if (embedded.record && embedded.record.productId && embedded.record.productId !== productId) {
    return { ok: false, sourceStatus: "PARSE_FAILED", reason: "conflicting_id", diagnostics };
  }
  if (!title) {
    return { ok: false, sourceStatus: "PARSE_FAILED", reason: "title_missing", diagnostics };
  }

  const image = pickProductImage(html, product);
  diagnostics.domFieldsFound.image = Boolean(image && image.method === "DOM");
  if (!image) {
    return { ok: false, sourceStatus: "PARSE_FAILED", reason: "primary_image_missing", diagnostics };
  }

  const gameOwner =
    brandName(product) ||
    (embedded.record && embedded.record.game) ||
    crumbs.game;
  const gameMethod = brandName(product)
    ? "STRUCTURED_DATA"
    : embedded.record && embedded.record.game
      ? "EMBEDDED_STATE"
      : crumbs.game
        ? "DOM"
        : null;

  const setOwner =
    (embedded.record && embedded.record.setName) || labeledSet(labeled) || crumbs.set;
  const setMethod =
    embedded.record && embedded.record.setName
      ? "EMBEDDED_STATE"
      : labeledSet(labeled)
        ? "DOM"
        : crumbs.set
          ? "DOM"
          : null;

  const numberOwner =
    labeledCardNumber(labeled) ||
    (embedded.record && embedded.record.cardNumber
      ? (() => {
          const m = String(embedded.record.cardNumber).match(CARD_NUMBER_RE);
          return m ? `${m[1]}/${m[2]}` : "";
        })()
      : "");
  const numberMethod = labeledCardNumber(labeled)
    ? "DOM"
    : numberOwner
      ? "EMBEDDED_STATE"
      : null;

  diagnostics.domFieldsFound.game = Boolean(gameOwner);
  diagnostics.domFieldsFound.set = Boolean(setOwner);
  diagnostics.domFieldsFound.cardNumber = Boolean(numberOwner);

  if (!gameOwner || !setOwner || !numberOwner) {
    return {
      ok: false,
      sourceStatus: "PARSE_FAILED",
      reason: "required_identity_structure_missing",
      diagnostics,
    };
  }

  const offer = offerNode(product);
  const ldAmount = offer ? normalizeAmount(offer.price) : null;
  const ldCurrency =
    offer && offer.priceCurrency ? String(offer.priceCurrency).trim().toUpperCase() : "";
  const spotlightAmount = extractSpotlightAmount(html);
  diagnostics.domFieldsFound.listingPrice = Boolean(spotlightAmount);

  let nativeAmount = null;
  let nativeCurrency = null;
  let amountMethod = null;
  let currencyMethod = null;
  if (spotlightAmount && ldAmount && spotlightAmount !== ldAmount) {
    return {
      ok: false,
      sourceStatus: "AMBIGUOUS",
      reason: "listing_price_conflict",
      diagnostics,
    };
  }
  if (spotlightAmount && ldCurrency && NATIVE_CURRENCIES.includes(ldCurrency)) {
    nativeAmount = spotlightAmount;
    nativeCurrency = ldCurrency;
    amountMethod = "DOM";
    currencyMethod = "STRUCTURED_DATA";
  } else if (ldAmount && ldCurrency && NATIVE_CURRENCIES.includes(ldCurrency)) {
    nativeAmount = ldAmount;
    nativeCurrency = ldCurrency;
    amountMethod = "STRUCTURED_DATA";
    currencyMethod = "STRUCTURED_DATA";
  }

  const purpose = input.purpose === "DISCOVERY" ? "DISCOVERY" : "CONFIRMATION";
  const now = new Date().toISOString();
  const fetchedAt = input.fetchedAt || now;
  const observedAt = input.observedAt || fetchedAt;

  const identityHints = {
    game: gameOwner,
    set: setOwner,
    cardNumber: numberOwner,
  };
  if (ldName) identityHints.character = ldName;

  const observation = {
    id: newId("obs"),
    source: SOURCE,
    externalItemId: productId,
    url: classified.url,
    title,
    imageUrl: image.url,
    imageAlt: null,
    observedAt,
    fetchedAt,
    observationPurpose: purpose,
    sourceStatus: "SUCCESS",
    parserVersion: PARSER_VERSION,
    availability: mapAvailability(offer && offer.availability),
    displayAuthorized: false,
    meta: {
      observationMode: "AUTOMATED_LIVE",
      identityHints,
      extractionEvidence: {
        sourceItemId: product && product.sku ? "STRUCTURED_DATA" : "URL_PATTERN",
        title: h1 ? "DOM" : "STRUCTURED_DATA",
        imageUrl: image.method,
        url: "URL_PATTERN",
        game: gameMethod,
        set: setMethod,
        cardNumber: numberMethod,
      },
    },
  };

  if (nativeAmount && nativeCurrency) {
    observation.nativeAmount = nativeAmount;
    observation.nativeCurrency = nativeCurrency;
    observation.meta.priceKind = "listing_sale";
    observation.meta.priceSemantics = "native_proven";
    observation.meta.extractionEvidence.nativeAmount = amountMethod;
    observation.meta.extractionEvidence.nativeCurrency = currencyMethod;
  } else if (purpose === "CONFIRMATION") {
    observation.sourceStatus = "AMBIGUOUS";
    const checkedAmbiguous = validateObservation(observation);
    return {
      ok: false,
      sourceStatus: "AMBIGUOUS",
      reason: "listing_price_semantics_unclear",
      diagnostics,
      observation: checkedAmbiguous.ok ? checkedAmbiguous.observation : observation,
    };
  }

  const checked = validateObservation(observation);
  if (!checked.ok) {
    return {
      ok: false,
      sourceStatus: checked.sourceStatus,
      reason: checked.reason,
      failures: checked.failures,
      diagnostics,
    };
  }

  return {
    ok: true,
    kind: "product",
    acquisitionMode: input.acquisitionMode || "HTTP_HTML",
    extractionPath: [
      diagnostics.structuredDataFound ? "STRUCTURED_DATA" : null,
      diagnostics.embeddedStateFound ? "EMBEDDED_STATE" : null,
      "DOM",
    ]
      .filter(Boolean)
      .join("+"),
    diagnostics,
    observation: checked.observation,
  };
}

async function acquireHttpHtml(input) {
  const fetchImpl = input.fetchImpl || globalThis.fetch;
  if (typeof fetchImpl !== "function") {
    return { ok: false, sourceStatus: "TEMPORARY_ERROR", reason: "fetch_unavailable" };
  }
  let response;
  try {
    response = await fetchImpl(input.url, {
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
    return {
      ok: false,
      sourceStatus: "ACCESS_BLOCKED",
      reason: blocked.reason,
      acquisitionMode: "HTTP_HTML",
      html: text,
      status: response.status,
    };
  }
  if (response.status === 404) {
    return { ok: false, sourceStatus: "NOT_FOUND", reason: "http_404", acquisitionMode: "HTTP_HTML" };
  }
  if (!response.ok) {
    return {
      ok: false,
      sourceStatus: "TEMPORARY_ERROR",
      reason: `http_${response.status}`,
      acquisitionMode: "HTTP_HTML",
    };
  }
  return {
    ok: true,
    html: text,
    url: input.url,
    status: response.status,
    fetchedAt: (input.now || new Date()).toISOString(),
    acquisitionMode: "HTTP_HTML",
  };
}

async function observeTcgplayer(input) {
  const locator = locateTcgplayerProduct(input);
  if (!locator.ok) {
    return { ok: false, sourceStatus: "PARSE_FAILED", reason: locator.reason };
  }

  const report = {
    HTTP_HTML: "NOT_RUN",
    BROWSER_RENDERED: "NOT_RUN",
    CHALLENGE_DETECTED: "NO",
    PRODUCT_PAGE_ACQUIRED: "NO",
    STRUCTURED_DATA_FOUND: "NO",
    EMBEDDED_STATE_FOUND: "NO",
    DOM_FIELDS_FOUND: "NO",
  };

  const http = await acquireHttpHtml({
    url: locator.url,
    fetchImpl: input.fetchImpl,
    now: input.now,
  });
  if (http.sourceStatus === "ACCESS_BLOCKED" || isChallengeDocument(http.html || "", http.status, null)) {
    report.HTTP_HTML = "BLOCKED_CHALLENGE";
    report.CHALLENGE_DETECTED = "YES";
    return {
      ok: false,
      sourceStatus: "ACCESS_BLOCKED",
      reason: http.reason || "challenge_or_turnstile_html",
      acquisitionReport: report,
    };
  }
  if (!http.ok) {
    report.HTTP_HTML = http.reason || "FAIL";
    return { ...http, acquisitionReport: report };
  }

  if (isProductDocument(http.html)) {
    report.HTTP_HTML = "PASS";
    report.PRODUCT_PAGE_ACQUIRED = "YES";
    const parsed = parseTcgplayerProductDocument({
      html: http.html,
      url: locator.url,
      purpose: input.purpose,
      fetchedAt: http.fetchedAt,
      observedAt: http.fetchedAt,
      acquisitionMode: "HTTP_HTML",
    });
    attachDiagnostics(report, parsed);
    return { ...parsed, acquisitionReport: report };
  }
  report.HTTP_HTML = "GENERIC_SHELL";

  const browser = await acquireBrowserRenderedDocument({
    url: locator.url,
    readySelector: ".product__item-details__attributes",
    optionalSelector: ".spotlight__price",
    waitForStructuredProduct: true,
    now: input.now,
  });
  if (browser.sourceStatus === "ACCESS_BLOCKED" || isChallengeDocument(browser.html || "", browser.status, null)) {
    report.BROWSER_RENDERED = "BLOCKED_CHALLENGE";
    report.CHALLENGE_DETECTED = "YES";
    return {
      ok: false,
      sourceStatus: "ACCESS_BLOCKED",
      reason: browser.reason || "challenge_or_turnstile_html",
      acquisitionReport: report,
    };
  }
  if (!browser.ok) {
    report.BROWSER_RENDERED = browser.reason || "FAIL";
    return { ...browser, acquisitionReport: report };
  }
  if (!isProductDocument(browser.html)) {
    report.BROWSER_RENDERED = "GENERIC_SHELL";
    report.PRODUCT_PAGE_ACQUIRED = "NO";
    return {
      ok: false,
      sourceStatus: "PARSE_FAILED",
      reason: "product_page_not_acquired",
      acquisitionReport: report,
    };
  }

  report.BROWSER_RENDERED = "PASS";
  report.PRODUCT_PAGE_ACQUIRED = "YES";
  const parsed = parseTcgplayerProductDocument({
    html: browser.html,
    url: locator.url,
    purpose: input.purpose,
    fetchedAt: browser.fetchedAt,
    observedAt: browser.fetchedAt,
    acquisitionMode: "BROWSER_RENDERED",
  });
  attachDiagnostics(report, parsed);
  return { ...parsed, acquisitionReport: report };
}

function attachDiagnostics(report, parsed) {
  const d = parsed && parsed.diagnostics;
  if (!d) return;
  report.STRUCTURED_DATA_FOUND = d.structuredDataFound ? "YES" : "NO";
  report.EMBEDDED_STATE_FOUND = d.embeddedStateFound ? "YES" : "NO";
  report.DOM_FIELDS_FOUND =
    d.domFieldsFound.set || d.domFieldsFound.cardNumber || d.domFieldsFound.listingPrice
      ? "YES"
      : "NO";
}

module.exports = {
  SOURCE,
  PARSER_VERSION,
  classifyTcgplayerUrl,
  locateTcgplayerProduct,
  isGenericShell,
  isProductDocument,
  parseTcgplayerProductDocument,
  observeTcgplayer,
  acquireHttpHtml,
};
