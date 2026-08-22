"use client";

import { T } from "../../copy/ko";

export type WithdrawAmountPanelProps = {
  amountUsdt: string;
  onAmountChange: (amount: string) => void;
  feeUsdt?: string | null;
  destination?: string;
  onDestinationChange?: (destination: string) => void;
  showDestination?: boolean;
  asset?: "USDT" | "KRW";
  disabled?: boolean;
  availableProfitUsdt?: string | null;
  className?: string;
};

/**
 * PART9f2 — 출금 금액·수수료 힌트·(USDT) 받는 주소
 * 가격/수수료 재계산 금지 · 표시·수집만
 */
export function WithdrawAmountPanel({
  amountUsdt,
  onAmountChange,
  feeUsdt = null,
  destination = "",
  onDestinationChange,
  showDestination = true,
  asset = "USDT",
  disabled = false,
  availableProfitUsdt = null,
  className = "",
}: WithdrawAmountPanelProps) {
  const fee =
    typeof feeUsdt === "string" && feeUsdt.trim() ? feeUsdt.trim() : null;

  return (
    <section
      data-testid="withdraw-amount-panel"
      data-asset={asset}
      className={["walletV2WithdrawAmount", className].filter(Boolean).join(" ")}
    >
      <label>
        {T.withdrawMode.amountLabel}
        <span className="walletV2AmountWrap">
          <input
            data-testid="withdraw-amount-input"
            type="text"
            inputMode="decimal"
            disabled={disabled}
            value={amountUsdt}
            placeholder={T.withdrawMode.amountPlaceholder}
            onChange={(e) => onAmountChange(e.target.value)}
          />
          <span>{T.walletBuckets.usdtSuffix}</span>
        </span>
      </label>

      <div className="walletV2Available">
        <p>{T.withdrawMode.availableProfit}</p>
        <p>
          {availableProfitUsdt
            ? `${availableProfitUsdt} ${T.walletBuckets.usdtSuffix}`
            : `${T.walletBuckets.missingAmount} ${T.walletBuckets.usdtSuffix}`}
        </p>
        {availableProfitUsdt ? (
          <button
            type="button"
            data-testid="withdraw-all"
            disabled={disabled}
            onClick={() => onAmountChange(availableProfitUsdt)}
          >
            {T.withdrawMode.allAmount}
          </button>
        ) : null}
      </div>

      <p data-testid="withdraw-fee-hint">
        {fee
          ? T.withdrawMode.feeLine.replace("{fee}", fee)
          : T.withdrawMode.feeHint}
      </p>

      {showDestination && asset === "USDT" ? (
        <label>
          {T.withdrawMode.destinationLabel}
          <input
            data-testid="withdraw-destination-input"
            type="text"
            autoComplete="off"
            disabled={disabled}
            placeholder={T.withdrawMode.destinationPlaceholder}
            value={destination}
            onChange={(e) => onDestinationChange?.(e.target.value)}
          />
        </label>
      ) : null}

      {asset === "USDT" ? (
        <p
          data-testid="withdraw-network-hint"
          data-network-label={T.wallet.networkName}
        >
          {T.wallet.withdrawNetworkHint}
        </p>
      ) : (
        <div className="walletV2Notice">
          <p>{T.withdrawMode.krwNoticeTitle}</p>
          <p>{T.withdrawMode.krwNoticeBody}</p>
        </div>
      )}
    </section>
  );
}
