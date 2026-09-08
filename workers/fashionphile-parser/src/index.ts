/**
 * fashionphile-parser — Engine §0.0.2c
 * Public Shopify products.json → source_observations only.
 * Listing-leg persist = 0.
 */

import {
  authorizeManualAdapterTick,
  requireAdapterIngestHeaders,
} from "../../_shared/adapter-machine-auth";
import { fetchFashionphileProductsJson } from "./client";
import {
  ADAPTER_ID,
  CACHE_HINT_SEC,
  DEFAULT_PRODUCTS_URL,
  LISTING_LEG,
  SERVICE,
} from "./constants";

export interface Env {
  SERVICE: string;
  PHASE: string;
  FASHIONPHILE_PRODUCTS_URL?: string;
  NEST_ADAPTER_INGEST_URL?: string;
  ADAPTER_INGEST_TOKEN?: string;
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);
    if (url.pathname === "/health") {
      return Response.json(healthPayload(env));
    }
    if (url.pathname === "/tick" && request.method === "POST") {
      const denied = authorizeManualAdapterTick(request, env);
      if (denied) return denied;
      return Response.json(await runTick(env));
    }
    return Response.json({
      ok: true,
      service: env.SERVICE ?? SERVICE,
      adapterId: ADAPTER_ID,
      phase: env.PHASE ?? "1",
      status: "deploy_ready",
      persistToListingLeg: LISTING_LEG,
      note: "observation parser · Day-1 listing remains ebay|admin",
    });
  },

  async scheduled(_event: unknown, env: Env): Promise<void> {
    await runTick(env);
  },
};

function healthPayload(env: Env) {
  return {
    ok: true,
    service: env.SERVICE ?? SERVICE,
    adapterId: ADAPTER_ID,
    phase: env.PHASE ?? "1",
    role: "observation",
    persistToListingLeg: LISTING_LEG,
    cacheHintSec: CACHE_HINT_SEC,
    productsUrl: env.FASHIONPHILE_PRODUCTS_URL || DEFAULT_PRODUCTS_URL,
    ingestAuthConfigured: Boolean(env.ADAPTER_INGEST_TOKEN),
  };
}

async function runTick(env: Env) {
  const observedAt = new Date().toISOString();
  const fetched = await fetchFashionphileProductsJson({
    url: env.FASHIONPHILE_PRODUCTS_URL || DEFAULT_PRODUCTS_URL,
  });
  const extracted = extractLocal(fetched.productsJson, observedAt);
  const observations = extracted.accepted;
  const errors: string[] = [];
  if (fetched.error) errors.push(fetched.error);

  let forwarded = 0;
  const ingestUrl = env.NEST_ADAPTER_INGEST_URL;
  if (ingestUrl) {
    const res = await fetch(ingestUrl, {
      method: "POST",
      headers: requireAdapterIngestHeaders(env),
      body: JSON.stringify({
        adapterId: ADAPTER_ID,
        worker: SERVICE,
        role: "observation",
        observedAt,
        listings: [],
        observations,
        error: errors[0] || undefined,
      }),
    });
    if (res.ok) forwarded = 1;
    else errors.push(`ingest_http_${res.status}`);
  }

  return {
    ok: errors.length === 0,
    adapterId: ADAPTER_ID,
    persistToListingLeg: LISTING_LEG,
    listings: 0,
    observations: observations.length,
    rejected: extracted.rejected.length,
    forwarded,
    errors,
    dryRun: fetched.dryRun,
  };
}

/**
 * Worker-local extract (no CJS require). Mirrors fashionphile-observation.cjs
 * enough to emit observation rows; Nest re-validates before persist.
 */
function extractLocal(
  productsJson: { products?: unknown[] } | null,
  observedAt: string,
) {
  const products = Array.isArray(productsJson?.products)
    ? productsJson.products
    : [];
  const accepted: Array<Record<string, unknown>> = [];
  const rejected: Array<Record<string, unknown>> = [];
  const bagRe =
    /handbag|bag|purse|tote|clutch|satchel|shoulder|crossbody|backpack|wallet|leather goods|kelly|birkin|constance/i;
  for (const raw of products) {
    if (!raw || typeof raw !== "object") {
      rejected.push({ reason: "invalid_product" });
      continue;
    }
    const p = raw as Record<string, unknown>;
    const shopifyId = p.id != null ? String(p.id).trim() : "";
    const handle = String(p.handle ?? "").trim();
    const title = String(p.title ?? "").trim();
    const brand = String(p.vendor ?? "").trim();
    const productType = String(p.product_type ?? "").trim();
    const variants = Array.isArray(p.variants) ? p.variants : [];
    let price = "";
    let sku = "";
    for (const v of variants) {
      if (!v || typeof v !== "object") continue;
      const vr = v as Record<string, unknown>;
      const pr = String(vr.price ?? "").trim();
      if (/^[0-9]+(\.[0-9]+)?$/.test(pr) && Number(pr) > 0) {
        price = pr;
        sku = String(vr.sku ?? vr.id ?? "").trim();
        break;
      }
    }
    const images = Array.isArray(p.images) ? p.images : [];
    const img0 =
      images[0] && typeof images[0] === "object"
        ? (images[0] as Record<string, unknown>)
        : null;
    const imageUrl = img0?.src ? String(img0.src).trim() : "";
    if (!shopifyId || !handle) {
      rejected.push({ reason: "STABLE_PRODUCT_ID", handle });
      continue;
    }
    if (!bagRe.test(`${productType} ${title}`)) {
      rejected.push({ reason: "SUPPORTED_CATEGORY", handle, productType });
      continue;
    }
    if (!price) {
      rejected.push({ reason: "VALID_CURRENT_PRICE", handle });
      continue;
    }
    if (!imageUrl) {
      rejected.push({ reason: "VALID_IMAGE", handle });
      continue;
    }
    const externalItemId = [shopifyId, handle, sku || shopifyId].join(":");
    accepted.push({
      source: ADAPTER_ID,
      externalItemId,
      url: `https://www.fashionphile.com/products/${encodeURIComponent(handle)}`,
      imageUrl,
      nativeAmount: price,
      nativeCurrency: "USD",
      title,
      observedAt,
      staleAt: new Date(Date.parse(observedAt) + CACHE_HINT_SEC * 1000).toISOString(),
      persistToListingLeg: false,
      meta: {
        priceKind: "listing_sale",
        brand,
        sku,
        handle,
        shopifyId,
        categoryHint: "luxury_bag",
        productType,
      },
    });
  }
  return { accepted, rejected };
}
