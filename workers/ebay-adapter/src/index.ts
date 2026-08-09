/**
 * ebay-adapter — Engine §0.0 ACTIVE
 * Browse API · marketplaceId×N (EBAY_US|GB|DE|AU) · listing legs only
 *
 * Phase1 CF deploy (cron/fetch) → POST listings to Nest ingest.
 * yahoo_jp / Yahoo Auction path = FORBIDDEN (0).
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

  for (const marketplaceId of marketplaces) {
    for (const query of queries) {
      const result = await searchItemSummary({
        marketplaceId,
        query,
        clientId: env.EBAY_CLIENT_ID,
        clientSecret: env.EBAY_CLIENT_SECRET,
      });
      if (result.dryRun) dryRun = true;
      if (result.error) errors.push(`${marketplaceId}:${result.error}`);
      const marketId = MARKETPLACE_TO_MARKET_ID[marketplaceId];
      for (const item of result.items) {
        const id = `lst_ebay_${marketplaceId}_${item.itemId}`;
        listings.push({
          id,
          assetId: `query:${query}`,
          marketId,
          adapterId: ADAPTER_ID,
          marketplaceId,
          externalItemId: item.itemId,
          title: item.title,
          priceUsdt: item.priceValue,
          currency: item.currency,
          url: item.itemWebUrl,
          imageUrl: item.imageUrl,
          observedAt,
          staleAt: new Date(Date.now() + CACHE_HINT_SEC * 1000).toISOString(),
        });
        observations.push({
          id: `obs_ebay_${marketplaceId}_${item.itemId}`,
          assetId: `query:${query}`,
          source: ADAPTER_ID,
          marketplaceId,
          priceUsdt: item.priceValue,
          currency: item.currency,
          observedAt,
          meta: { title: item.title, externalItemId: item.itemId },
        });
      }
    }
  }

  let forwarded = 0;
  const ingestUrl = env.NEST_ADAPTER_INGEST_URL;
  if (ingestUrl && (listings.length > 0 || dryRun)) {
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
