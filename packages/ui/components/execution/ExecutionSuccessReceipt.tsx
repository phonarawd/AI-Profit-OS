"use client";

import { T } from "../../copy/ko";
import { Badge } from "../lux/Badge";
import { CountUpNumber } from "../lux/CountUpNumber";
import { PriceCompareMargin } from "../opportunity/PriceCompareMargin";
import {
  SuccessBucketCtas,
  type SuccessCtaEmphasis,
} from "../wallet/SuccessBucketCtas";
import type { AiProgressRoomAsset } from "./AiProgressRoom";
import type { ExecutionUiState } from "./execution-types";
import { ProductThumb } from "./ProductThumb";

export type ExecutionSuccessReceiptProps = {
  state: ExecutionUiState;
  asset?: AiProgressRoomAsset;
  buyPriceUsdt?: string | null;
  sellPriceUsdt?: string | null;
  platformMarginUsdt?: string | null;
  compareReady?: boolean;
  buyLabel?: string;
  sellLabel?: string;
  emphasis?: SuccessCtaEmphasis;
  onMerge?: () => void;
  onLater?: () => void;
  className?: string;
};

/**
 * §48.4 성공 영수증 — settlement.completed + MATCH_SUCCESS only
 * CountUp = ledger settledProfitUsdt · §49 SuccessBucketCtas 필수
 */
export function ExecutionSuccessReceipt({
  state,
  asset,
  buyPriceUsdt,
  sellPriceUsdt,
  platformMarginUsdt,
  compareReady = false,
  buyLabel = "",
  sellLabel = "",
  emphasis = "profit_withdraw",
  onMerge,
  onLater,
  className = "",
}: ExecutionSuccessReceiptProps) {
  const settled = state.settledProfitUsdt ?? "0";
  const settledNum = Number.parseFloat(settled);
  const amountSafe = Number.isFinite(settledNum) ? settledNum : 0;

  const thumbSrc = asset?.assetImageUrl ?? state.asset.iconUrl ?? null;
  const thumbAlt =
    asset?.assetImageAltKo?.trim() || state.asset.label || state.asset.ref || "";
  const category = asset?.category || "watch";

  const legLog = T.trust.partners.successLegLog
    .replace("{buyLabel}", buyLabel)
    .replace("{sellLabel}", sellLabel);

  return (
    <section
      data-testid="execution-success-receipt"
      data-canon="execution-success"
      data-execution-status="success"
      className={`space-y-4 text-lux-text ${className}`.trim()}
    >
      <Badge tone="accent" data-block="badge">
        {T.execution.settledBadge}
      </Badge>

      <h1 className="text-xl font-semibold" data-block="title">
        {T.execution.successTitle}
      </h1>

      <div className="flex items-start gap-3" data-block="productThumb">
        <ProductThumb
          src={thumbSrc}
          alt={thumbAlt}
          category={category}
          imageSource={asset?.assetImageSource}
          assetIcon={asset?.assetIcon}
        />
        <div className="min-w-0 flex-1 space-y-1">
          <p className="truncate text-sm font-medium" data-field="assetLabel">
            {state.asset.label}
          </p>
          <p className="text-xs text-lux-text-muted" data-block="systemStatus">
            {T.execution.successSystemStatus}
          </p>
          <Badge tone="muted" data-block="trust">
            {T.execution.noBidBadge}
          </Badge>
          <p className="text-xs text-lux-text-muted">
            {T.execution.imageRightsNote}
          </p>
        </div>
      </div>

      <div data-block="priceCompareMargin">
        <PriceCompareMargin
          variant="full"
          compareReady={compareReady}
          buyPriceUsdt={buyPriceUsdt}
          sellPriceUsdt={sellPriceUsdt}
          expectedProfitUsdt={state.expectedProfitUsdt}
          platformMarginUsdt={platformMarginUsdt}
        />
      </div>

      <div data-block="amount" className="space-y-1">
        <p className="text-2xl font-semibold text-lux-accent">
          <CountUpNumber
            value={amountSafe}
            source="settlement.completed"
            prefix="+"
            suffix=" USDT"
            decimals={2}
          />
        </p>
        <Badge tone="accent">{T.execution.successBadge}</Badge>
      </div>

      <p className="text-sm text-lux-text-muted" data-block="successLegLog">
        {legLog}
      </p>

      <div className="rounded-lux-md border border-lux-accent/30 bg-lux-accent/10 p-3">
        <p className="text-sm font-medium">{T.execution.successBalance}</p>
        <p className="text-xs text-lux-text-muted">
          {T.execution.successBalanceSub}
        </p>
      </div>

      <div data-block="bucketCtas">
        <SuccessBucketCtas
          emphasis={emphasis}
          onMerge={onMerge}
          onLater={onLater}
        />
      </div>

      <div className="flex flex-col gap-2">
        <a
          href="/wallet"
          data-testid="execution-success-wallet"
          className="rounded-lux-md border border-lux-border px-4 py-3 text-center text-sm text-lux-text"
        >
          {T.execution.successPrimary}
        </a>
        <a
          href="/profits"
          data-testid="execution-success-other"
          className="rounded-lux-md border border-lux-border px-4 py-3 text-center text-sm text-lux-text"
        >
          {T.execution.successSecondary}
        </a>
      </div>
    </section>
  );
}
