import {
  authorizeManualAdapterTick,
  requireAdapterIngestHeaders,
} from "../../_shared/adapter-machine-auth";

/**
 * amazon-adapter — Engine §0.0.1c ACTIVE (Phase1+)
 * Official partner listing leg · amazon_us|amazon_jp|amazon_de
 * Day-1 auto-publish Opportunity = ebay|admin only (this worker does not publish).
 */

import { searchItems } from "./paapi";
import {
  ADAPTER_ID,
  AMAZON_MARKET_IDS,
  CACHE_HINT_SEC,
  DEFAULT_MARKETPLACES,
  LISTING_LEG_PHASE,
  SERVICE,
  type AmazonMarketId,
} from "./constants";

export interface Env {
  SERVICE: string;
  PHASE: string;
  AMAZON_ACCESS_KEY?: string;
  AMAZON_SECRET_KEY?: string;
  AMAZON_PARTNER_TAG?: string;
  AMAZON_MARKETPLACES?: string;
  AMAZON_SEARCH_QUERIES_JSON?: string;
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
      const denied = authorizeManualAdapterTick(request, env);
      if (denied) return denied;
      const result = await runTick(env);
      return Response.json(result);
    }

    return Response.json({
      ok: true,
      service: env.SERVICE ?? SERVICE,
      adapterId: ADAPTER_ID,
      phase: env.PHASE ?? "1",
      status: "deploy_ready",
      marketIds: parseMarketplaces(env.AMAZON_MARKETPLACES),
      listingLegPhase: LISTING_LEG_PHASE,
      officialPartner: true,
      note: "Phase1+ partner listing leg · Day-1 auto-publish remains ebay|admin",
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
    listingLegPhase: LISTING_LEG_PHASE,
    officialPartner: true,
    marketIds: parseMarketplaces(env.AMAZON_MARKETPLACES),
    cacheHintSec: CACHE_HINT_SEC,
    credentialsConfigured: Boolean(
      env.AMAZON_ACCESS_KEY && env.AMAZON_SECRET_KEY && env.AMAZON_PARTNER_TAG,
    ),
  };
}

async function runTick(env: Env) {
  const marketIds = parseMarketplaces(env.AMAZON_MARKETPLACES);
  const queries = parseQueries(env.AMAZON_SEARCH_QUERIES_JSON);
  const observedAt = new Date().toISOString();
  const listings: Array<Record<string, unknown>> = [];
  const observations: Array<Record<string, unknown>> = [];
  let dryRun = false;
  const errors: string[] = [];

  for (const marketId of marketIds) {
    for (const query of queries) {
      const result = await searchItems({
        marketId,
        query,
        accessKey: env.AMAZON_ACCESS_KEY,
        secretKey: env.AMAZON_SECRET_KEY,
        partnerTag: env.AMAZON_PARTNER_TAG,
      });
      if (result.dryRun) dryRun = true;
      if (result.error) errors.push(`${marketId}:${result.error}`);
      for (const item of result.items) {
        const id = `lst_amazon_${marketId}_${item.asin}`;
        listings.push({
          id,
          assetId: `query:${query}`,
          marketId,
          adapterId: ADAPTER_ID,
          externalItemId: item.asin,
          title: item.title,
          priceUsdt: item.priceValue,
          currency: item.currency,
          url: item.detailPageUrl,
          imageUrl: item.imageUrl,
          observedAt,
          staleAt: new Date(Date.now() + CACHE_HINT_SEC * 1000).toISOString(),
          meta: { listingLegPhase: LISTING_LEG_PHASE, day1AutoPublish: false },
        });
        observations.push({
          id: `obs_amazon_${marketId}_${item.asin}`,
          assetId: `query:${query}`,
          source: ADAPTER_ID,
          priceUsdt: item.priceValue,
          currency: item.currency,
          observedAt,
          meta: {
            title: item.title,
            externalItemId: item.asin,
            listingLegPhase: LISTING_LEG_PHASE,
            day1AutoPublish: false,
          },
        });
      }
    }
  }

  let forwarded = 0;
  const ingestUrl = env.NEST_ADAPTER_INGEST_URL;
  if (ingestUrl && (listings.length > 0 || dryRun)) {
    const res = await fetch(ingestUrl, {
      method: "POST",
      headers: requireAdapterIngestHeaders(env),
      body: JSON.stringify({
        adapterId: ADAPTER_ID,
        worker: SERVICE,
        observedAt,
        dryRun,
        marketIds,
        listings,
        observations,
        listingLegPhase: LISTING_LEG_PHASE,
      }),
    });
    if (res.ok) forwarded = 1;
  }

  return {
    ok: errors.length === 0 || dryRun,
    adapterId: ADAPTER_ID,
    marketIds,
    queries: queries.length,
    listings: listings.length,
    observations: observations.length,
    dryRun,
    forwarded,
    errors,
    listingLegPhase: LISTING_LEG_PHASE,
    officialPartner: true,
  };
}

function parseMarketplaces(raw?: string): AmazonMarketId[] {
  if (!raw || !raw.trim()) return [...DEFAULT_MARKETPLACES];
  const parts = raw
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean) as AmazonMarketId[];
  const allowed = new Set<string>(AMAZON_MARKET_IDS);
  const out = parts.filter((p) => allowed.has(p));
  return out.length ? out : [...DEFAULT_MARKETPLACES];
}

const DEFAULT_SEARCH_QUERIES = [
  "Rolex Submariner 126610LN",
  "Patek Philippe Nautilus 5711",
  "Hermes Birkin 25",
  "Chanel Classic Flap Medium",
  "Pokemon Charizard Base Set",
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
