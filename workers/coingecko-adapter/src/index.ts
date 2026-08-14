/**
 * coingecko-adapter — Engine §0.0 ACTIVE
 * USDT↔KRW/USD via simple/price · Demo key · Phase1 CF deploy
 */

import { fetchTetherSimplePrice } from "./client";
import { ADAPTER_ID, CACHE_HINT_SEC, SERVICE } from "./constants";

export interface Env {
  SERVICE: string;
  PHASE: string;
  COINGECKO_DEMO_API_KEY?: string;
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
        credentialsConfigured: Boolean(env.COINGECKO_DEMO_API_KEY),
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
      note: "Phase1 deploy · FX primary USDT/KRW · yahoo_jp FORBIDDEN",
    });
  },

  async scheduled(_event: unknown, env: Env): Promise<void> {
    await runTick(env);
  },
};

async function runTick(env: Env) {
  const observedAt = new Date().toISOString();
  const quote = await fetchTetherSimplePrice({
    demoApiKey: env.COINGECKO_DEMO_API_KEY,
  });
  const observations: Array<Record<string, unknown>> = [];
  if (quote.usdtKrw) {
    observations.push({
      id: `obs_coingecko_usdt_krw_${observedAt}`,
      assetId: "fx:usdt_krw",
      source: ADAPTER_ID,
      // PTF-00C P0-A — native reading (USDT priced in KRW), not priceUsdt.
      nativeAmount: quote.usdtKrw,
      nativeCurrency: "KRW",
      observedAt,
      meta: { pair: "USDT/KRW", formulaRole: "primary" },
    });
  }
  if (quote.usdtUsd) {
    observations.push({
      id: `obs_coingecko_usdt_usd_${observedAt}`,
      assetId: "fx:usdt_usd",
      source: ADAPTER_ID,
      nativeAmount: quote.usdtUsd,
      nativeCurrency: "USD",
      observedAt,
      meta: { pair: "USDT/USD", formulaRole: "fallback_leg" },
    });
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
        role: "fx",
        dryRun: quote.dryRun,
        fx: {
          usdtKrw: quote.usdtKrw ?? null,
          usdtUsd: quote.usdtUsd ?? null,
        },
        observations,
      }),
    });
    if (res.ok) forwarded = 1;
  }

  return {
    ok: !quote.error || quote.dryRun,
    adapterId: ADAPTER_ID,
    dryRun: quote.dryRun,
    usdtKrw: quote.usdtKrw ?? null,
    usdtUsd: quote.usdtUsd ?? null,
    observations: observations.length,
    forwarded,
    error: quote.error,
    yahooJp: false,
  };
}
