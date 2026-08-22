"use client";

import { T } from "../../copy/ko";

export type WithdrawModeValue = "profit" | "principal" | "combined";

export type WithdrawModeCardsProps = {
  mode: WithdrawModeValue;
  onModeChange: (mode: WithdrawModeValue) => void;
};

/**
 * Withdraw mode picker. Default presentation = profit / 원금 포함.
 * combined stays reachable for existing owner, without "고급" label.
 */
export function WithdrawModeCards({
  mode,
  onModeChange,
}: WithdrawModeCardsProps) {
  return (
    <div data-testid="withdraw-mode-cards" data-default-mode="profit">
      <p>{T.withdrawMode.whatToWithdraw}</p>
      <div className="walletV2Modes">
        <button
          type="button"
          data-testid="withdraw-mode-profit"
          data-mode="profit"
          aria-pressed={mode === "profit"}
          onClick={() => onModeChange("profit")}
        >
          <span>{T.withdrawMode.modeProfit}</span>
          <small>{T.withdrawMode.modeProfitHint}</small>
        </button>
        <button
          type="button"
          data-testid="withdraw-mode-principal"
          data-mode="principal"
          data-principal-reachable="true"
          aria-pressed={mode === "principal" || mode === "combined"}
          onClick={() => onModeChange("principal")}
        >
          <span>{T.withdrawMode.modePrincipal}</span>
          <small>{T.withdrawMode.modePrincipalHint}</small>
        </button>
        <button
          type="button"
          data-testid="withdraw-mode-combined"
          data-mode="combined"
          hidden
          aria-pressed={mode === "combined"}
          onClick={() => onModeChange("combined")}
        >
          {T.withdrawMode.modeCombined}
        </button>
      </div>
    </div>
  );
}
