/**
 * UI §38.10.3 — Market partner logo accessors.
 * File SSOT = `assets/markets/manifest.json` (verify:market-partner-trust).
 * This module mirrors status for runtime render guards (ready-only marks).
 */

export type MarketLogoStatus = "blocked" | "ready";

export type MarketLogoEntry = {
  id: string;
  file: string;
  path: string;
  status: MarketLogoStatus;
  partnerIds: string[];
  labelKo: string;
  tier: "A" | "B" | "C";
  displayOrder: number;
  variant: string;
  blocker?: string;
};

/** Keep in sync with assets/markets/manifest.json — CI enforces. */
export const MARKET_LOGOS: readonly MarketLogoEntry[] = [
  {
    id: "ebay",
    file: "ebay.svg",
    path: "assets/markets/ebay.svg",
    status: "blocked",
    partnerIds: ["ebay_us", "ebay_gb", "ebay_de", "ebay_au"],
    labelKo: "이베이",
    tier: "A",
    displayOrder: 1,
    variant: "official_monochrome_dark",
  },
  {
    id: "amazon",
    file: "amazon.svg",
    path: "assets/markets/amazon.svg",
    status: "blocked",
    partnerIds: ["amazon_us", "amazon_jp", "amazon_de"],
    labelKo: "아마존",
    tier: "A",
    displayOrder: 2,
    variant: "official_monochrome_dark",
  },
  {
    id: "yahoo-jp",
    file: "yahoo-jp.svg",
    path: "assets/markets/yahoo-jp.svg",
    status: "blocked",
    partnerIds: ["yahoo_jp"],
    labelKo: "Yahoo! JAPAN オークション",
    tier: "A",
    displayOrder: 3,
    variant: "official_monochrome_dark",
  },
  {
    id: "pokemontcg",
    file: "pokemontcg.svg",
    path: "assets/markets/pokemontcg.svg",
    status: "blocked",
    partnerIds: ["pokemontcg"],
    labelKo: "포켓몬 TCG 공식 API",
    tier: "B",
    displayOrder: 4,
    variant: "official_monochrome_dark",
  },
  {
    id: "ygoprodeck",
    file: "ygoprodeck.svg",
    path: "assets/markets/ygoprodeck.svg",
    status: "blocked",
    partnerIds: ["ygoprodeck"],
    labelKo: "유희왕 카드 DB",
    tier: "B",
    displayOrder: 5,
    variant: "official_monochrome_dark",
  },
  {
    id: "coingecko",
    file: "coingecko.svg",
    path: "assets/markets/coingecko.svg",
    status: "blocked",
    partnerIds: ["coingecko"],
    labelKo: "CoinGecko",
    tier: "C",
    displayOrder: 6,
    variant: "official_monochrome_dark",
  },
  {
    id: "frankfurter",
    file: "frankfurter.svg",
    path: "assets/markets/frankfurter.svg",
    status: "blocked",
    partnerIds: ["frankfurter"],
    labelKo: "Frankfurter",
    tier: "C",
    displayOrder: 7,
    variant: "official_monochrome_dark",
  },
] as const;

export const REQUIRED_MARKET_LOGO_FILES = [
  "ebay.svg",
  "amazon.svg",
  "yahoo-jp.svg",
  "pokemontcg.svg",
  "ygoprodeck.svg",
  "coingecko.svg",
  "frankfurter.svg",
] as const;

export function listMarketLogos(): MarketLogoEntry[] {
  return [...MARKET_LOGOS].sort((a, b) => a.displayOrder - b.displayOrder);
}

/** Ready-only — blocked SVGs never render as marks. */
export function listReadyMarketLogos(): MarketLogoEntry[] {
  return listMarketLogos().filter((l) => l.status === "ready");
}

export function marketLogoBlocker(): {
  id: string;
  status: "blocked";
  blockedIds: string[];
} | null {
  const blocked = listMarketLogos().filter((l) => l.status !== "ready");
  if (blocked.length === 0) return null;
  return {
    id: "market-partner-logo-svgs",
    status: "blocked",
    blockedIds: blocked.map((l) => l.file),
  };
}
