/**
 * frankfurter-adapter — Engine §0.0 ACTIVE
 * Fiat FX (USD→KRW/GBP/EUR/AUD) · no signup · Phase1 CF deploy
 * Composes with coingecko for fallback USDT/KRW formula.
 *
 * This worker relays raw provider directions only. Nest owns authoritative
 * inversion/derivation and snapshot persistence.
 */

import { fetchUsdRates } from "./client";
import {
  ADAPTER_ID,
  CACHE_HINT_SEC,
  INGEST_TIMEOUT_MS,
  SERVICE,
} from "./constants";

export interface Env {
  SERVICE: string;
  PHASE: string;
  ALLOW_MANUAL_TICK?: string;
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
        ingestConfigured: Boolean(env.NEST_ADAPTER_INGEST_URL),
        manualTickEnabled: env.ALLOW_MANUAL_TICK === "true",
      });
    }
    if (url.pathname === "/tick" && request.method === "POST") {
      if (env.ALLOW_MANUAL_TICK !== "true") {
        return Response.json(
          { ok: false, error: "MANUAL_TICK_DISABLED", adapterId: ADAPTER_ID },
          { status: 403 },
        );
      }
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

async function fetchIngest(url: string, init: RequestInit): Promise<Response> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), INGEST_TIMEOUT_MS);
  try {
    return await fetch(url, { ...init, signal: controller.signal });
  } finally {
    clearTimeout(timer);
  }
}

async function runTick(env: Env) {
  const observedAt = new Date().toISOString();
  const quote = await fetchUsdRates();
  const observations: Array<Record<string, unknown>> = [];
  if (quote.usdKrw) {
    observations.push({
      id: `obs_frankfurter_usd_krw_${observedAt}`,
      assetId: "fx:usd_krw",
      source: ADAPTER_ID,
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
  let forwardError: string | null = null;
  if (env.NEST_ADAPTER_INGEST_URL && !quote.error) {
    try {
      const res = await fetchIngest(env.NEST_ADAPTER_INGEST_URL, {
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
      else forwardError = `nest_ingest_${res.status}`;
    } catch {
      forwardError = "nest_ingest_network_error";
    }
  } else if (!quote.error) {
    forwardError = "nest_ingest_unconfigured";
  }

  const ok = !quote.error && forwarded === 1;
  return {
    ok,
    adapterId: ADAPTER_ID,
    usdKrw: quote.usdKrw ?? null,
    usdGbp: quote.usdGbp ?? null,
    usdEur: quote.usdEur ?? null,
    usdAud: quote.usdAud ?? null,
    date: quote.date ?? null,
    observations: observations.length,
    forwarded,
    error: quote.error ?? forwardError ?? undefined,
    yahooJp: false,
  };
}
