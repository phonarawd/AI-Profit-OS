/**
 * coingecko-adapter — Engine §0.0 ACTIVE
 * USDT market quotes via one batched simple/price call (krw,usd).
 * Demo/free plan only. Browser never calls CoinGecko.
 */

import { fetchTetherSimplePrice } from "./client";
import {
  ADAPTER_ID,
  CACHE_HINT_SEC,
  COINGECKO_MONTHLY_LIMIT,
  INGEST_TIMEOUT_MS,
  MIN_FETCH_GAP_MS,
  SERVICE,
  UPSTREAM_INTERVAL_SEC,
} from "./constants";

export interface Env {
  SERVICE: string;
  PHASE: string;
  /** Manual HTTP tick is disabled in production to protect the free quota. */
  ALLOW_MANUAL_TICK?: string;
  COINGECKO_DEMO_API_KEY?: string;
  NEST_ADAPTER_INGEST_URL?: string;
  ADAPTER_INGEST_TOKEN?: string;
}

type TickResult = Record<string, unknown>;

let inflight: Promise<TickResult> | null = null;
let lastSuccessMs = 0;
let lastFetchMs = 0;
let lastFailureMs = 0;
let consecutiveFailures = 0;
let lastTick: TickResult | null = null;

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
        plan: "FREE_DEMO",
        monthlyLimit: COINGECKO_MONTHLY_LIMIT,
        estimatedMonthlyCalls: Math.ceil((30 * 24 * 3600) / UPSTREAM_INTERVAL_SEC),
        lastFetchAt: lastFetchMs ? new Date(lastFetchMs).toISOString() : null,
        lastSuccessAt: lastSuccessMs ? new Date(lastSuccessMs).toISOString() : null,
        lastFailureAt: lastFailureMs ? new Date(lastFailureMs).toISOString() : null,
        consecutiveFailures,
        yahooJp: false,
        credentialsConfigured: Boolean(env.COINGECKO_DEMO_API_KEY),
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
      return Response.json(await runTickSingleFlight(env));
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
    await runTickSingleFlight(env);
  },
};

function runTickSingleFlight(env: Env): Promise<TickResult> {
  if (inflight) return inflight;
  inflight = runTick(env).finally(() => {
    inflight = null;
  });
  return inflight;
}

function budgetLevel(estimatedMonthlyCalls: number): string {
  const ratio = estimatedMonthlyCalls / COINGECKO_MONTHLY_LIMIT;
  if (ratio >= 0.8) return "CRITICAL";
  if (ratio >= 0.6) return "WARNING";
  return "NORMAL";
}

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
  const now = Date.now();
  // Protect Demo quota after every real attempt, including failed publish.
  // A failed Nest forward must not cause an immediate new CoinGecko call.
  if (lastTick && lastFetchMs > 0 && now - lastFetchMs < MIN_FETCH_GAP_MS) {
    return { ...lastTick, reused: true, singleFlight: true };
  }

  lastFetchMs = now;
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
      nativeAmount: quote.usdtKrw,
      nativeCurrency: "KRW",
      observedAt: quote.providerObservedAt ?? observedAt,
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
      observedAt: quote.providerObservedAt ?? observedAt,
      meta: { pair: "USDT/USD", formulaRole: "fallback_leg" },
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
          observedAt: quote.providerObservedAt ?? observedAt,
          role: "fx",
          dryRun: quote.dryRun,
          fx: {
            usdtKrw: quote.usdtKrw ?? null,
            usdtUsd: quote.usdtUsd ?? null,
            providerObservedAt: quote.providerObservedAt ?? null,
          },
          observations,
        }),
      });
      const nestBody = (await res.json().catch(() => null)) as
        | { ok?: boolean; error?: string }
        | null;
      if (res.ok && nestBody && nestBody.ok === false) {
        forwarded = 0;
        forwardError = nestBody.error ?? "nest_ingest_rejected";
      } else if (res.ok) {
        forwarded = 1;
      } else {
        forwardError = `nest_ingest_${res.status}`;
      }
    } catch {
      forwardError = "nest_ingest_network_error";
    }
  } else if (!quote.dryRun && !quote.error) {
    forwardError = "nest_ingest_unconfigured";
  }

  const estimatedMonthlyCalls = Math.ceil((30 * 24 * 3600) / UPSTREAM_INTERVAL_SEC);
  const published = quote.dryRun || forwarded === 1;
  const ok = Boolean(quote.dryRun) || (!quote.error && forwarded === 1);
  const error = quote.error ?? forwardError ?? undefined;
  const result = {
    ok,
    adapterId: ADAPTER_ID,
    dryRun: quote.dryRun,
    usdtKrw: quote.usdtKrw ?? null,
    usdtUsd: quote.usdtUsd ?? null,
    providerObservedAt: quote.providerObservedAt ?? null,
    observations: observations.length,
    forwarded,
    published,
    error,
    yahooJp: false,
    reused: false,
    singleFlight: true,
    budget: {
      plan: "FREE_DEMO",
      intervalSec: UPSTREAM_INTERVAL_SEC,
      estimatedMonthlyCalls,
      monthlyLimit: COINGECKO_MONTHLY_LIMIT,
      level: budgetLevel(estimatedMonthlyCalls),
    },
  };

  // Store every real attempt result for the 9m quota gap. Only end-to-end
  // provider + Nest publication counts as a success heartbeat.
  if (!quote.dryRun) lastTick = result;
  if (ok && !quote.dryRun) {
    lastSuccessMs = now;
    consecutiveFailures = 0;
  } else if (!quote.dryRun) {
    lastFailureMs = now;
    consecutiveFailures += 1;
  }
  return result;
}
