import { API_BASE, UPSTREAM_TIMEOUT_MS, VS_CURRENCIES } from "./constants";

export interface CoinGeckoTetherQuote {
  usdtKrw?: string;
  usdtUsd?: string;
  providerObservedAt?: string;
  dryRun: boolean;
  error?: string;
  httpStatus?: number;
}

function rejectInvalidRate(raw: unknown): string | undefined {
  if (raw == null) return undefined;
  if (typeof raw === "number") {
    if (!Number.isFinite(raw) || raw <= 0) return undefined;
    return String(raw);
  }
  const s = String(raw).trim();
  if (!s || s.toLowerCase() === "nan" || s.toLowerCase() === "infinity") {
    return undefined;
  }
  const n = Number(s);
  if (!Number.isFinite(n) || n <= 0) return undefined;
  return s;
}

function shouldRetry(status: number | null, attempt: number): boolean {
  if (attempt >= 1) return false;
  if (status == null) return true;
  if (status === 429) return false;
  if (status >= 400 && status < 500) return false;
  return status >= 500;
}

async function boundedFetch(url: string, init: RequestInit): Promise<Response> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), UPSTREAM_TIMEOUT_MS);
  try {
    return await fetch(url, { ...init, signal: controller.signal });
  } finally {
    clearTimeout(timer);
  }
}

async function fetchOnce(opts: {
  demoApiKey?: string;
}): Promise<CoinGeckoTetherQuote> {
  const url = new URL(`${API_BASE}/simple/price`);
  url.searchParams.set("ids", "tether");
  url.searchParams.set("vs_currencies", VS_CURRENCIES);
  url.searchParams.set("include_last_updated_at", "true");
  const res = await boundedFetch(url.toString(), {
    headers: {
      accept: "application/json",
      "x-cg-demo-api-key": opts.demoApiKey as string,
    },
  });
  if (!res.ok) {
    return {
      dryRun: false,
      error: `coingecko ${res.status}`,
      httpStatus: res.status,
    };
  }
  let json: {
    tether?: { krw?: number; usd?: number; last_updated_at?: number };
  };
  try {
    json = (await res.json()) as {
      tether?: { krw?: number; usd?: number; last_updated_at?: number };
    };
  } catch {
    return { dryRun: false, error: "coingecko malformed_json", httpStatus: 200 };
  }
  const usdtKrw = rejectInvalidRate(json.tether?.krw);
  const usdtUsd = rejectInvalidRate(json.tether?.usd);
  if (!usdtKrw && !usdtUsd) {
    return { dryRun: false, error: "coingecko missing_pair", httpStatus: 200 };
  }
  const observedSec = json.tether?.last_updated_at;
  return {
    usdtKrw,
    usdtUsd,
    providerObservedAt:
      typeof observedSec === "number" && Number.isFinite(observedSec)
        ? new Date(observedSec * 1000).toISOString()
        : undefined,
    dryRun: false,
    httpStatus: 200,
  };
}

export async function fetchTetherSimplePrice(opts: {
  demoApiKey?: string;
}): Promise<CoinGeckoTetherQuote> {
  if (!opts.demoApiKey) {
    return { dryRun: true };
  }
  try {
    const first = await fetchOnce(opts);
    if (!first.error) return first;
    if (!shouldRetry(first.httpStatus ?? null, 0)) return first;
    await new Promise((resolve) => setTimeout(resolve, 400));
    return await fetchOnce(opts);
  } catch {
    try {
      await new Promise((resolve) => setTimeout(resolve, 400));
      return await fetchOnce(opts);
    } catch (retryErr) {
      return {
        dryRun: false,
        error:
          retryErr instanceof Error ? retryErr.message : "coingecko_failed",
      };
    }
  }
}
