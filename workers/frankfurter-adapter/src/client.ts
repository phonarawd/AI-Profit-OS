import { API_BASE } from "./constants";

export interface FrankfurterUsdRates {
  usdKrw?: string;
  /**
   * PTF-00C P0-B — raw provider direction (X per 1 USD), exactly as
   * Frankfurter returns it. This worker performs zero FX math (no
   * inversion/derivation) — Nest owns the only authoritative
   * USD/EUR/GBP/AUD -> USDT conversion (see fx-snapshot.service.ts /
   * fx-snapshot-formula.cjs deriveMarketplaceLegs).
   */
  usdGbp?: string;
  usdEur?: string;
  usdAud?: string;
  date?: string;
  dryRun: boolean;
  error?: string;
  httpStatus?: number;
}

function shouldRetry(status: number | null, attempt: number): boolean {
  if (attempt >= 1) return false;
  if (status == null) return true;
  if (status === 429) return false;
  if (status >= 400 && status < 500) return false;
  return status >= 500;
}

function asPositive(raw: unknown): string | undefined {
  if (raw == null) return undefined;
  const n = typeof raw === "number" ? raw : Number(raw);
  if (!Number.isFinite(n) || n <= 0) return undefined;
  return String(raw);
}

async function fetchOnce(): Promise<FrankfurterUsdRates> {
  const url = new URL(`${API_BASE}/v1/latest`);
  url.searchParams.set("base", "USD");
  url.searchParams.set("symbols", "KRW,GBP,EUR,AUD");
  const res = await fetch(url.toString(), {
    headers: { accept: "application/json" },
  });
  if (!res.ok) {
    return { dryRun: false, error: `frankfurter ${res.status}`, httpStatus: res.status };
  }
  let json: {
    date?: string;
    rates?: { KRW?: number; GBP?: number; EUR?: number; AUD?: number };
  };
  try {
    json = (await res.json()) as {
      date?: string;
      rates?: { KRW?: number; GBP?: number; EUR?: number; AUD?: number };
    };
  } catch {
    return { dryRun: false, error: "frankfurter malformed_json", httpStatus: 200 };
  }
  if (json.rates?.KRW == null) {
    return { dryRun: false, error: "frankfurter missing KRW", httpStatus: 200 };
  }
  const usdKrw = asPositive(json.rates.KRW);
  if (!usdKrw) {
    return { dryRun: false, error: "frankfurter invalid KRW", httpStatus: 200 };
  }
  return {
    usdKrw,
    usdGbp: asPositive(json.rates.GBP),
    usdEur: asPositive(json.rates.EUR),
    usdAud: asPositive(json.rates.AUD),
    date: json.date,
    dryRun: false,
    httpStatus: 200,
  };
}

/**
 * No API key — public daily fiat FX. One call for KRW (existing
 * usd_krw-approx display leg) + GBP/EUR/AUD (PTF-00C P0-A/B marketplace
 * normalization legs for Day-1 eBay currencies).
 */
export async function fetchUsdRates(): Promise<FrankfurterUsdRates> {
  try {
    const first = await fetchOnce();
    if (!first.error) return first;
    if (!shouldRetry(first.httpStatus ?? null, 0)) return first;
    await new Promise((resolve) => setTimeout(resolve, 400));
    return await fetchOnce();
  } catch (e) {
    try {
      await new Promise((resolve) => setTimeout(resolve, 400));
      return await fetchOnce();
    } catch (retryErr) {
      return {
        dryRun: false,
        error: retryErr instanceof Error ? retryErr.message : "frankfurter_failed",
      };
    }
  }
}

/** @deprecated kept as a thin alias — use fetchUsdRates (also carries GBP/EUR/AUD). */
export const fetchUsdKrw = fetchUsdRates;
