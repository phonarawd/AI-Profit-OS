"use client";

import { T } from "../../copy/ko";

export type WithdrawAmountPanelProps = {
  amountUsdt: string;
  onAmountChange: (amount: string) => void;
  /** 표시용 수수료(서버 quote 없을 때 빈 문자열 → feeHint만) */
  feeUsdt?: string | null;
  destination?: string;
  onDestinationChange?: (destination: string) => void;
  showDestination?: boolean;
  asset?: "USDT" | "KRW";
  disabled?: boolean;
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
  className = "",
}: WithdrawAmountPanelProps) {
  const fee =
    typeof feeUsdt === "string" && feeUsdt.trim() ? feeUsdt.trim() : null;

  return (
    <section
      data-testid="withdraw-amount-panel"
      data-asset={asset}
      className={["mt-4 space-y-3", className].filter(Boolean).join(" ")}
    >
      <label className="block text-sm text-lux-text-muted">
        {T.withdrawMode.amountLabel}
        <input
          data-testid="withdraw-amount-input"
          type="text"
          inputMode="decimal"
          disabled={disabled}
          value={amountUsdt}
          onChange={(e) => onAmountChange(e.target.value)}
          className="mt-1 w-full rounded-lux-md border border-lux-border bg-transparent px-3 py-2 text-lux-text"
        />
      </label>

      <p
        className="text-xs text-lux-text-muted"
        data-testid="withdraw-fee-hint"
      >
        {fee
          ? T.withdrawMode.feeLine.replace("{fee}", fee)
          : T.withdrawMode.feeHint}
      </p>

      {showDestination && asset === "USDT" ? (
        <label className="block text-sm text-lux-text-muted">
          {T.withdrawMode.destinationLabel}
          <input
            data-testid="withdraw-destination-input"
            type="text"
            autoComplete="off"
            disabled={disabled}
            placeholder={T.withdrawMode.destinationPlaceholder}
            value={destination}
            onChange={(e) => onDestinationChange?.(e.target.value)}
            className="mt-1 w-full rounded-lux-md border border-lux-border bg-transparent px-3 py-2 text-lux-text"
          />
        </label>
      ) : null}

      {asset === "USDT" ? (
        <p
          className="text-sm text-lux-text-muted"
          data-testid="withdraw-network-hint"
          data-network-label={T.wallet.networkName}
        >
          {T.wallet.withdrawNetworkHint}
        </p>
      ) : null}
    </section>
  );
}
