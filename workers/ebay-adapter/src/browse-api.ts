/**
 * eBay Browse API client — item_summary/search per marketplaceId.
 * Dry-run when credentials missing (Phase1 deploy health still ok).
 */

import {
  BROWSE_BASE,
  IDENTITY_BASE,
  OAUTH_SCOPE,
  type EbayMarketplaceId,
} from "./constants";

export interface BrowseSearchItem {
  itemId: string;
  title: string;
  priceValue: string;
  currency: string;
  imageUrl?: string;
  itemWebUrl?: string;
}

export interface BrowseSearchResult {
  marketplaceId: EbayMarketplaceId;
  query: string;
  items: BrowseSearchItem[];
  dryRun: boolean;
  error?: string;
}

let cachedToken: { value: string; expMs: number } | null = null;

export async function getAppToken(
  clientId: string,
  clientSecret: string,
): Promise<string> {
  const now = Date.now();
  if (cachedToken && cachedToken.expMs > now + 60_000) {
    return cachedToken.value;
  }
  const basic = btoa(`${clientId}:${clientSecret}`);
  const body = new URLSearchParams({
    grant_type: "client_credentials",
    scope: OAUTH_SCOPE,
  });
  const res = await fetch(`${IDENTITY_BASE}/oauth2/token`, {
    method: "POST",
    headers: {
      authorization: `Basic ${basic}`,
      "content-type": "application/x-www-form-urlencoded",
    },
    body,
  });
  if (!res.ok) {
    throw new Error(`ebay oauth ${res.status}`);
  }
  const json = (await res.json()) as {
    access_token: string;
    expires_in: number;
  };
  cachedToken = {
    value: json.access_token,
    expMs: now + (json.expires_in ?? 7200) * 1000,
  };
  return cachedToken.value;
}

export async function searchItemSummary(opts: {
  marketplaceId: EbayMarketplaceId;
  query: string;
  clientId?: string;
  clientSecret?: string;
  limit?: number;
}): Promise<BrowseSearchResult> {
  const { marketplaceId, query } = opts;
  if (!opts.clientId || !opts.clientSecret) {
    return { marketplaceId, query, items: [], dryRun: true };
  }
  try {
    const token = await getAppToken(opts.clientId, opts.clientSecret);
    const url = new URL(`${BROWSE_BASE}/item_summary/search`);
    url.searchParams.set("q", query);
    url.searchParams.set("limit", String(opts.limit ?? 10));
    const res = await fetch(url.toString(), {
      headers: {
        authorization: `Bearer ${token}`,
        "X-EBAY-C-MARKETPLACE-ID": marketplaceId,
        accept: "application/json",
      },
    });
    if (!res.ok) {
      return {
        marketplaceId,
        query,
        items: [],
        dryRun: false,
        error: `browse ${res.status}`,
      };
    }
    const json = (await res.json()) as {
      itemSummaries?: Array<{
        itemId?: string;
        title?: string;
        price?: { value?: string; currency?: string };
        image?: { imageUrl?: string };
        itemWebUrl?: string;
      }>;
    };
    const items: BrowseSearchItem[] = (json.itemSummaries ?? [])
      .filter((it) => it.itemId && it.price?.value)
      .map((it) => ({
        itemId: String(it.itemId),
        title: String(it.title ?? ""),
        priceValue: String(it.price!.value),
        currency: String(it.price!.currency ?? "USD"),
        imageUrl: it.image?.imageUrl,
        itemWebUrl: it.itemWebUrl,
      }));
    return { marketplaceId, query, items, dryRun: false };
  } catch (e) {
    return {
      marketplaceId,
      query,
      items: [],
      dryRun: false,
      error: e instanceof Error ? e.message : "browse_failed",
    };
  }
}
