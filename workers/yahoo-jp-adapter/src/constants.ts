/** yahoo-jp-adapter — Engine §0.0.1c Phase1+ listing leg · official partner */

export const ADAPTER_ID = "yahoo_jp" as const;
export const SERVICE = "yahoo-jp-adapter" as const;
export const MARKET_ID = "yahoo_jp" as const;

/** LY Corporation Yahoo! Auction API (partner credentials) */
export const YAHOO_AUCTION_API_BASE =
  "https://auctions.yahooapis.jp/AuctionWebService/V2";

export const CACHE_HINT_SEC = 600;
export const LISTING_LEG_PHASE = "Phase1+" as const;
