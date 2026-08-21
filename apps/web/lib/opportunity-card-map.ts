/**
 * Nest opportunity card → OpportunityCardModel
 * 필드 pass-through · UI 재계산 0 · 홈/수익 공용 (중복0)
 */
import type { OpportunityFeedItem } from "@aipo/sdk/user-feed";
import type { OpportunityCardModel } from "@aipo/ui/components/opportunity";

function extra(item: OpportunityFeedItem): Record<string, unknown> {
  return item as OpportunityFeedItem & Record<string, unknown>;
}

function asString(v: unknown, fallback = ""): string {
  return typeof v === "string" ? v : fallback;
}

/** missing money → 빈 문자열. "0" 위조 금지. 실제 "0"은 그대로 통과. */
function asMoneyString(v: unknown): string {
  return typeof v === "string" && /^-?[0-9]+(\.[0-9]+)?$/.test(v) ? v : "";
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
  const ext = extra(item);
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
        ? item.assetImageUrl
        : undefined,
    assetImageAltKo: asString(item.assetImageAltKo, assetLabel),
    assetImageSource:
      typeof item.assetImageSource === "string" ||
      item.assetImageSource === null
        ? item.assetImageSource
        : undefined,
    assetIcon:
      typeof ext.assetIcon === "string" || ext.assetIcon === null
        ? (ext.assetIcon as string | null)
        : undefined,
    category: asString(ext.category, "watch"),
    requiredCapitalUsdt: asMoneyString(item.requiredCapitalUsdt),
    expectedProfitUsdt: asMoneyString(item.expectedProfitUsdt),
    aiConfidenceScore: asNumber(ext.aiConfidenceScore, 0),
    buyPriceUsdt:
      typeof item.buyPriceUsdt === "string" || item.buyPriceUsdt === null
        ? item.buyPriceUsdt
        : undefined,
    sellPriceUsdt:
      typeof item.sellPriceUsdt === "string" || item.sellPriceUsdt === null
        ? item.sellPriceUsdt
        : undefined,
    platformMarginUsdt:
      typeof ext.platformMarginUsdt === "string" ||
      ext.platformMarginUsdt === null
        ? (ext.platformMarginUsdt as string | null)
        : undefined,
    compareReady:
      typeof item.compareReady === "boolean" ? item.compareReady : undefined,
    sellSuccessRate:
      typeof ext.sellSuccessRate === "number"
        ? ext.sellSuccessRate
        : undefined,
    sellSuccessWindowDays:
      typeof ext.sellSuccessWindowDays === "number"
        ? ext.sellSuccessWindowDays
        : undefined,
    tags: Array.isArray(ext.tags)
      ? ext.tags.filter((t): t is string => typeof t === "string")
      : undefined,
    bucket: asBucket(item.bucket),
    suggestDepositUsdt:
      typeof item.suggestDepositUsdt === "string" ||
      item.suggestDepositUsdt === null
        ? item.suggestDepositUsdt
        : undefined,
    staleAt:
      typeof item.staleAt === "string" || item.staleAt === null
        ? item.staleAt
        : undefined,
    lastAdapterSyncAt:
      typeof ext.lastAdapterSyncAt === "string" ||
      ext.lastAdapterSyncAt === null
        ? (ext.lastAdapterSyncAt as string | null)
        : undefined,
    sourceCount:
      typeof ext.sourceCount === "number" ? ext.sourceCount : undefined,
    ctaLockReasonKo:
      typeof ext.ctaLockReasonKo === "string" || ext.ctaLockReasonKo === null
        ? (ext.ctaLockReasonKo as string | null)
        : undefined,
  };
}
