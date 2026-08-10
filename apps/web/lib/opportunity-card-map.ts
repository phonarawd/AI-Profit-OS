/**
 * Nest opportunity card → OpportunityCardModel
 * 필드 pass-through · UI 재계산 0 · 홈/수익 공용 (중복0)
 */
import type { OpportunityFeedItem } from "@aipo/sdk/user-feed";
import type { OpportunityCardModel } from "@aipo/ui/components/opportunity";

function asString(v: unknown, fallback = ""): string {
  return typeof v === "string" ? v : fallback;
}

function asNumber(v: unknown, fallback = 0): number {
  return typeof v === "number" && Number.isFinite(v) ? v : fallback;
}

function asBucket(
  v: unknown,
): OpportunityCardModel["bucket"] | undefined {
  if (v === "affordable" || v === "nearMiss" || v === "lockedHigh") return v;
  return undefined;
}

export function toOpportunityCardModel(
  item: OpportunityFeedItem,
): OpportunityCardModel | null {
  const id = asString(item.id);
  if (!id) return null;
  const assetLabel = asString(item.assetLabel);
  return {
    id,
    arbitrageTypeKo: asString(item.arbitrageTypeKo),
    buyMarketLabelKo: asString(item.buyMarketLabelKo) || undefined,
    sellMarketLabelKo: asString(item.sellMarketLabelKo) || undefined,
    buyMarketId: asString(item.buyMarketId) || undefined,
    sellMarketId: asString(item.sellMarketId) || undefined,
    assetLabel,
    assetImageUrl:
      typeof item.assetImageUrl === "string" || item.assetImageUrl === null
        ? (item.assetImageUrl as string | null)
        : undefined,
    assetImageAltKo: asString(item.assetImageAltKo, assetLabel),
    assetImageSource:
      typeof item.assetImageSource === "string" ||
      item.assetImageSource === null
        ? (item.assetImageSource as string | null)
        : undefined,
    assetIcon:
      typeof item.assetIcon === "string" || item.assetIcon === null
        ? (item.assetIcon as string | null)
        : undefined,
    category: asString(item.category, "watch"),
    requiredCapitalUsdt: asString(item.requiredCapitalUsdt, "0"),
    expectedProfitUsdt: asString(item.expectedProfitUsdt, "0"),
    aiConfidenceScore: asNumber(item.aiConfidenceScore, 0),
    buyPriceUsdt:
      typeof item.buyPriceUsdt === "string" || item.buyPriceUsdt === null
        ? (item.buyPriceUsdt as string | null)
        : undefined,
    sellPriceUsdt:
      typeof item.sellPriceUsdt === "string" || item.sellPriceUsdt === null
        ? (item.sellPriceUsdt as string | null)
        : undefined,
    platformMarginUsdt:
      typeof item.platformMarginUsdt === "string" ||
      item.platformMarginUsdt === null
        ? (item.platformMarginUsdt as string | null)
        : undefined,
    compareReady:
      typeof item.compareReady === "boolean" ? item.compareReady : undefined,
    sellSuccessRate:
      typeof item.sellSuccessRate === "number"
        ? item.sellSuccessRate
        : undefined,
    sellSuccessWindowDays:
      typeof item.sellSuccessWindowDays === "number"
        ? item.sellSuccessWindowDays
        : undefined,
    tags: Array.isArray(item.tags)
      ? item.tags.filter((t): t is string => typeof t === "string")
      : undefined,
    bucket: asBucket(item.bucket),
    suggestDepositUsdt:
      typeof item.suggestDepositUsdt === "string" ||
      item.suggestDepositUsdt === null
        ? (item.suggestDepositUsdt as string | null)
        : undefined,
    staleAt:
      typeof item.staleAt === "string" || item.staleAt === null
        ? (item.staleAt as string | null)
        : undefined,
    lastAdapterSyncAt:
      typeof item.lastAdapterSyncAt === "string" ||
      item.lastAdapterSyncAt === null
        ? (item.lastAdapterSyncAt as string | null)
        : undefined,
    sourceCount:
      typeof item.sourceCount === "number" ? item.sourceCount : undefined,
    ctaLockReasonKo:
      typeof item.ctaLockReasonKo === "string" || item.ctaLockReasonKo === null
        ? (item.ctaLockReasonKo as string | null)
        : undefined,
  };
}
