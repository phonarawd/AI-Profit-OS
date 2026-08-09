"use client";

import { ProductThumb } from "../execution/ProductThumb";
import { PriceCompareMargin } from "./PriceCompareMargin";
import type { OpportunityCardModel } from "./opportunity-types";

export type OpportunityReceiptMarginProps = {
  opportunity: Pick<
    OpportunityCardModel,
    | "assetImageUrl"
    | "assetImageAltKo"
    | "category"
    | "assetImageSource"
    | "assetIcon"
    | "buyPriceUsdt"
    | "sellPriceUsdt"
    | "expectedProfitUsdt"
    | "platformMarginUsdt"
    | "compareReady"
  >;
  className?: string;
};

/**
 * 영수증(성공) 면 PriceCompareMargin — execution-success 슬롯
 */
export function OpportunityReceiptMargin({
  opportunity: o,
  className = "",
}: OpportunityReceiptMarginProps) {
  return (
    <div
      data-testid="opportunity-receipt-margin"
      data-canon="execution-success"
      className={`space-y-2 ${className}`.trim()}
    >
      <ProductThumb
        src={o.assetImageUrl}
        alt={o.assetImageAltKo}
        category={o.category}
        imageSource={o.assetImageSource}
        assetIcon={o.assetIcon}
      />
      <PriceCompareMargin
        variant="full"
        compareReady={o.compareReady ?? true}
        buyPriceUsdt={o.buyPriceUsdt}
        sellPriceUsdt={o.sellPriceUsdt}
        expectedProfitUsdt={o.expectedProfitUsdt}
        platformMarginUsdt={o.platformMarginUsdt}
      />
    </div>
  );
}
