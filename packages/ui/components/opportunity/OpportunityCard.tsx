"use client";

import Link from "next/link";
import { T } from "../../copy/ko";
import { Badge } from "../lux/Badge";
import { MotionCTA } from "../lux/MotionCTA";
import { ProductImage } from "../product/ProductImage";
import { AdapterHealthChip } from "../trust/AdapterHealthChip";
import { MarketPartnerLeg } from "../trust/MarketPartnerLeg";
import { OpportunityScanBadge } from "./OpportunityScanBadge";
import { PriceCompareMargin } from "./PriceCompareMargin";
import type { OpportunityCardModel } from "./opportunity-types";

export type OpportunityCardProps = {
  opportunity: OpportunityCardModel;
  /** Hero 첫 카드만 priority */
  priority?: boolean;
  /** Primary CTA 클릭 (미지정 시 /profits/[id]) */
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
 * §5.3b 카드 3단 위계 · arbitrageTypeKo · §48.3a 썸네일 · CTA=수익 벌기
 * expectedSellDays / executionPlatforms 유저 0
 */
export function OpportunityCard({
  opportunity: o,
  priority = false,
  onEarn,
  className = "",
}: OpportunityCardProps) {
  const timeSensitive = (o.tags || []).includes("time_sensitive");
  const href = `/profits/${o.id}`;

  const lockBadge =
    o.bucket === "nearMiss"
      ? T.feed.badgeNearMiss
      : o.bucket === "lockedHigh"
        ? T.feed.badgeLocked
        : null;

  const primaryDisabled = o.bucket === "nearMiss" || o.bucket === "lockedHigh";

  return (
    <article
      data-testid="opportunity-card"
      data-canon="opportunity-card"
      data-opportunity-id={o.id}
      data-bucket={o.bucket || "none"}
      data-compare-ready={o.compareReady === true ? "1" : "0"}
      className={[
        "rounded-lux-md border border-lux-border bg-lux-elevated p-4",
        className,
      ]
        .filter(Boolean)
        .join(" ")}
    >
      <div className="flex gap-3">
        <ProductImage
          src={o.assetImageUrl}
          alt={o.assetImageAltKo}
          category={o.category}
          imageSource={o.assetImageSource}
          assetIcon={o.assetIcon}
          priority={priority}
          variant="thumb"
        />
        <div className="min-w-0 flex-1 space-y-1">
          <div className="flex flex-wrap items-center gap-1">
            <Badge tone="accent">{T.opportunity.badgeMatchable}</Badge>
            <OpportunityScanBadge
              arbitrageTypeKo={o.arbitrageTypeKo}
              timeSensitive={timeSensitive}
            />
            {lockBadge ? (
              <Badge
                tone="warning"
                data-testid={
                  o.bucket === "nearMiss"
                    ? "badge-near-miss"
                    : "badge-locked-high"
                }
              >
                {lockBadge}
              </Badge>
            ) : null}
          </div>
          <h2 className="text-base font-semibold text-lux-text">
            {corridorText(o)}
          </h2>
          <p className="truncate text-xs text-lux-text-muted">{o.assetLabel}</p>
        </div>
      </div>

      <dl className="mt-3 grid grid-cols-2 gap-x-3 gap-y-2 text-sm">
        <dt className="text-lux-text-muted">
          {T.opportunity.labelRequiredCapital}
        </dt>
        <dd
          data-field="requiredCapitalUsdt"
          className="text-right font-medium text-lux-text"
        >
          {o.requiredCapitalUsdt} USDT
        </dd>
        <dt className="text-lux-text-muted">
          {T.opportunity.labelExpectedProfit}
        </dt>
        <dd
          data-field="expectedProfitUsdt"
          className="text-right text-base font-semibold text-lux-accent"
        >
          +{o.expectedProfitUsdt} USDT
        </dd>
        <dt className="text-lux-text-muted">
          {T.opportunity.labelAiConfidence}
        </dt>
        <dd data-field="aiConfidenceScore" className="text-right text-lux-text">
          {o.aiConfidenceScore}%
        </dd>
      </dl>

      <MarketPartnerLeg
        className="mt-3"
        buyPartnerId={o.buyMarketId}
        sellPartnerId={o.sellMarketId}
        buyLabel={o.buyMarketLabelKo}
        sellLabel={o.sellMarketLabelKo}
      />

      <PriceCompareMargin
        className="mt-3"
        variant="mini"
        defaultCollapsed
        compareReady={o.compareReady}
        buyPriceUsdt={o.buyPriceUsdt}
        sellPriceUsdt={o.sellPriceUsdt}
        expectedProfitUsdt={o.expectedProfitUsdt}
        platformMarginUsdt={o.platformMarginUsdt}
      />

      <AdapterHealthChip
        health={{
          staleAt: o.staleAt,
          lastAdapterSyncAt: o.lastAdapterSyncAt,
          compareReady: o.compareReady,
          sourceCount: o.sourceCount,
          ctaLockReasonKo: o.ctaLockReasonKo,
        }}
      />

      <div className="mt-3 flex flex-wrap gap-1">
        <Badge tone="muted">{T.execution.badgeNoBuy}</Badge>
        <Badge tone="muted">{T.execution.badgeNoSell}</Badge>
      </div>
      <p className="mt-2 text-xs text-lux-text-muted">
        {T.execution.disclaimerResult}
      </p>
      <p className="mt-1 text-xs text-lux-text-muted">
        {T.execution.imageRightsNote}
      </p>

      {o.bucket === "nearMiss" && o.suggestDepositUsdt ? (
        <Link
          href={`/wallet/deposit?tab=usdt&suggest=${encodeURIComponent(o.suggestDepositUsdt)}&oppId=${encodeURIComponent(o.id)}`}
          data-testid="cta-deposit-suggest"
          className="mt-3 flex w-full items-center justify-center rounded-lux-md border border-lux-accent px-4 py-3 text-sm font-semibold text-lux-accent"
        >
          {T.feed.ctaDepositSuggest.replace("{n}", o.suggestDepositUsdt)}
        </Link>
      ) : primaryDisabled ? (
        <p
          className="mt-3 text-center text-sm text-lux-text-muted"
          data-testid="cta-locked"
        >
          {lockBadge}
        </p>
      ) : (
        <MotionCTA
          className="mt-3 w-full"
          data-cta="earn"
          data-action="participate"
          label={T.execution.ctaEarn}
          onClick={() => {
            if (onEarn) onEarn(o.id);
            else window.location.href = href;
          }}
        />
      )}
    </article>
  );
}
