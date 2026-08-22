"use client";

import { useState } from "react";
import { T } from "../../copy/ko";

const QUICK_USDT = [10, 50, 100, 500] as const;

export type DepositAmountPanelProps = {
  suggestUsdt?: number;
  oppId?: string | null;
  tab?: "usdt" | "krw";
  onAmountChange?: (amount: string) => void;
};

function formatChipLabel(n: number, isSuggest: boolean): string {
  if (isSuggest) {
    return T.deposit.suggestChip.replace("{n}", String(n));
  }
  return `${n}`;
}

/**
 * Money §49.2a — amount input + quick chips + optional suggest chip.
 * Forced deposit forbidden · suggest is prefill/hint only.
 */
export function DepositAmountPanel({
  suggestUsdt = 0,
  oppId = null,
  tab = "usdt",
  onAmountChange,
}: DepositAmountPanelProps) {
  const suggest =
    Number.isFinite(suggestUsdt) && suggestUsdt > 0
      ? Math.max(1, Math.ceil(suggestUsdt))
      : 0;

  const [amount, setAmount] = useState(suggest > 0 ? String(suggest) : "");

  const setAmountSafe = (next: string) => {
    setAmount(next);
    onAmountChange?.(next);
  };

  return (
    <section
      data-testid="deposit-amount-panel"
      data-suggest={suggest > 0 ? String(suggest) : undefined}
      data-opp-id={oppId ?? undefined}
      data-tab={tab}
      data-force-deposit="false"
      className="walletV2AmountPanel"
    >
      <label>
        {T.deposit.amountLabel}
        <span className="walletV2AmountWrap">
          <input
            data-testid="deposit-amount-input"
            type="text"
            inputMode="decimal"
            value={amount}
            onChange={(e) => setAmountSafe(e.target.value)}
          />
          <span>{T.deposit.usdtSuffix}</span>
        </span>
      </label>

      {suggest > 0 ? (
        <p data-testid="deposit-suggest-prefill-hint">
          {tab === "krw"
            ? T.deposit.krwSuggestNote.replace("{n}", String(suggest))
            : T.deposit.suggestPrefillHint}
        </p>
      ) : null}

      <p>{T.deposit.quickHint}</p>
      <div data-testid="deposit-quick-chips" role="group" aria-label={T.deposit.quickHint}>
        {suggest > 0 ? (
          <button
            type="button"
            data-testid="deposit-suggest-chip"
            data-suggest-chip="true"
            onClick={() => setAmountSafe(String(suggest))}
          >
            {formatChipLabel(suggest, true)}
          </button>
        ) : null}
        {QUICK_USDT.map((n) => (
          <button
            key={`quick-${n}`}
            type="button"
            data-testid={`deposit-quick-${n}`}
            data-suggest-chip="false"
            onClick={() => setAmountSafe(String(n))}
          >
            {formatChipLabel(n, false)}
          </button>
        ))}
      </div>
    </section>
  );
}
