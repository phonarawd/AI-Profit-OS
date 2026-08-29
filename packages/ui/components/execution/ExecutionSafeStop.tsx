"use client";

import { T } from "../../copy/ko";
import { Badge } from "../../primitives/Badge";
import { ParticipateProofPanel } from "../trust/ParticipateProofPanel";
import type { ParticipateProofModel } from "../trust/trust-types";
import type { AiProgressRoomAsset } from "./AiProgressRoom";
import type {
  ExecutionUiResultCode,
  ExecutionUiState,
} from "./execution-types";
import { ProductThumb } from "./ProductThumb";

export type SafeStopRecommend = {
  id: string;
  assetLabel: string;
  expectedProfitUsdt: string;
  aiConfidenceScore?: number;
  asset?: AiProgressRoomAsset;
};

export type ExecutionSafeStopProps = {
  state: ExecutionUiState;
  asset?: AiProgressRoomAsset;
  recommend?: SafeStopRecommend | null;
  proof?: ParticipateProofModel | null;
  className?: string;
};

function reasonChip(code?: ExecutionUiResultCode): string {
  switch (code) {
    case "PRICE_MOVED":
      return T.execution.safeReasonPrice;
    case "BELOW_MIN_PROFIT":
      return T.execution.safeReasonMin;
    case "MATCH_TIMEOUT":
      return T.execution.safeReasonTimeout;
    default:
      return T.execution.safeChip;
  }
}

/**
 * §48.5 안전 중단 — PRICE_MOVED | BELOW_MIN_PROFIT | MATCH_TIMEOUT | SYSTEM_FAILED
 * 잔액 불변 · IT 코드 유저 0
 */
export function ExecutionSafeStop({
  state,
  asset,
  recommend,
  proof = null,
  className = "",
}: ExecutionSafeStopProps) {
  const code = state.resultCode;
  const isTimeout = code === "MATCH_TIMEOUT";
  const isNearMiss = code === "PRICE_MOVED";

  const title = isTimeout
    ? T.execution.matchTimeout
    : T.execution.safeStopTitle;

  const body = isNearMiss
    ? T.execution.priceNearMiss
    : isTimeout
      ? T.execution.matchTimeout
      : T.execution.safeStopReason;

  const thumbSrc = asset?.assetImageUrl ?? state.asset.iconUrl ?? null;
  const thumbAlt =
    asset?.assetImageAltKo?.trim() || state.asset.label || state.asset.ref || "";
  const category = asset?.category || "watch";
  const similarHref = `/profits?similar=${encodeURIComponent(state.asset.id)}`;

  const expectedLine = T.execution.safeExpectedWas.replace(
    "{expected}",
    state.expectedProfitUsdt,
  );

  return (
    <section
      data-testid="execution-safe-stop"
      data-canon="execution-safe-stop"
      data-execution-status="safe_stop"
      data-result-code={code ?? ""}
      className={`space-y-4 text-pd-text ${className}`.trim()}
    >
      <Badge tone="warning" data-block="chip">
        {T.execution.safeMatchInterrupted}
      </Badge>

      <h1 className="text-xl font-semibold" data-block="title">
        {title}
      </h1>

      <p className="text-sm text-pd-text-muted" data-block="reason">
        {isNearMiss ? (
          <>
            <span data-block="priceNearMiss">{T.execution.priceNearMiss}</span>
            <span className="mt-1 block">{T.execution.safeBodyPrice}</span>
          </>
        ) : (
          body
        )}
      </p>

      <div className="flex items-start gap-3">
        <ProductThumb
          src={thumbSrc}
          alt={thumbAlt}
          category={category}
          imageSource={asset?.assetImageSource}
          assetIcon={asset?.assetIcon}
        />
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-medium">{state.asset.label}</p>
          <Badge tone="muted" className="mt-1">
            {reasonChip(code)}
          </Badge>
        </div>
      </div>

      <div
        data-block="balance"
        className="rounded-pd-md border border-pd-accent/40 bg-pd-accent/10 p-3 shadow-[0_0_24px_rgba(52,211,153,0.15)]"
      >
        <p className="text-sm font-semibold text-pd-accent">
          {T.execution.balanceUnchanged}
        </p>
      </div>

      <p className="text-sm text-pd-text-muted">
        {expectedLine}{" "}
        <span className="text-pd-warning">({T.execution.safeExpectedNotPaid})</span>
      </p>

      <ParticipateProofPanel proof={proof} />

      <a
        href={similarHref}
        data-testid="execution-safe-primary"
        data-block="primary"
        className="block w-full rounded-pd-md bg-pd-accent px-4 py-3 text-center text-sm font-semibold text-pd-bg"
      >
        {T.execution.browseOther}
      </a>
      <a
        href="/"
        data-testid="execution-safe-home"
        className="block w-full rounded-pd-md border border-pd-border px-4 py-3 text-center text-sm text-pd-text"
      >
        {T.execution.safeSecondary}
      </a>

      {recommend ? (
        <div
          data-block="recommend"
          data-testid="execution-safe-recommend"
          className="space-y-2 rounded-pd-md border border-pd-border p-3"
        >
          <p className="text-sm font-medium">{T.execution.recommendCards}</p>
          <div className="flex items-center gap-3">
            <ProductThumb
              src={recommend.asset?.assetImageUrl}
              alt={
                recommend.asset?.assetImageAltKo?.trim() ||
                recommend.assetLabel
              }
              category={recommend.asset?.category || category}
              imageSource={recommend.asset?.assetImageSource}
              assetIcon={recommend.asset?.assetIcon}
            />
            <div className="min-w-0 flex-1 space-y-1">
              <p className="truncate text-sm">{recommend.assetLabel}</p>
              <p className="text-sm text-pd-accent">
                {T.execution.safeRecommendProfit.replace(
                  "{n}",
                  recommend.expectedProfitUsdt,
                )}
              </p>
              <div className="flex flex-wrap gap-1">
                <Badge tone="accent">{T.execution.badgeMatchStable}</Badge>
                {typeof recommend.aiConfidenceScore === "number" ? (
                  <Badge tone="muted">
                    {T.opportunity.labelAiConfidence}{" "}
                    {Math.round(recommend.aiConfidenceScore)}%
                  </Badge>
                ) : null}
              </div>
            </div>
          </div>
        </div>
      ) : null}
    </section>
  );
}
