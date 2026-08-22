"use client";

import { T } from "../../copy/ko";

export type PrincipalConfirmSheetProps = {
  open: boolean;
  onChooseProfitOnly: () => void;
  onConfirmPrincipal: (principalConfirmToken: string) => void;
};

function makePrincipalConfirmToken(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return `pc_${crypto.randomUUID()}`;
  }
  return `pc_${Date.now()}_${Math.random().toString(16).slice(2)}`;
}

/**
 * Principal confirm — reachable, no countdown/fear/loss.
 */
export function PrincipalConfirmSheet({
  open,
  onChooseProfitOnly,
  onConfirmPrincipal,
}: PrincipalConfirmSheetProps) {
  if (!open) return null;
  return (
    <div
      data-testid="principal-confirm-sheet"
      className="walletV2Sheet"
      role="dialog"
      aria-modal="true"
    >
      <button
        type="button"
        className="walletV2SheetBackdrop"
        aria-label={T.common.close}
        onClick={onChooseProfitOnly}
      />
      <div className="walletV2SheetPanel">
        <h2>{T.withdrawMode.confirmTitle}</h2>
        <p>{T.withdrawMode.confirmBody}</p>
        <p>{T.withdrawMode.confirmSelfOnly}</p>
        <button type="button" data-testid="cta-profit-only" onClick={onChooseProfitOnly}>
          {T.withdrawMode.ctaProfitOnly}
        </button>
        <button
          type="button"
          data-testid="cta-still-principal"
          onClick={() => onConfirmPrincipal(makePrincipalConfirmToken())}
        >
          {T.withdrawMode.ctaStillPrincipal}
        </button>
      </div>
    </div>
  );
}
