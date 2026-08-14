/**
 * ebay-adapter — Engine §0.0 ACTIVE
 * Browse API · marketplaceId×N (EBAY_US|GB|DE|AU) · listing legs only
 *
 * Phase1 CF deploy (cron/fetch) → POST listings to Nest ingest.
 * yahoo_jp / Yahoo Auction path = FORBIDDEN (0).
 *
 * PTF-00C P0-A/P0-C/P0-D repair:
 * - Native marketplace amount/currency are sent as nativeAmount/nativeCurrency
 *   (never as priceUsdt) — Nest owns the only authoritative FX normalization
 *   (§2/§3). This worker performs zero FX math.
 * - Every scheduled tick POSTs a heartbeat to Nest — even zero listings/full
 *   failure/dryRun — carrying per-marketplace attempted/success/failure +
 *   errorClass evidence (§8). One failed marketplace/query can never discard
 *   another's healthy result or abort the tick (§7).
 */

import { searchItemSummary } from "./browse-api";
import {
  ADAPTER_ID,
  CACHE_HINT_SEC,
  DEFAULT_MARKETPLACES,
  EBAY_MARKETPLACE_IDS,
  MARKETPLACE_TO_MARKET_ID,
  SERVICE,
  type EbayMarketplaceId,
} from "./constants";

export interface Env {
  SERVICE: string;
  PHASE: string;
  EBAY_CLIENT_ID?: string;
  EBAY_CLIENT_SECRET?: string;
  /** Comma-separated Browse marketplaceIds · default US,GB */
  EBAY_MARKETPLACES?: string;
  /** JSON string[] of search queries */
  EBAY_SEARCH_QUERIES_JSON?: string;
  NEST_ADAPTER_INGEST_URL?: string;
  ADAPTER_INGEST_TOKEN?: string;
}

type MarketplaceTally = {
  marketplaceId: EbayMarketplaceId;
  attempted: number;
  successCount: number;
  failureCount: number;
  errorClass?: string | null;
};

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);

    if (url.pathname === "/health") {
      return Response.json(healthPayload(env));
    }

    if (url.pathname === "/tick" && request.method === "POST") {
      const result = await runTick(env);
      return Response.json(result);
    }

    return Response.json({
      ok: true,
      service: env.SERVICE ?? SERVICE,
      adapterId: ADAPTER_ID,
      phase: env.PHASE ?? "1",
      status: "deploy_ready",
      marketplaceIds: parseMarketplaces(env.EBAY_MARKETPLACES),
      note: "Phase1 deploy this worker · listing legs=ebay multi|admin · yahoo_jp FORBIDDEN",
    });
  },

  async scheduled(_event: unknown, env: Env): Promise<void> {
    await runTick(env);
  },
};

function healthPayload(env: Env) {
  return {
    ok: true,
    service: env.SERVICE ?? SERVICE,
    adapterId: ADAPTER_ID,
    phase: env.PHASE ?? "1",
    role: "listing",
    marketplaceIds: parseMarketplaces(env.EBAY_MARKETPLACES),
    cacheHintSec: CACHE_HINT_SEC,
    yahooJp: false,
    credentialsConfigured: Boolean(env.EBAY_CLIENT_ID && env.EBAY_CLIENT_SECRET),
    ingestConfigured: Boolean(env.NEST_ADAPTER_INGEST_URL),
  };
}

async function runTick(env: Env) {
  const marketplaces = parseMarketplaces(env.EBAY_MARKETPLACES);
  const queries = parseQueries(env.EBAY_SEARCH_QUERIES_JSON);
  const observedAt = new Date().toISOString();
  const listings: Array<Record<string, unknown>> = [];
  const observations: Array<Record<string, unknown>> = [];
  let dryRun = false;
  const errors: string[] = [];
  const tallyByMarketplace = new Map<EbayMarketplaceId, MarketplaceTally>();
  const tallyFor = (marketplaceId: EbayMarketplaceId): MarketplaceTally => {
    let t = tallyByMarketplace.get(marketplaceId);
    if (!t) {
      t = { marketplaceId, attempted: 0, successCount: 0, failureCount: 0 };
      tallyByMarketplace.set(marketplaceId, t);
    }
    return t;
  };

  for (const marketplaceId of marketplaces) {
    const tally = tallyFor(marketplaceId);
    for (const query of queries) {
      tally.attempted += 1;
      // §7 per-marketplace/per-query isolation — one throw here must never
      // abort the remaining marketplaces/queries in this tick.
      try {
        const result = await searchItemSummary({
          marketplaceId,
          query,
          clientId: env.EBAY_CLIENT_ID,
          clientSecret: env.EBAY_CLIENT_SECRET,
        });
        if (result.dryRun) dryRun = true;
        if (result.error) {
          tally.failureCount += 1;
          tally.errorClass = result.errorClass ?? "unknown";
          errors.push(`${marketplaceId}:${result.error}`);
          continue;
        }
        tally.successCount += 1;
        const marketId = MARKETPLACE_TO_MARKET_ID[marketplaceId];
        for (const item of result.items) {
          const id = `lst_ebay_${marketplaceId}_${item.itemId}`;
          // assetId=query:* is a Nest-side identity hint only (§0.10).
          // AdaptersAdminService.resolveEbayIngestListings substitutes real
          // Asset Master ids (or enqueues unmatched). Never persist as-is.
          listings.push({
            id,
            assetId: `query:${query}`,
            searchQuery: query,
            marketId,
            adapterId: ADAPTER_ID,
            marketplaceId,
            externalItemId: item.itemId,
            title: item.title,
            // PTF-00C P0-A — native marketplace reading only. priceUsdt is
            // NEVER set here; Nest owns the only authoritative USD/EUR/GBP/
            // AUD -> USDT conversion (never assume 1 USD == 1 USDT either).
            nativeAmount: item.priceValue,
            nativeCurrency: item.currency,
            url: item.itemWebUrl,
            imageUrl: item.imageUrl,
            observedAt,
            staleAt: new Date(Date.now() + CACHE_HINT_SEC * 1000).toISOString(),
          });
          observations.push({
            id: `obs_ebay_${marketplaceId}_${item.itemId}`,
            assetId: `query:${query}`,
            searchQuery: query,
            source: ADAPTER_ID,
            marketplaceId,
            nativeAmount: item.priceValue,
            nativeCurrency: item.currency,
            observedAt,
            meta: { title: item.title, externalItemId: item.itemId },
          });
        }
      } catch (e) {
        tally.failureCount += 1;
        tally.errorClass = "unknown";
        errors.push(
          e instanceof Error
            ? `${marketplaceId}:tick_exception:${e.message}`
            : `${marketplaceId}:tick_exception`,
        );
      }
    }
  }

  const marketplaceHealth = marketplaces.map((m) => {
    const t = tallyFor(m);
    return {
      marketplaceId: t.marketplaceId,
      attempted: t.attempted,
      successCount: t.successCount,
      failureCount: t.failureCount,
      errorClass: t.errorClass ?? null,
    };
  });

  // PTF-00C P0-D — ALWAYS attempt the ingest/heartbeat POST. Previously this
  // was gated on `listings.length > 0 || dryRun`, so a real-credentials tick
  // that found zero listings (all queries failed, or a genuinely empty
  // result) sent nothing at all — a full outage was invisible to Nest.
  let forwarded = 0;
  const ingestUrl = env.NEST_ADAPTER_INGEST_URL;
  if (ingestUrl) {
    const batchSize = 40;
    let batchesOk = 0;
    let batchesTotal = 0;
    for (let i = 0; i < Math.max(listings.length, 1); i += batchSize) {
      if (listings.length === 0 && i > 0) break;
      batchesTotal += 1;
      const batchListings = listings.slice(i, i + batchSize);
      const batchObservations = observations.slice(i, i + batchSize);
      try {
        const res = await fetch(ingestUrl, {
          method: "POST",
          headers: {
            "content-type": "application/json",
            ...(env.ADAPTER_INGEST_TOKEN
              ? { "x-adapter-token": env.ADAPTER_INGEST_TOKEN }
              : {}),
          },
          body: JSON.stringify({
            adapterId: ADAPTER_ID,
            worker: SERVICE,
            observedAt,
            dryRun,
            marketplaceIds: marketplaces,
            listings: batchListings,
            observations: batchObservations,
            // §8 heartbeat evidence — sent even when batchListings is empty.
            marketplaceHealth,
            error: errors.length > 0 ? errors.slice(0, 5).join("; ") : undefined,
          }),
        });
        if (res.ok) {
          batchesOk += 1;
        } else {
          errors.push(`ingest HTTP ${res.status} batch ${batchesTotal}`);
        }
      } catch (e) {
        errors.push(
          e instanceof Error
            ? `ingest ${e.message} batch ${batchesTotal}`
            : `ingest_failed batch ${batchesTotal}`,
        );
      }
    }
    if (batchesTotal > 0 && batchesOk === batchesTotal) forwarded = 1;
  }

  return {
    ok: errors.length === 0 || dryRun,
    adapterId: ADAPTER_ID,
    marketplaceIds: marketplaces,
    queries: queries.length,
    listings: listings.length,
    observations: observations.length,
    dryRun,
    forwarded,
    errors,
    marketplaceHealth,
    yahooJp: false,
  };
}

function parseMarketplaces(raw?: string): EbayMarketplaceId[] {
  if (!raw || !raw.trim()) return [...DEFAULT_MARKETPLACES];
  const parts = raw
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean) as EbayMarketplaceId[];
  const allowed = new Set<string>(EBAY_MARKETPLACE_IDS);
  const out = parts.filter((p) => allowed.has(p));
  return out.length ? out : [...DEFAULT_MARKETPLACES];
}

/** Day-1 defaults: watch + trading_card + luxury_bag seed ebay queries */
const DEFAULT_SEARCH_QUERIES = [
  "Rolex Submariner 126610LN",
  "Rolex Daytona 126500LN",
  "Patek Philippe Nautilus 5711/1A-010",
  "Audemars Piguet Royal Oak 15500ST",
  "Omega Seamaster 210.30.42.20.01.001",
  "Pikachu Base Set 58 pokemon card",
  "Charizard Base Set 4 holofoil",
  "PSA 10 Charizard Base Set 4",
  "Dark Magician LOB-005 yugioh",
  "Blue-Eyes White Dragon LOB-001",
  "PSA 10 Blue-Eyes White Dragon LOB",
  "Hermes Birkin 25 Noir togo",
  "Hermes Birkin 30 Gold togo",
  "Chanel Classic Flap Medium black caviar",
  "Louis Vuitton Neverfull MM monogram",
  "Louis Vuitton Speedy 30 monogram",
];

function parseQueries(raw?: string): string[] {
  if (!raw) return [...DEFAULT_SEARCH_QUERIES];
  try {
    const parsed = JSON.parse(raw) as unknown;
    if (Array.isArray(parsed)) {
      const qs = parsed.map(String).filter((s) => s.trim());
      return qs.length ? qs : [...DEFAULT_SEARCH_QUERIES];
    }
  } catch {
    /* fallthrough */
  }
  return [...DEFAULT_SEARCH_QUERIES];
}
