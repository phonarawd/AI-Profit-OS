import { API_BASE } from "./constants";

export interface FrankfurterUsdKrw {
  usdKrw?: string;
  date?: string;
  dryRun: boolean;
  error?: string;
}

/** No API key — public daily fiat FX */
export async function fetchUsdKrw(): Promise<FrankfurterUsdKrw> {
  const url = new URL(`${API_BASE}/v1/latest`);
  url.searchParams.set("base", "USD");
  url.searchParams.set("symbols", "KRW");
  try {
    const res = await fetch(url.toString(), {
      headers: { accept: "application/json" },
    });
    if (!res.ok) {
      return { dryRun: false, error: `frankfurter ${res.status}` };
    }
    const json = (await res.json()) as {
      date?: string;
      rates?: { KRW?: number };
    };
    if (json.rates?.KRW == null) {
      return { dryRun: false, error: "frankfurter missing KRW" };
    }
    return {
      usdKrw: String(json.rates.KRW),
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
