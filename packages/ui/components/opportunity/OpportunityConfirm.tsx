"use client";

import { T } from "../../copy/ko";
import { PreCTA } from "../loop/PreCTA";
import { Badge } from "../../primitives/Badge";
import { MotionCTA } from "../../primitives/PrimaryCta";
import { ProductThumb } from "../execution/ProductThumb";
import { PriceCompareMargin } from "./PriceCompareMargin";
import type { OpportunityCardModel } from "./opportunity-types";

export type OpportunityConfirmProps = {
  opportunity: OpportunityCardModel;
  onConfirm?: (id: string) => void;
  /** §51.24.2 Nest preflight 토큰 · 없으면 CTA만 표시·participate는 Nest 412 */
  preflightToken?: string | null;
  className?: string;
};

/**
 * 투입 확인 면 — PriceCompareMargin 4면 중 confirm · PreCTA mayStop · CTA=`수익 벌기`
 */
export function OpportunityConfirm({
  opportunity: o,
  onConfirm,
  preflightToken = null,
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
          <p className="mt-1 text-sm text-pd-text">{o.assetLabel}</p>
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

      <p className="text-xs text-pd-text-muted">{T.execution.disclaimerResult}</p>

      <PreCTA preflightToken={preflightToken} />

      <MotionCTA
        className="w-full"
        data-cta="earn"
        data-action="participate"
        data-requires-preflight="true"
        label={T.execution.ctaEarn}
        onClick={() => onConfirm?.(o.id)}
      />
    </div>
  );
}
