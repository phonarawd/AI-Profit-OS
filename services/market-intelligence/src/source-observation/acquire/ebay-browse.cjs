/**
 * eBay Browse API acquire — SourceObservation path only.
 * listing-leg workers/ebay-adapter runTick 을 호출하거나 수정하지 않는다.
 * 동일 official URL / env / marketplace header / itemId / retry classify 재사용.
 */

const {
  DEFAULT_MAX_ATTEMPTS,
  DEFAULT_TIMEOUT_MS,
  classifyHttpStatus,
  classifyThrown,
  shouldRetry,
  backoffDelayMs,
  applyFullJitter,
} = require("../../../../../workers/ebay-adapter/src/retry-policy.cjs");

const BROWSE_BASE = "https://api.ebay.com/buy/browse/v1";
const IDENTITY_BASE = "https://api.ebay.com/identity/v1";
const OAUTH_SCOPE = "https://api.ebay.com/oauth/api_scope";
const DEFAULT_MARKETPLACE = "EBAY_US";
const MARKETPLACES = Object.freeze(["EBAY_US", "EBAY_GB", "EBAY_DE", "EBAY_AU"]);
const FIXED_PRICE_FILTER = "buyingOptions:{FIXED_PRICE}";

let cachedToken = null;

function credentialsFromEnv(env) {
  const e = env || process.env;
  const clientId = e.EBAY_CLIENT_ID;
  const clientSecret = e.EBAY_CLIENT_SECRET;
  return {
    configured: Boolean(clientId && clientSecret),
    clientId,
    clientSecret,
  };
}

function normalizeMarketplace(raw) {
  const id = String(raw || "").trim();
  return MARKETPLACES.includes(id) ? id : DEFAULT_MARKETPLACE;
}

function mapHttpStatus(status) {
  if (status === 404) return { sourceStatus: "NOT_FOUND", reason: "http_404" };
  if (status === 401 || status === 403) {
    return { sourceStatus: "TEMPORARY_ERROR", reason: `http_${status}` };
  }
  if (status === 429) return { sourceStatus: "TEMPORARY_ERROR", reason: "http_429" };
  if (status >= 500) return { sourceStatus: "TEMPORARY_ERROR", reason: `http_${status}` };
  return { sourceStatus: "TEMPORARY_ERROR", reason: `http_${status}` };
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function fetchWithTimeout(fetchImpl, input, init, timeoutMs) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetchImpl(input, { ...init, signal: controller.signal });
  } finally {
    clearTimeout(timer);
  }
}

async function withRetry(attemptFn) {
  let last = { sourceStatus: "TEMPORARY_ERROR", reason: "unknown_failure" };
  for (let attemptIndex = 0; attemptIndex < DEFAULT_MAX_ATTEMPTS; attemptIndex += 1) {
    try {
      return await attemptFn();
    } catch (err) {
      const errorClass =
        err && err.errorClass ? err.errorClass : classifyThrown(err);
      last = {
        ok: false,
        sourceStatus: "TEMPORARY_ERROR",
        reason: err instanceof Error ? err.message : "browse_failed",
        errorClass,
      };
      if (!shouldRetry({ attemptIndex, errorClass })) return last;
      await sleep(applyFullJitter(backoffDelayMs(attemptIndex)));
    }
  }
  return { ok: false, ...last };
}

async function fetchAppToken(fetchImpl, clientId, clientSecret) {
  const now = Date.now();
  if (cachedToken && cachedToken.expMs > now + 60_000) return { ok: true, token: cachedToken.value };
  const basic = Buffer.from(`${clientId}:${clientSecret}`).toString("base64");
  const body = new URLSearchParams({
    grant_type: "client_credentials",
    scope: OAUTH_SCOPE,
  });
  const res = await fetchWithTimeout(
    fetchImpl,
    `${IDENTITY_BASE}/oauth2/token`,
    {
      method: "POST",
      headers: {
        authorization: `Basic ${basic}`,
        "content-type": "application/x-www-form-urlencoded",
      },
      body,
    },
    DEFAULT_TIMEOUT_MS,
  );
  if (!res.ok) {
    const mapped = mapHttpStatus(res.status);
    const err = new Error(mapped.reason);
    err.errorClass = classifyHttpStatus(res.status);
    throw err;
  }
  const json = await res.json();
  cachedToken = {
    value: json.access_token,
    expMs: now + (json.expires_in ?? 7200) * 1000,
  };
  return { ok: true, token: cachedToken.value };
}

async function resolveToken(input) {
  if (input.token) return { ok: true, token: input.token };
  const creds = credentialsFromEnv(input.env);
  if (!creds.configured) {
    return { ok: false, sourceStatus: "TEMPORARY_ERROR", reason: "BLOCKED_CREDENTIALS" };
  }
  const fetchImpl = input.fetchImpl || globalThis.fetch;
  if (typeof fetchImpl !== "function") {
    return { ok: false, sourceStatus: "TEMPORARY_ERROR", reason: "fetch_unavailable" };
  }
  const outcome = await withRetry(() => fetchAppToken(fetchImpl, creds.clientId, creds.clientSecret));
  if (outcome && outcome.ok) return outcome;
  return outcome.token
    ? outcome
    : { ok: false, sourceStatus: "TEMPORARY_ERROR", reason: outcome.reason || "token_failed" };
}

async function browseGet(fetchImpl, token, marketplaceId, href) {
  const res = await fetchWithTimeout(
    fetchImpl,
    href,
    {
      headers: {
        authorization: `Bearer ${token}`,
        "X-EBAY-C-MARKETPLACE-ID": marketplaceId,
        accept: "application/json",
      },
    },
    DEFAULT_TIMEOUT_MS,
  );
  if (!res.ok) {
    const mapped = mapHttpStatus(res.status);
    if (mapped.sourceStatus !== "TEMPORARY_ERROR" || res.status === 401 || res.status === 403) {
      return { ok: false, ...mapped };
    }
    const err = new Error(mapped.reason);
    err.errorClass = classifyHttpStatus(res.status);
    throw err;
  }
  try {
    return { ok: true, json: await res.json() };
  } catch (err) {
    const wrapped = new Error("malformed_json");
    wrapped.errorClass = "malformed_response";
    throw wrapped;
  }
}

/**
 * @param {{
 *   query?: string,
 *   categoryIds?: string,
 *   limit?: number,
 *   offset?: number,
 *   marketplaceId?: string,
 *   token?: string,
 *   env?: NodeJS.ProcessEnv,
 *   fetchImpl?: typeof fetch,
 * }} input
 */
async function searchEbayItemSummaries(input) {
  const query = String(input.query || "").trim();
  if (!query && !input.categoryIds) {
    return { ok: false, sourceStatus: "PARSE_FAILED", reason: "discovery_query_or_category_required" };
  }
  const marketplaceId = normalizeMarketplace(input.marketplaceId);
  const tokenRes = await resolveToken(input);
  if (!tokenRes.ok) return tokenRes;
  const fetchImpl = input.fetchImpl || globalThis.fetch;
  const limit = Math.min(20, Math.max(1, Number(input.limit) || 5));
  const offset = Math.max(0, Number(input.offset) || 0);
  const url = new URL(`${BROWSE_BASE}/item_summary/search`);
  if (query) url.searchParams.set("q", query);
  if (input.categoryIds) url.searchParams.set("category_ids", String(input.categoryIds));
  url.searchParams.set("limit", String(limit));
  url.searchParams.set("offset", String(offset));
  url.searchParams.set("filter", FIXED_PRICE_FILTER);

  const outcome = await withRetry(() =>
    browseGet(fetchImpl, tokenRes.token, marketplaceId, url.toString()),
  );
  if (!outcome.ok) return outcome;
  const json = outcome.json || {};
  const items = Array.isArray(json.itemSummaries) ? json.itemSummaries : [];
  const total = Number(json.total);
  const nextOffset = Number.isFinite(total) && offset + limit < total ? offset + limit : null;
  return {
    ok: true,
    acquisitionMode: "API",
    marketplaceId,
    filter: FIXED_PRICE_FILTER,
    items,
    page: {
      limit,
      offset,
      total: Number.isFinite(total) ? total : items.length,
      nextOffset,
    },
  };
}

/**
 * @param {{
 *   itemId?: string,
 *   legacyItemId?: string,
 *   marketplaceId?: string,
 *   token?: string,
 *   env?: NodeJS.ProcessEnv,
 *   fetchImpl?: typeof fetch,
 * }} input
 */
async function acquireEbayItem(input) {
  const marketplaceId = normalizeMarketplace(input.marketplaceId);
  const tokenRes = await resolveToken(input);
  if (!tokenRes.ok) return tokenRes;
  const fetchImpl = input.fetchImpl || globalThis.fetch;
  let href;
  if (input.itemId) {
    href = `${BROWSE_BASE}/item/${encodeURIComponent(String(input.itemId))}`;
  } else if (input.legacyItemId) {
    const url = new URL(`${BROWSE_BASE}/item/get_item_by_legacy_id`);
    url.searchParams.set("legacy_item_id", String(input.legacyItemId));
    href = url.toString();
  } else {
    return { ok: false, sourceStatus: "PARSE_FAILED", reason: "ebay_item_locator_missing" };
  }

  const outcome = await withRetry(() => browseGet(fetchImpl, tokenRes.token, marketplaceId, href));
  if (!outcome.ok) return outcome;
  return {
    ok: true,
    acquisitionMode: "API",
    marketplaceId,
    item: outcome.json,
  };
}

function resetTokenCacheForTests() {
  cachedToken = null;
}

module.exports = {
  BROWSE_BASE,
  IDENTITY_BASE,
  OAUTH_SCOPE,
  DEFAULT_MARKETPLACE,
  MARKETPLACES,
  FIXED_PRICE_FILTER,
  credentialsFromEnv,
  normalizeMarketplace,
  mapHttpStatus,
  searchEbayItemSummaries,
  acquireEbayItem,
  resetTokenCacheForTests,
};
