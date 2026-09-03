import {
  authorizeManualAdapterTick,
  requireAdapterIngestHeaders,
} from "../../_shared/adapter-machine-auth";

/**
 * frankfurter-adapter — Engine §0.0 ACTIVE
 * Fiat FX (USD→KRW/GBP/EUR/AUD) · no signup · Phase1 CF deploy
 * Composes with coingecko for fallback USDT/KRW formula.
 *
 * PTF-00C P0-B: also relays raw USD->GBP/EUR/AUD quotes (Day-1 eBay
 * marketplace currencies) so Nest can durably compose the marketplace
 * normalization legs. This worker performs zero FX math itself.
 */

import { fetchUsdRates } from "./client";
import { ADAPTER_ID, CACHE_HINT_SEC, SERVICE } from "./constants";

export interface Env {
  SERVICE: string;
  PHASE: string;
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
        role: "fx",
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
      note: "Phase1 deploy · fiat FX · no key · yahoo_jp FORBIDDEN",
    });
  },

  async scheduled(_event: unknown, env: Env): Promise<void> {
    await runTick(env);
  },
};

async function runTick(env: Env) {
  const observedAt = new Date().toISOString();
  const quote = await fetchUsdRates();
  const observations: Array<Record<string, unknown>> = [];
  if (quote.usdKrw) {
    observations.push({
      id: `obs_frankfurter_usd_krw_${observedAt}`,
      assetId: "fx:usd_krw",
      source: ADAPTER_ID,
      // PTF-00C P0-A — native reading, not an assertion of USDT.
      nativeAmount: quote.usdKrw,
      nativeCurrency: "KRW",
      observedAt,
      meta: {
        pair: "USD/KRW",
        formulaRole: "fallback_leg",
        frankfurterDate: quote.date,
      },
    });
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
        role: "fx",
        // Raw provider quotes only (X per 1 USD) — Nest inverts/derives.
        fx: {
          usdKrw: quote.usdKrw ?? null,
          usdGbp: quote.usdGbp ?? null,
          usdEur: quote.usdEur ?? null,
          usdAud: quote.usdAud ?? null,
          date: quote.date ?? null,
        },
        observations,
      }),
    });
    if (res.ok) forwarded = 1;
  }

  return {
    ok: !quote.error,
    adapterId: ADAPTER_ID,
    usdKrw: quote.usdKrw ?? null,
    usdGbp: quote.usdGbp ?? null,
    usdEur: quote.usdEur ?? null,
    usdAud: quote.usdAud ?? null,
    date: quote.date ?? null,
    observations: observations.length,
    forwarded,
    error: quote.error,
    yahooJp: false,
  };
}
