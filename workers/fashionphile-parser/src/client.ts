import { DEFAULT_PRODUCTS_URL } from "./constants";

export type FashionphileFetchResult = {
  ok: boolean;
  dryRun: boolean;
  error?: string;
  productsJson: { products?: unknown[] } | null;
};

export async function fetchFashionphileProductsJson(input: {
  url?: string;
}): Promise<FashionphileFetchResult> {
  const url = String(input.url || DEFAULT_PRODUCTS_URL).trim();
  if (!url.startsWith("https://www.fashionphile.com/")) {
    return {
      ok: false,
      dryRun: false,
      error: "FASHIONPHILE_HOST_NOT_ALLOWED",
      productsJson: null,
    };
  }
  try {
    const res = await fetch(url, {
      method: "GET",
      headers: { accept: "application/json" },
      signal: AbortSignal.timeout(12_000),
    });
    if (res.status === 403 || res.status === 401) {
      return {
        ok: false,
        dryRun: false,
        error: `ACCESS_BLOCKED:${res.status}`,
        productsJson: null,
      };
    }
    if (!res.ok) {
      return {
        ok: false,
        dryRun: false,
        error: `HTTP_${res.status}`,
        productsJson: null,
      };
    }
    const json = (await res.json()) as { products?: unknown[] };
    if (!json || !Array.isArray(json.products)) {
      return {
        ok: false,
        dryRun: false,
        error: "malformed_products_json",
        productsJson: null,
      };
    }
    return { ok: true, dryRun: false, productsJson: json };
  } catch (err) {
    return {
      ok: false,
      dryRun: false,
      error: err instanceof Error ? err.message.slice(0, 160) : "fetch_failed",
      productsJson: null,
    };
  }
}
