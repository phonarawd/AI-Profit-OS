"use client";

import { T } from "../../copy/ko";
import { Badge } from "../lux/Badge";
import { MotionCTA } from "../lux/MotionCTA";
import { ProductImage } from "../product/ProductImage";
import { MarketPartnerLeg } from "../trust/MarketPartnerLeg";
import { OpportunityScanBadge } from "./OpportunityScanBadge";
import { PriceCompareMargin } from "./PriceCompareMargin";
import { formatUsdtOrUnavailable } from "./money-display";
import type { OpportunityCardModel } from "./opportunity-types";

export type OpportunityDetailProps = {
  opportunity: OpportunityCardModel;
  onEarn?: (id: string) => void;
  className?: string;
};

function corridorText(o: OpportunityCardModel): string {
  return T.opportunity.corridor
    .replace("{buy}", o.buyMarketLabelKo || "")
    .replace("{sell}", o.sellMarketLabelKo || "")
    .replace("{type}", o.arbitrageTypeKo);
}

/**
 * §5.3b/§48 상세 — Primary=`이 기회로 수익 벌기` · sticky=`수익 벌기`
 */
export function OpportunityDetail({
  opportunity: o,
  onEarn,
  className = "",
}: OpportunityDetailProps) {
  const timeSensitive = (o.tags || []).includes("time_sensitive");

  const earn = () => {
    if (onEarn) onEarn(o.id);
  };

  return (
    <div
      data-testid="opportunity-detail-body"
      data-canon="opportunity-detail"
      data-opportunity-id={o.id}
      className={`space-y-4 ${className}`.trim()}
    >
      <div className="flex flex-wrap items-center gap-1">
        <Badge tone="accent">{T.opportunity.badgeMatchable}</Badge>
        <OpportunityScanBadge
          arbitrageTypeKo={o.arbitrageTypeKo}
          timeSensitive={timeSensitive}
        />
      </div>

      <ProductImage
        src={o.assetImageUrl}
        alt={o.assetImageAltKo}
        category={o.category}
        imageSource={o.assetImageSource}
        assetIcon={o.assetIcon}
        priority
        variant="detail"
      />

      <h1 className="text-xl font-semibold text-lux-text">{corridorText(o)}</h1>
      <p className="text-sm text-lux-text-muted">{o.assetLabel}</p>

      <dl className="grid grid-cols-2 gap-x-3 gap-y-2 text-sm">
        <dt className="text-lux-text-muted">
          {T.opportunity.labelRequiredCapital}
        </dt>
        <dd
          className="text-right font-medium"
          data-money-state={
            formatUsdtOrUnavailable(o.requiredCapitalUsdt).state
          }
        >
          {formatUsdtOrUnavailable(o.requiredCapitalUsdt).text}
        </dd>
        <dt className="text-lux-text-muted">
          {T.opportunity.labelExpectedProfit}
        </dt>
        <dd
          className="text-right text-lg font-semibold text-lux-accent"
          data-money-state={
            formatUsdtOrUnavailable(o.expectedProfitUsdt, true).state
          }
        >
          {formatUsdtOrUnavailable(o.expectedProfitUsdt, true).text}
        </dd>
        <dt className="text-lux-text-muted">
          {T.opportunity.labelAiConfidence}
        </dt>
        <dd className="text-right">{o.aiConfidenceScore}%</dd>
      </dl>

      {o.sellSuccessRate != null ? (
        <p className="text-sm text-lux-text-muted" data-testid="historical-match">
          {T.opportunity.historicalMatchHint}
          {o.sellSuccessWindowDays != null
            ? ` · ${T.opportunity.historicalWindow.replace("{n}", String(o.sellSuccessWindowDays))}`
            : ""}
        </p>
      ) : null}

      <MarketPartnerLeg
        buyPartnerId={o.buyMarketId}
        sellPartnerId={o.sellMarketId}
        buyLabel={o.buyMarketLabelKo}
        sellLabel={o.sellMarketLabelKo}
      />

      <PriceCompareMargin
        variant="full"
        compareReady={o.compareReady}
        buyPriceUsdt={o.buyPriceUsdt}
        sellPriceUsdt={o.sellPriceUsdt}
        expectedProfitUsdt={o.expectedProfitUsdt}
        platformMarginUsdt={o.platformMarginUsdt}
      />

      <p className="text-sm text-lux-text-muted">
        {T.execution.executionModeHint} · {T.execution.executionModeBody}
      </p>

      <div className="flex flex-wrap gap-1">
        <Badge tone="muted">{T.execution.badgeNoBuy}</Badge>
        <Badge tone="muted">{T.execution.badgeNoSell}</Badge>
      </div>
      <p className="text-xs text-lux-text-muted">{T.execution.disclaimerResult}</p>
      <p className="text-xs text-lux-text-muted">{T.execution.imageRightsNote}</p>

      <MotionCTA
        className="w-full"
        data-cta="detail"
        data-action="participate"
        label={T.execution.ctaDetail}
        onClick={earn}
      />

      {/* 모바일 sticky · PC 전폭 sticky 금지 (§5.3) */}
      <div
        data-testid="sticky-cta-earn"
        className="fixed inset-x-0 z-40 border-t border-lux-border bg-lux-bg p-3 md:hidden"
        style={{ bottom: "calc(3.5rem + env(safe-area-inset-bottom, 0px))" }}
      >
        <MotionCTA
          className="w-full"
          data-cta="sticky"
          data-action="participate"
          label={T.execution.ctaStickyShort}
          onClick={earn}
        />
      </div>
    </div>
  );
}
