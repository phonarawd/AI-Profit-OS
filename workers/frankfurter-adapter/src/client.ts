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
}

/**
 * No API key — public daily fiat FX. One call for KRW (existing
 * usd_krw-approx display leg) + GBP/EUR/AUD (PTF-00C P0-A/B marketplace
 * normalization legs for Day-1 eBay currencies).
 */
export async function fetchUsdRates(): Promise<FrankfurterUsdRates> {
  const url = new URL(`${API_BASE}/v1/latest`);
  url.searchParams.set("base", "USD");
  url.searchParams.set("symbols", "KRW,GBP,EUR,AUD");
  try {
    const res = await fetch(url.toString(), {
      headers: { accept: "application/json" },
    });
    if (!res.ok) {
      return { dryRun: false, error: `frankfurter ${res.status}` };
    }
    const json = (await res.json()) as {
      date?: string;
      rates?: { KRW?: number; GBP?: number; EUR?: number; AUD?: number };
    };
    if (json.rates?.KRW == null) {
      return { dryRun: false, error: "frankfurter missing KRW" };
    }
    return {
      usdKrw: String(json.rates.KRW),
      usdGbp: json.rates.GBP != null ? String(json.rates.GBP) : undefined,
      usdEur: json.rates.EUR != null ? String(json.rates.EUR) : undefined,
      usdAud: json.rates.AUD != null ? String(json.rates.AUD) : undefined,
      date: json.date,
      dryRun: false,
    };
  } catch (e) {
    return {
      dryRun: false,
      error: e instanceof Error ? e.message : "frankfurter_failed",
    };
  }
}

/** @deprecated kept as a thin alias — use fetchUsdRates (also carries GBP/EUR/AUD). */
export const fetchUsdKrw = fetchUsdRates;
