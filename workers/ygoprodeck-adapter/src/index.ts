import {
  authorizeManualAdapterTick,
  requireAdapterIngestHeaders,
} from "../../_shared/adapter-machine-auth";

/**
 * ygoprodeck-adapter — Engine §0.0 ACTIVE
 * Yu-Gi-Oh catalog + reference price (no signup key).
 * Catalog alone ≠ listing leg. Phase1 CF deploy.
 */

import { fetchCardInfo } from "./client";
import { ADAPTER_ID, CACHE_HINT_SEC, SERVICE } from "./constants";

export interface Env {
  SERVICE: string;
  PHASE: string;
  YGOPRODECK_NAMES_JSON?: string;
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
        credentialsConfigured: true,
      });
    }
    if (url.pathname === "/tick" && request.method === "POST") {
      const denied = authorizeManualAdapterTick(request, env);
      if (denied) return denied;
      return Response.json(await runTick(env));
    }
    return Response.json({
      ok: true,
      service: env.SERVICE ?? SERVICE,
      adapterId: ADAPTER_ID,
      phase: env.PHASE ?? "1",
      status: "deploy_ready",
      note: "Phase1 deploy · catalog_ref only · no API key · yahoo_jp FORBIDDEN",
    });
  },

  async scheduled(_event: unknown, env: Env): Promise<void> {
    await runTick(env);
  },
};

async function runTick(env: Env) {
  const names = parseNames(env.YGOPRODECK_NAMES_JSON);
  const observedAt = new Date().toISOString();
  const catalog: Array<Record<string, unknown>> = [];
  const observations: Array<Record<string, unknown>> = [];
  const errors: string[] = [];

  for (const fname of names) {
    const result = await fetchCardInfo({ fname });
    if (result.error) errors.push(result.error);
    for (const card of result.cards) {
      catalog.push({
        externalId: card.id,
        name: card.name,
        type: card.type,
        race: card.race,
        imageSmall: card.imageSmall,
        imageUrl: card.imageUrl,
        game: "yugioh",
      });
      if (card.marketHintUsd) {
        observations.push({
          id: `obs_ygoprodeck_${card.id}`,
          assetId: `ygoprodeck:${card.id}`,
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
      headers: requireAdapterIngestHeaders(env),
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
const DEFAULT_YGO_NAMES = [
  "Dark Magician",
  "Blue-Eyes White Dragon",
  "Red-Eyes Black Dragon",
  "Summoned Skull",
  "Exodia the Forbidden One",
  "Left Arm of the Forbidden One",
  "Dark Magician Girl",
  "Monster Reborn",
];

function parseNames(raw?: string): string[] {
  if (!raw) return [...DEFAULT_YGO_NAMES];
  try {
    const parsed = JSON.parse(raw) as unknown;
    if (Array.isArray(parsed)) {
      const ns = parsed.map(String).filter((s) => s.trim());
      return ns.length ? ns : [...DEFAULT_YGO_NAMES];
    }
  } catch {
    /* fallthrough */
  }
  return [...DEFAULT_YGO_NAMES];
}
