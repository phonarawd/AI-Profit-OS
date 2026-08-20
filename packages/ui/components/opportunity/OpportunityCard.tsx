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
import { formatUsdtOrUnavailable } from "./money-display";
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
 * §5.3b 카드 3단 위계 · arbitrageTypeKo · §48.3a 이미지 prominent(v1.3, top full-width)
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
        "opportunity-card overflow-hidden rounded-lux-xl border border-lux-border bg-lux-surface shadow-[var(--shadow-lux-card)]",
        className,
      ]
        .filter(Boolean)
        .join(" ")}
    >
      <ProductImage
        src={o.assetImageUrl}
        alt={o.assetImageAltKo}
        category={o.category}
        imageSource={o.assetImageSource}
        assetIcon={o.assetIcon}
        priority={priority}
        variant="card"
      />

      <div className="p-4">
        {/* Mobile primary: 상품명 · 필요 금액 · 가능 수익 · CTA */}
        <p className="truncate text-base font-semibold text-lux-text md:hidden">
          {o.assetLabel}
        </p>
        <div className="mt-2 flex flex-wrap items-center gap-1">
          <span className="hidden md:inline-flex">
            <Badge tone="accent">{T.opportunity.badgeMatchable}</Badge>
          </span>
          <span className="hidden md:inline-flex">
            <OpportunityScanBadge
              arbitrageTypeKo={o.arbitrageTypeKo}
              timeSensitive={timeSensitive}
            />
          </span>
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

        <h2 className="mt-2 hidden text-base font-semibold text-lux-text md:block">
          {corridorText(o)}
        </h2>
        <p className="hidden truncate text-xs text-lux-text-muted md:block">
          {o.assetLabel}
        </p>

        <dl className="mt-3 grid grid-cols-2 gap-x-3 gap-y-2 text-sm">
          <dt className="text-lux-text-muted">
            {T.opportunity.labelRequiredCapital}
          </dt>
          <dd
            data-field="requiredCapitalUsdt"
            data-money-state={
              formatUsdtOrUnavailable(o.requiredCapitalUsdt).state
            }
            className="text-right font-medium text-lux-text"
          >
            {formatUsdtOrUnavailable(o.requiredCapitalUsdt).text}
          </dd>
          <dt className="text-lux-text-muted">
            {T.opportunity.labelExpectedProfit}
          </dt>
          <dd
            data-field="expectedProfitUsdt"
            data-money-state={
              formatUsdtOrUnavailable(o.expectedProfitUsdt, true).state
            }
            className="text-right text-base font-semibold text-lux-profit"
          >
            {formatUsdtOrUnavailable(o.expectedProfitUsdt, true).text}
          </dd>
          <dt className="hidden text-lux-text-muted md:block">
            {T.opportunity.labelAiConfidence}
          </dt>
          <dd
            data-field="aiConfidenceScore"
            className="hidden text-right text-lux-text md:block"
          >
            {o.aiConfidenceScore}%
          </dd>
        </dl>

        {/* Desktop / tablet secondary trust · mobile 후순위 숨김 */}
        <div className="opportunity-card__secondary hidden md:block">
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
        </div>

        <div className="mt-3 flex flex-wrap gap-1 md:hidden">
          <Badge tone="muted">{T.execution.badgeNoBuy}</Badge>
          <Badge tone="muted">{T.execution.badgeNoSell}</Badge>
        </div>

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
      </div>
    </article>
  );
}
