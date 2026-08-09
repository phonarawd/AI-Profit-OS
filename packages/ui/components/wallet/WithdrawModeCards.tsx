"use client";

import { T } from "../../copy/ko";

export type WithdrawModeValue = "profit" | "principal" | "combined";

export type WithdrawModeCardsProps = {
  mode: WithdrawModeValue;
  onModeChange: (mode: WithdrawModeValue) => void;
};

/**
 * Money §49.4 — 수익만(기본) | 원금 포함(고급).
 * Principal path must remain reachable (E3 · verify:principal-withdraw-reachable).
 */
export function WithdrawModeCards({
  mode,
  onModeChange,
}: WithdrawModeCardsProps) {
  const profitActive = mode === "profit";
  const principalActive = mode === "principal" || mode === "combined";

  return (
    <div
      data-testid="withdraw-mode-cards"
      data-default-mode="profit"
      className="mt-4 grid gap-3"
    >
      <button
        type="button"
        data-mode="profit"
        data-testid="withdraw-mode-profit"
        aria-pressed={profitActive}
        onClick={() => onModeChange("profit")}
        className={`rounded-lux-md border px-4 py-3 text-left ${
          profitActive
            ? "border-lux-accent bg-lux-elevated"
            : "border-lux-border bg-lux-surface"
        }`}
      >
        <span className="block text-sm font-semibold text-lux-text">
          {T.withdrawMode.modeProfit}
        </span>
        <span className="mt-1 block text-xs text-lux-text-muted">
          {T.withdrawMode.modeProfitHint}
        </span>
      </button>

      <button
        type="button"
        data-mode="principal"
        data-testid="withdraw-mode-principal"
        data-principal-reachable="true"
        aria-pressed={principalActive}
        onClick={() => onModeChange("principal")}
        className={`rounded-lux-md border px-4 py-3 text-left ${
          principalActive
            ? "border-lux-principal bg-lux-elevated"
            : "border-lux-border bg-lux-surface"
        }`}
      >
        <span className="block text-sm font-semibold text-lux-text">
          {T.withdrawMode.modePrincipal}
        </span>
        <span className="mt-1 block text-xs text-lux-text-muted">
          {T.withdrawMode.modePrincipalHint}
        </span>
      </button>
    </div>
  );
}
