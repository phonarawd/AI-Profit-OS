"use client";

import { T } from "../../copy/ko";
import { Badge } from "../lux/Badge";
import { MotionCTA } from "../lux/MotionCTA";
import { ProductThumb } from "../execution/ProductThumb";
import { PriceCompareMargin } from "./PriceCompareMargin";
import type { OpportunityCardModel } from "./opportunity-types";

export type OpportunityConfirmProps = {
  opportunity: OpportunityCardModel;
  onConfirm?: (id: string) => void;
  className?: string;
};

/**
 * 투입 확인 면 — PriceCompareMargin 4면 중 confirm · CTA=`수익 벌기`
 */
export function OpportunityConfirm({
  opportunity: o,
  onConfirm,
  className = "",
}: OpportunityConfirmProps) {
  return (
    <div
      data-testid="opportunity-confirm"
      data-canon="opportunity-confirm"
      className={`space-y-3 ${className}`.trim()}
    >
      <div className="flex items-center gap-3">
        <ProductThumb
          src={o.assetImageUrl}
          alt={o.assetImageAltKo}
          category={o.category}
          imageSource={o.assetImageSource}
          assetIcon={o.assetIcon}
        />
        <div>
          <Badge tone="accent" data-field="arbitrageTypeKo">
            {o.arbitrageTypeKo}
          </Badge>
          <p className="mt-1 text-sm text-lux-text">{o.assetLabel}</p>
        </div>
      </div>

      <PriceCompareMargin
        variant="full"
        compareReady={o.compareReady}
        buyPriceUsdt={o.buyPriceUsdt}
        sellPriceUsdt={o.sellPriceUsdt}
        expectedProfitUsdt={o.expectedProfitUsdt}
        platformMarginUsdt={o.platformMarginUsdt}
      />

      <p className="text-xs text-lux-text-muted">{T.execution.disclaimerResult}</p>

      <MotionCTA
        className="w-full"
        data-cta="earn"
        data-action="participate"
        label={T.execution.ctaEarn}
        onClick={() => onConfirm?.(o.id)}
      />
    </div>
  );
}
