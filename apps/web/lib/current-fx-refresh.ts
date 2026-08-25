import type {
  CurrentFxApproxRequest,
  CurrentFxApproxResponse,
  CurrentFxQuoteIn,
  CurrentFxStatus,
} from "@aipo/sdk/current-fx";
import type { OpportunityFeedItem } from "@aipo/sdk/user-feed";

export const CURRENT_FX_REFRESH_MS = 45_000;

export function krwStatusFromFx(
  fx: CurrentFxApproxResponse | null,
): "ready" | "stale" | "unavailable" | "error" | "loading" {
  if (fx == null) return "unavailable";
  if (fx.fxStatus === "FRESH" && fx.krwDisplayAvailable) return "ready";
  if (fx.fxStatus === "STALE" && fx.krwDisplayAvailable) return "stale";
  return "unavailable";
}

export function quoteKrw(
  fx: CurrentFxApproxResponse | null,
  id: string,
): string | null {
  if (!fx?.krwDisplayAvailable) return null;
  return fx.quotes.find((q) => q.id === id)?.amountKrw ?? null;
}

export function quotesForItems(
  items: OpportunityFeedItem[],
): CurrentFxQuoteIn[] {
  const quotes: CurrentFxQuoteIn[] = [];
  for (const item of items) {
    if (item.expectedProfitUsdt) {
      quotes.push({
        id: `profit:${item.id}`,
        amountUsdt: item.expectedProfitUsdt,
      });
    }
    if (item.requiredCapitalUsdt) {
      quotes.push({
        id: `capital:${item.id}`,
        amountUsdt: item.requiredCapitalUsdt,
      });
    }
    if (item.buyPriceUsdt) {
      quotes.push({ id: `buy:${item.id}`, amountUsdt: item.buyPriceUsdt });
    }
    if (item.sellPriceUsdt) {
      quotes.push({ id: `sell:${item.id}`, amountUsdt: item.sellPriceUsdt });
    }
  }
  return quotes.slice(0, 40);
}

export function fxRequestFromWallet(input: {
  principalUsdt?: string | null;
  profitUsdt?: string | null;
  expectedProfitUsdt?: string | null;
  items?: OpportunityFeedItem[];
}): CurrentFxApproxRequest {
  return {
    principalUsdt: input.principalUsdt ?? null,
    withdrawableProfitUsdt: input.profitUsdt ?? null,
    expectedProfitUsdt: input.expectedProfitUsdt ?? null,
    quotes: quotesForItems(input.items ?? []),
  };
}

export function fxHintFromStatus(status: CurrentFxStatus | undefined): "latest" | "recent" | null {
  if (status === "FRESH") return "latest";
  if (status === "STALE") return "recent";
  return null;
}
