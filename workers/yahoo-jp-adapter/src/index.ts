import {
  authorizeManualAdapterTick,
  requireAdapterIngestHeaders,
} from "../../_shared/adapter-machine-auth";

/**
 * yahoo-jp-adapter — Engine §0.0.1c ACTIVE (Phase1+)
 * Official partner listing leg · yahoo_jp (Yahoo! JAPAN オークション)
 * v7.22.41 Founder lock restores official cooperation · Day-1 auto-publish = ebay|admin only.
 */

import { searchAuctions } from "./auction-api";
import {
  ADAPTER_ID,
  CACHE_HINT_SEC,
  LISTING_LEG_PHASE,
  MARKET_ID,
  SERVICE,
} from "./constants";

export interface Env {
  SERVICE: string;
  PHASE: string;
  /** Yahoo Application ID (partner) — not YAHOO_* Day-1 forbidden comment slot */
  YAHOO_AUCTION_APP_ID?: string;
  YAHOO_SEARCH_QUERIES_JSON?: string;
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
      marketId: MARKET_ID,
      listingLegPhase: LISTING_LEG_PHASE,
      officialPartner: true,
      note: "Phase1+ official partner · Day-1 auto-publish remains ebay|admin",
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
    marketId: MARKET_ID,
    cacheHintSec: CACHE_HINT_SEC,
    credentialsConfigured: Boolean(env.YAHOO_AUCTION_APP_ID),
  };
}

async function runTick(env: Env) {
  const queries = parseQueries(env.YAHOO_SEARCH_QUERIES_JSON);
  const observedAt = new Date().toISOString();
  const listings: Array<Record<string, unknown>> = [];
  const observations: Array<Record<string, unknown>> = [];
  let dryRun = false;
  const errors: string[] = [];

  for (const query of queries) {
    const result = await searchAuctions({
      query,
      appId: env.YAHOO_AUCTION_APP_ID,
    });
    if (result.dryRun) dryRun = true;
    if (result.error) errors.push(`${MARKET_ID}:${result.error}`);
    for (const item of result.items) {
      const id = `lst_yahoo_jp_${item.auctionId}`;
      listings.push({
        id,
        assetId: `query:${query}`,
        marketId: MARKET_ID,
        adapterId: ADAPTER_ID,
        externalItemId: item.auctionId,
        title: item.title,
        priceUsdt: item.priceValue,
        currency: item.currency,
        url: item.auctionUrl,
        imageUrl: item.imageUrl,
        observedAt,
        staleAt: new Date(Date.now() + CACHE_HINT_SEC * 1000).toISOString(),
        meta: { listingLegPhase: LISTING_LEG_PHASE, day1AutoPublish: false },
      });
      observations.push({
        id: `obs_yahoo_jp_${item.auctionId}`,
        assetId: `query:${query}`,
        source: ADAPTER_ID,
        priceUsdt: item.priceValue,
        currency: item.currency,
        observedAt,
        meta: {
          title: item.title,
          externalItemId: item.auctionId,
          listingLegPhase: LISTING_LEG_PHASE,
          day1AutoPublish: false,
        },
      });
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
        marketIds: [MARKET_ID],
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
    marketId: MARKET_ID,
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

const DEFAULT_SEARCH_QUERIES = [
  "ロレックス サブマリーナ 126610LN",
  "パテックフィリップ ノーチラス 5711",
  "エルメス バーキン 25",
  "シャネル クラシックフラップ",
  "ポケモンカード リザードン",
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
