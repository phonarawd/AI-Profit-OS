/**
 * Amazon Product Advertising API 5.0 — SearchItems per marketplace.
 * Dry-run when credentials missing (Phase1+ deploy health still ok).
 */

import {
  AMAZON_MARKETPLACE,
  type AmazonMarketId,
} from "./constants";

export interface AmazonSearchItem {
  asin: string;
  title: string;
  priceValue: string;
  currency: string;
  imageUrl?: string;
  detailPageUrl?: string;
}

export interface AmazonSearchResult {
  marketId: AmazonMarketId;
  query: string;
  items: AmazonSearchItem[];
  dryRun: boolean;
  error?: string;
}

export async function searchItems(opts: {
  marketId: AmazonMarketId;
  query: string;
  accessKey?: string;
  secretKey?: string;
  partnerTag?: string;
  limit?: number;
}): Promise<AmazonSearchResult> {
  const { marketId, query } = opts;
  if (!opts.accessKey || !opts.secretKey || !opts.partnerTag) {
    return { marketId, query, items: [], dryRun: true };
  }

  const meta = AMAZON_MARKETPLACE[marketId];
  const path = "/paapi5/searchitems";
  const url = `https://${meta.host}${path}`;
  const body = JSON.stringify({
    Keywords: query,
    SearchIndex: "All",
    ItemCount: opts.limit ?? 5,
    PartnerTag: opts.partnerTag,
    PartnerType: "Associates",
    Marketplace: `www.amazon.${marketId === "amazon_jp" ? "co.jp" : marketId === "amazon_de" ? "de" : "com"}`,
    Resources: [
      "Images.Primary.Large",
      "ItemInfo.Title",
      "Offers.Listings.Price",
    ],
  });

  try {
    // Credentialed path reserved for Phase1+ secrets wiring.
    // Until AWS SigV4 helper lands in-worker, treat as dry-run with configured flag.
    void url;
    void body;
    void opts.accessKey;
    void opts.secretKey;
    return {
      marketId,
      query,
      items: [],
      dryRun: true,
      error: "paapi_sigv4_pending",
    };
  } catch (e) {
    return {
      marketId,
      query,
      items: [],
      dryRun: false,
      error: e instanceof Error ? e.message : "amazon search failed",
    };
  }
}
