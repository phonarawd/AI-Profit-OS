/**
 * 실행 경제 필드만 추출한다.
 * title/image는 owner가 아니다. localizedAmount를 native로 승격하지 않는다.
 * Day-1 marketId 해석은 기존 MARKETPLACE_BY_MARKET 역매핑만 재사용한다.
 */

const { asString } = require("../identity-matching/normalize.cjs");
const { isMarketId } = require("../markets.cjs");
const {
  LISTING_STALE_SEC,
  MARKETPLACE_BY_MARKET,
} = require("../catalog-runtime-seed.cjs");

const AVAILABILITY_EXECUTABLE = "available";
const AVAILABILITY_UNAVAILABLE = new Set(["unavailable", "out_of_stock"]);
const AVAILABILITY_KNOWN = new Set([
  "available",
  "unavailable",
  "out_of_stock",
  "unknown",
]);

function marketplaceToMarketId() {
  const out = Object.create(null);
  for (const [marketId, marketplaceId] of Object.entries(MARKETPLACE_BY_MARKET)) {
    out[String(marketplaceId)] = marketId;
  }
  return out;
}

const MARKETPLACE_TO_MARKET = Object.freeze(marketplaceToMarketId());

function objectOf(value) {
  return value && typeof value === "object" ? value : {};
}

function listingIdOf(input) {
  const row = objectOf(input);
  return asString(row.listingId || row.id) || null;
}

function priceSemanticsOf(row) {
  const meta = objectOf(row.meta);
  return asString(row.priceSemantics || meta.priceSemantics);
}

function extractEconomics(input) {
  const row = objectOf(input);
  const semantics = priceSemanticsOf(row);
  return {
    listingId: listingIdOf(row),
    source: asString(row.source) || null,
    nativeAmount: asString(row.nativeAmount || row.nativePrice),
    nativeCurrency: asString(row.nativeCurrency).toUpperCase(),
    availability: asString(row.availability),
    observedAt: asString(row.observedAt),
    staleAt: asString(row.staleAt),
    marketId: asString(row.marketId),
    marketplaceId: asString(row.marketplaceId || row.listingMarketplaceId),
    priceSemantics: semantics,
    nativeProven: semantics !== "localized_only" && semantics !== "native_unresolved",
  };
}

function resolveDay1MarketId(econ) {
  if (econ.marketId) {
    if (isMarketId(econ.marketId)) {
      return { ok: true, marketId: econ.marketId, from: "marketId" };
    }
    return { ok: false, reason: "MARKET_ID_NOT_DAY1" };
  }
  if (econ.marketplaceId && MARKETPLACE_TO_MARKET[econ.marketplaceId]) {
    return {
      ok: true,
      marketId: MARKETPLACE_TO_MARKET[econ.marketplaceId],
      from: "marketplaceId",
    };
  }
  return { ok: false, reason: "MARKET_ID_UNRESOLVED" };
}

function resolveStaleAt(econ) {
  if (econ.staleAt) return { ok: true, staleAt: econ.staleAt, derived: false };
  if (!econ.observedAt) return { ok: false };
  const observedMs = Date.parse(econ.observedAt);
  if (!Number.isFinite(observedMs)) return { ok: false };
  return {
    ok: true,
    staleAt: new Date(observedMs + LISTING_STALE_SEC * 1000).toISOString(),
    derived: true,
  };
}

function availabilityDecision(econ) {
  if (!econ.availability) {
    return { ok: false, decision: "INSUFFICIENT", reason: "AVAILABILITY_MISSING" };
  }
  if (!AVAILABILITY_KNOWN.has(econ.availability)) {
    return { ok: false, decision: "INSUFFICIENT", reason: "AVAILABILITY_UNKNOWN" };
  }
  if (econ.availability === "unknown") {
    return { ok: false, decision: "INSUFFICIENT", reason: "AVAILABILITY_UNKNOWN" };
  }
  if (AVAILABILITY_UNAVAILABLE.has(econ.availability)) {
    return { ok: false, decision: "NOT_EXECUTABLE", reason: "UNAVAILABLE" };
  }
  if (econ.availability !== AVAILABILITY_EXECUTABLE) {
    return { ok: false, decision: "INSUFFICIENT", reason: "AVAILABILITY_UNKNOWN" };
  }
  return { ok: true };
}

module.exports = {
  LISTING_STALE_SEC,
  MARKETPLACE_TO_MARKET,
  extractEconomics,
  listingIdOf,
  resolveDay1MarketId,
  resolveStaleAt,
  availabilityDecision,
};
