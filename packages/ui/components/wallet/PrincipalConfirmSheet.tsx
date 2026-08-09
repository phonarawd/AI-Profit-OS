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
      className="fixed inset-x-0 bottom-0 z-50 rounded-t-[var(--radius-lg)] border border-[var(--color-lux-border)] bg-[var(--color-lux-surface)] p-6 shadow-lg"
    >
      <h2 className="text-lg font-semibold text-[var(--color-lux-text)]">
        {T.withdrawMode.confirmTitle}
      </h2>
      <p className="mt-2 text-sm text-[var(--color-lux-text-muted)]">
        {T.withdrawMode.confirmBody}
      </p>
      {nearMissCount > 0 ? (
        <p
          className="mt-2 text-sm text-[var(--color-lux-warning)]"
          data-testid="principal-near-miss"
        >
          {nearMissCount}
        </p>
      ) : null}
      <p className="mt-3 text-sm text-[var(--color-lux-text)]">
        {T.withdrawMode.confirmSelfOnly}
      </p>
      <div className="mt-6 flex flex-col gap-2">
        <button
          type="button"
          data-testid="cta-profit-only"
          onClick={onChooseProfitOnly}
          className="rounded-[var(--radius-md)] bg-[var(--color-lux-accent)] px-4 py-3 text-sm font-semibold text-[var(--color-lux-bg)]"
        >
          {T.withdrawMode.ctaProfitOnly}
        </button>
        <button
          type="button"
          data-testid="cta-still-principal"
          data-principal-reachable="true"
          onClick={() => onConfirmPrincipal(makePrincipalConfirmToken())}
          className="rounded-[var(--radius-md)] border border-[var(--color-lux-border)] px-4 py-3 text-sm text-[var(--color-lux-text)]"
        >
          {T.withdrawMode.ctaStillPrincipal}
        </button>
      </div>
    </div>
  );
}
