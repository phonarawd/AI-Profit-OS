/**
 * pokemontcg-adapter — Engine §0.0 ACTIVE
 * Catalog + reference price hint for trading_card (pokemon) only.
 * Auto Opportunity publish from this source alone = FORBIDDEN.
 * Phase1 CF deploy.
 */

import { fetchCards } from "./client";
import { ADAPTER_ID, CACHE_HINT_SEC, SERVICE } from "./constants";

export interface Env {
  SERVICE: string;
  PHASE: string;
  POKEMONTCG_API_KEY?: string;
  POKEMONTCG_QUERIES_JSON?: string;
  NEST_ADAPTER_INGEST_URL?: string;
  ADAPTER_INGEST_TOKEN?: string;
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);
    if (url.pathname === "/health") {
      return Response.json({
        ok: true,
        service: env.SERVICE ?? SERVICE,
        adapterId: ADAPTER_ID,
        phase: env.PHASE ?? "1",
        role: "catalog_ref",
        cacheHintSec: CACHE_HINT_SEC,
        yahooJp: false,
        credentialsConfigured: Boolean(env.POKEMONTCG_API_KEY),
      });
    }
    if (url.pathname === "/tick" && request.method === "POST") {
      return Response.json(await runTick(env));
    }
    return Response.json({
      ok: true,
      service: env.SERVICE ?? SERVICE,
      adapterId: ADAPTER_ID,
      phase: env.PHASE ?? "1",
      status: "deploy_ready",
      note: "Phase1 deploy · catalog_ref only · listing legs=ebay|admin",
    });
  },

  async scheduled(_event: unknown, env: Env): Promise<void> {
    await runTick(env);
  },
};

async function runTick(env: Env) {
  const queries = parseQueries(env.POKEMONTCG_QUERIES_JSON);
  const observedAt = new Date().toISOString();
  const catalog: Array<Record<string, unknown>> = [];
  const observations: Array<Record<string, unknown>> = [];
  const errors: string[] = [];

  for (const query of queries) {
    const result = await fetchCards({
      query,
      apiKey: env.POKEMONTCG_API_KEY,
    });
    if (result.error) errors.push(result.error);
    for (const card of result.cards) {
      catalog.push({
        externalId: card.id,
        name: card.name,
        setName: card.setName,
        number: card.number,
        rarity: card.rarity,
        imageSmall: card.imageSmall,
        imageLarge: card.imageLarge,
        game: "pokemon",
      });
      if (card.marketHintUsd) {
        observations.push({
          id: `obs_pokemontcg_${card.id}`,
          assetId: `pokemontcg:${card.id}`,
          source: ADAPTER_ID,
          priceUsdt: card.marketHintUsd,
          currency: "USD",
          observedAt,
          meta: {
            role: "catalog_ref",
            listingLeg: false,
            name: card.name,
          },
        });
      }
    }
  }

  let forwarded = 0;
  if (env.NEST_ADAPTER_INGEST_URL) {
    const res = await fetch(env.NEST_ADAPTER_INGEST_URL, {
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
        role: "catalog_ref",
        catalog,
        observations,
      }),
    });
    if (res.ok) forwarded = 1;
  }

  return {
    ok: errors.length === 0,
    adapterId: ADAPTER_ID,
    catalog: catalog.length,
    observations: observations.length,
    forwarded,
    errors,
    yahooJp: false,
    listingLeg: false,
  };
}

/** Aligned to trading_card seed (Engine §0.0 vertical) */
const DEFAULT_POKEMON_QUERIES = [
  "name:pikachu",
  "name:charizard",
  "name:charmander",
  "name:umbreon",
  "name:rayquaza",
  "name:abra",
  "name:froakie",
  "name:rowlet",
  "name:zapdos",
];

function parseQueries(raw?: string): string[] {
  if (!raw) return [...DEFAULT_POKEMON_QUERIES];
  try {
    const parsed = JSON.parse(raw) as unknown;
    if (Array.isArray(parsed)) {
      const qs = parsed.map(String).filter((s) => s.trim());
      return qs.length ? qs : [...DEFAULT_POKEMON_QUERIES];
    }
  } catch {
    /* fallthrough */
  }
  return [...DEFAULT_POKEMON_QUERIES];
}
