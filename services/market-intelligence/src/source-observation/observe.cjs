/**
 * observeProduct(source, url, purpose)
 * one-shot과 이후 worker tick이 같은 함수를 재사용한다.
 */

const fashionphile = require("./adapters/fashionphile.cjs");
const chrono24 = require("./adapters/chrono24.cjs");
const ebay = require("./adapters/ebay.cjs");
const tcgplayer = require("./adapters/tcgplayer.cjs");
const {
  searchEbayItemSummaries,
  acquireEbayItem,
  normalizeMarketplace,
} = require("./acquire/ebay-browse.cjs");
const { validateObservation } = require("./validate.cjs");
const {
  FORBIDDEN_OBSERVATION_SOURCES,
  IMPLEMENTED_PARSERS,
  OBSERVATION_SOURCES,
} = require("./contract.cjs");

/**
 * @param {{
 *   source: string,
 *   url: string,
 *   purpose: "DISCOVERY" | "CONFIRMATION",
 *   fetchImpl?: typeof fetch,
 *   handle?: string,
 *   externalItemId?: string,
 *   now?: Date,
 * }} input
 */
function gateObserveSource(source) {
  const id = String(source || "");
  if (FORBIDDEN_OBSERVATION_SOURCES.includes(id) || id.includes("yahoo")) {
    return { ok: false, sourceStatus: "PARSE_FAILED", reason: "YAHOO_SOURCE_ZERO" };
  }
  if (!OBSERVATION_SOURCES.includes(id)) {
    return { ok: false, sourceStatus: "PARSE_FAILED", reason: "unknown_source" };
  }
  if (!IMPLEMENTED_PARSERS.includes(id)) {
    return {
      ok: false,
      sourceStatus: "TEMPORARY_ERROR",
      reason: "SOURCE_PARSER_NOT_IMPLEMENTED",
      parserContractStatus: "READY",
      liveRuntimeStatus: "NOT_VERIFIED",
      nextAction: "LIVE_REVALIDATION",
    };
  }
  return { ok: true, source: id };
}

async function observeFashionphile(input) {
  const classified = fashionphile.classifyFashionphileUrl(input.url);
  if (!classified.ok) {
    return { ok: false, sourceStatus: "PARSE_FAILED", reason: classified.reason };
  }

  const fetchImpl = input.fetchImpl || globalThis.fetch;
  if (typeof fetchImpl !== "function") {
    return { ok: false, sourceStatus: "TEMPORARY_ERROR", reason: "fetch_unavailable" };
  }

  let fetchUrl = input.url;
  if (classified.kind === "product") {
    fetchUrl = fashionphile.confirmationJsonUrl(classified.handle);
  } else if (classified.kind === "catalog") {
    fetchUrl = "https://www.fashionphile.com/products.json";
  }

  const fetchedAt = (input.now || new Date()).toISOString();
  let response;
  try {
    response = await fetchImpl(fetchUrl, {
      headers: { accept: "application/json" },
    });
  } catch {
    return { ok: false, sourceStatus: "TEMPORARY_ERROR", reason: "fetch_error" };
  }

  if (response.status === 404) {
    return { ok: false, sourceStatus: "NOT_FOUND", reason: "http_404" };
  }
  if (response.status === 401 || response.status === 403 || response.status === 429) {
    return { ok: false, sourceStatus: "ACCESS_BLOCKED", reason: `http_${response.status}` };
  }
  if (!response.ok) {
    return { ok: false, sourceStatus: "TEMPORARY_ERROR", reason: `http_${response.status}` };
  }

  let text;
  try {
    text = await response.text();
  } catch {
    return { ok: false, sourceStatus: "TEMPORARY_ERROR", reason: "read_error" };
  }

  const parsed = fashionphile.parseFashionphileDocument({
    document: text,
    purpose: input.purpose,
    url: fetchUrl,
    fetchedAt,
    observedAt: fetchedAt,
    handle: input.handle || classified.handle,
    externalItemId: input.externalItemId,
  });

  if (!parsed.ok) return parsed;

  if (parsed.kind === "product") {
    const checked = validateObservation(parsed.observation);
    if (!checked.ok) return checked;
    return { ok: true, observation: checked.observation, acquisitionMode: "PUBLIC_JSON" };
  }

  return {
    ok: true,
    kind: "catalog",
    acquisitionMode: "PUBLIC_JSON",
    candidates: parsed.candidates,
  };
}

async function observeEbay(input) {
  const purpose = input.purpose === "DISCOVERY" ? "DISCOVERY" : "CONFIRMATION";
  const fetchedAt = (input.now || new Date()).toISOString();
  const marketplaceId = normalizeMarketplace(input.marketplaceId);
  let item = input.item;
  if (!item) {
    const locator = ebay.locateEbayItem(input);
    if (!locator.ok) {
      return { ok: false, sourceStatus: "PARSE_FAILED", reason: locator.reason };
    }
    const acquired = await acquireEbayItem({
      itemId: locator.itemId,
      legacyItemId: locator.legacyItemId,
      marketplaceId,
      token: input.token,
      env: input.env,
      fetchImpl: input.fetchImpl,
    });
    if (!acquired.ok) return acquired;
    item = acquired.item;
  }
  const parsed = ebay.parseEbayBrowseItem({
    item,
    purpose,
    fetchedAt,
    observedAt: fetchedAt,
    requestContext: { marketplaceId },
  });
  if (!parsed.ok) return parsed;
  const checked = validateObservation(parsed.observation);
  if (!checked.ok) return checked;
  return {
    ok: true,
    observation: checked.observation,
    acquisitionMode: "API",
  };
}

/**
 * Identity Matching discoverCandidates 와 이름이 다르다.
 * 이번 slice는 ebay query/category discovery만.
 */
async function discoverSourceItems(input) {
  const gated = gateObserveSource(input && input.source);
  if (!gated.ok) return gated;
  if (input.source !== "ebay") {
    return {
      ok: false,
      sourceStatus: "TEMPORARY_ERROR",
      reason: "DISCOVER_SOURCE_NOT_IMPLEMENTED",
    };
  }
  const fetchedAt = (input.now || new Date()).toISOString();
  const searched = await searchEbayItemSummaries({
    query: input.query,
    categoryIds: input.categoryIds,
    limit: input.limit,
    offset: input.offset,
    marketplaceId: input.marketplaceId,
    token: input.token,
    env: input.env,
    fetchImpl: input.fetchImpl,
  });
  if (!searched.ok) return searched;
  const candidates = [];
  for (const item of searched.items) {
    candidates.push(
      ebay.parseEbayBrowseItem({
        item,
        purpose: "DISCOVERY",
        fetchedAt,
        observedAt: fetchedAt,
        requestContext: { marketplaceId: searched.marketplaceId },
      }),
    );
  }
  return {
    ok: true,
    kind: "discovery",
    acquisitionMode: "API",
    source: "ebay",
    filter: searched.filter,
    page: searched.page,
    candidates,
  };
}

async function observeProduct(input) {
  const gated = gateObserveSource(input.source);
  if (!gated.ok) return gated;
  if (input.source === "fashionphile") return observeFashionphile(input);
  if (input.source === "chrono24") return chrono24.observeChrono24(input);
  if (input.source === "ebay") return observeEbay(input);
  if (input.source === "tcgplayer") return tcgplayer.observeTcgplayer(input);
  return {
    ok: false,
    sourceStatus: "TEMPORARY_ERROR",
    reason: "SOURCE_PARSER_NOT_IMPLEMENTED",
  };
}

function parseProductDocument(input) {
  if (input && input.source === "ebay") {
    return ebay.parseEbayBrowseItem(input);
  }
  if (input && input.source === "chrono24") {
    return chrono24.parseChrono24ProductDocument(input);
  }
  if (input && input.source === "tcgplayer") {
    return tcgplayer.parseTcgplayerProductDocument(input);
  }
  return fashionphile.parseFashionphileDocument(input);
}

module.exports = {
  gateObserveSource,
  observeProduct,
  parseProductDocument,
  discoverSourceItems,
};
