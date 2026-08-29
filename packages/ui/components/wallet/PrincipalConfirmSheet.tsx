"use client";

import { T } from "../../copy/ko";

export type PrincipalConfirmSheetProps = {
  open: boolean;
  nearMissCount?: number;
  onChooseProfitOnly: () => void;
  /** Called with opaque confirm token (≥8 chars) after user affirms principal */
  onConfirmPrincipal: (principalConfirmToken: string) => void;
};

function makePrincipalConfirmToken(): string {
  const rand =
    typeof crypto !== "undefined" && "randomUUID" in crypto
      ? crypto.randomUUID().replace(/-/g, "")
      : `${Date.now()}${Math.random().toString(16).slice(2)}`;
  return `pc_${rand}`;
}

/**
 * Money §49.4 PrincipalConfirmSheet — required for mode=principal|combined.
 * Threat/forfeit/timer pressure copy forbidden.
 */
export function PrincipalConfirmSheet({
  open,
  nearMissCount = 0,
  onChooseProfitOnly,
  onConfirmPrincipal,
}: PrincipalConfirmSheetProps) {
  if (!open) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      data-testid="principal-confirm-sheet"
      className="fixed inset-x-0 bottom-0 z-50 rounded-t-pd-lg border border-pd-border bg-pd-surface p-6 shadow-lg"
    >
      <h2 className="text-lg font-semibold text-pd-text">
        {T.withdrawMode.confirmTitle}
      </h2>
      <p className="mt-2 text-sm text-pd-text-muted">
        {T.withdrawMode.confirmBody}
      </p>
      {nearMissCount > 0 ? (
        <p
          className="mt-2 text-sm text-pd-warning"
          data-testid="principal-near-miss"
        >
          {nearMissCount}
        </p>
      ) : null}
      <p className="mt-3 text-sm text-pd-text">
        {T.withdrawMode.confirmSelfOnly}
      </p>
      <div className="mt-6 flex flex-col gap-2">
        <button
          type="button"
          data-testid="cta-profit-only"
          onClick={onChooseProfitOnly}
          className="rounded-pd-md bg-pd-accent px-4 py-3 text-sm font-semibold text-pd-bg"
        >
          {T.withdrawMode.ctaProfitOnly}
        </button>
        <button
          type="button"
          data-testid="cta-still-principal"
          data-principal-reachable="true"
          onClick={() => onConfirmPrincipal(makePrincipalConfirmToken())}
          className="rounded-pd-md border border-pd-border px-4 py-3 text-sm text-pd-text"
        >
          {T.withdrawMode.ctaStillPrincipal}
        </button>
      </div>
    </div>
  );
}
