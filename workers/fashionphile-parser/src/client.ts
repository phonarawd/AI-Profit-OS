import { COLLECTION_HANDLES, fashionphileCatalogUrls } from "./constants";

export type FashionphileFetchResult = {
  ok: boolean;
  dryRun: boolean;
  error?: string;
  productsJson: { products?: unknown[] } | null;
};

export function isFashionphileProductsUrl(url: string): boolean {
  try {
    const parsed = new URL(String(url || "").trim());
    if (parsed.protocol !== "https:") return false;
    if (parsed.hostname !== "www.fashionphile.com") return false;
    if (parsed.pathname === "/products.json") return true;
    const match = parsed.pathname.match(
      /^\/collections\/([a-z0-9-]+)\/products\.json$/,
    );
    if (!match) return false;
    return (COLLECTION_HANDLES as readonly string[]).includes(match[1]);
  } catch {
    return false;
  }
}

export async function fetchFashionphileProductsJson(input: {
  url?: string;
}): Promise<FashionphileFetchResult> {
  const url = String(input.url || "").trim();
  if (!isFashionphileProductsUrl(url)) {
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

export async function fetchFashionphileCatalog(input?: {
  pages?: number;
}): Promise<FashionphileFetchResult> {
  const urls = fashionphileCatalogUrls(input?.pages);
  const byId = new Map<string, unknown>();
  const errors: string[] = [];
  for (const url of urls) {
    const fetched = await fetchFashionphileProductsJson({ url });
    if (fetched.error) errors.push(fetched.error);
    const products = fetched.productsJson?.products;
    if (!Array.isArray(products)) continue;
    for (const product of products) {
      if (!product || typeof product !== "object") continue;
      const id = (product as { id?: unknown }).id;
      if (id == null) continue;
      byId.set(String(id), product);
    }
  }
  return {
    ok: errors.length === 0,
    dryRun: false,
    error: errors[0],
    productsJson: { products: [...byId.values()] },
  };
}
