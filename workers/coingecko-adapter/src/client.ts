import { API_BASE } from "./constants";

export interface CoinGeckoTetherQuote {
  usdtKrw?: string;
  usdtUsd?: string;
  dryRun: boolean;
  error?: string;
}

export async function fetchTetherSimplePrice(opts: {
  demoApiKey?: string;
}): Promise<CoinGeckoTetherQuote> {
  if (!opts.demoApiKey) {
    return { dryRun: true };
  }
  const url = new URL(`${API_BASE}/simple/price`);
  url.searchParams.set("ids", "tether");
  url.searchParams.set("vs_currencies", "krw,usd");
  try {
    const res = await fetch(url.toString(), {
      headers: {
        accept: "application/json",
        "x-cg-demo-api-key": opts.demoApiKey,
      },
    });
    if (!res.ok) {
      return { dryRun: false, error: `coingecko ${res.status}` };
    }
    const json = (await res.json()) as {
      tether?: { krw?: number; usd?: number };
    };
    return {
      usdtKrw:
        json.tether?.krw != null ? String(json.tether.krw) : undefined,
      usdtUsd:
        json.tether?.usd != null ? String(json.tether.usd) : undefined,
      dryRun: false,
    };
  } catch (e) {
    return {
      dryRun: false,
      error: e instanceof Error ? e.message : "coingecko_failed",
    };
  }
}
