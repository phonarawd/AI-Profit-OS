/**
 * Yahoo! JAPAN Auction Web Service V2 — keyword search.
 * Dry-run when partner credentials missing (Phase1+ deploy health still ok).
 * Official partner path (v7.22.41) — Day-1 auto-publish still ebay|admin only.
 */

import { MARKET_ID, YAHOO_AUCTION_API_BASE } from "./constants";

export interface YahooAuctionItem {
  auctionId: string;
  title: string;
  priceValue: string;
  currency: string;
  imageUrl?: string;
  auctionUrl?: string;
}

export interface YahooSearchResult {
  marketId: typeof MARKET_ID;
  query: string;
  items: YahooAuctionItem[];
  dryRun: boolean;
  error?: string;
}

export async function searchAuctions(opts: {
  query: string;
  appId?: string;
  limit?: number;
}): Promise<YahooSearchResult> {
  const { query } = opts;
  if (!opts.appId) {
    return { marketId: MARKET_ID, query, items: [], dryRun: true };
  }

  try {
    const url = new URL(`${YAHOO_AUCTION_API_BASE}/search`);
    url.searchParams.set("appid", opts.appId);
    url.searchParams.set("query", query);
    url.searchParams.set("results", String(opts.limit ?? 5));
    url.searchParams.set("output", "json");

    const res = await fetch(url.toString(), {
      headers: { accept: "application/json" },
    });
    if (!res.ok) {
      return {
        marketId: MARKET_ID,
        query,
        items: [],
        dryRun: false,
        error: `yahoo auction ${res.status}`,
      };
    }

    const json = (await res.json()) as {
      ResultSet?: {
        Result?: {
          Item?: Array<{
            AuctionID?: string;
            Title?: string;
            CurrentPrice?: string | number;
            Image?: string;
            AuctionItemUrl?: string;
          }>;
        };
      };
    };

    const raw = json.ResultSet?.Result?.Item ?? [];
    const items: YahooAuctionItem[] = raw
      .filter((it) => it.AuctionID)
      .map((it) => ({
        auctionId: String(it.AuctionID),
        title: String(it.Title ?? ""),
        priceValue: String(it.CurrentPrice ?? "0"),
        currency: "JPY",
        imageUrl: it.Image,
        auctionUrl: it.AuctionItemUrl,
      }));

    return { marketId: MARKET_ID, query, items, dryRun: false };
  } catch (e) {
    return {
      marketId: MARKET_ID,
      query,
      items: [],
      dryRun: false,
      error: e instanceof Error ? e.message : "yahoo search failed",
    };
  }
}
