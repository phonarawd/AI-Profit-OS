"use client";

import { T } from "../../copy/ko";

export type TaxDisclaimerBlockProps = {
  className?: string;
};

/**
 * UI §38.2 / §38.6 — tax disclaimer CI lock.
 * Admin growth?tab=content may display but must not override copy.
 */
export function TaxDisclaimerBlock({ className = "" }: TaxDisclaimerBlockProps) {
  const d = T.trust.disclaimer;
  return (
    <aside
      data-testid="tax-disclaimer-block"
      data-ci-locked="tax-disclaimer"
      data-admin-override="false"
      role="note"
      className={`rounded-pd-md border border-pd-border bg-pd-elevated p-3 text-sm text-pd-text-muted ${className}`.trim()}
    >
      <p className="font-medium text-pd-text">{d.title}</p>
      <ul className="mt-2 list-none space-y-1.5">
        <li data-testid="tax-disclaimer-line1">{d.line1}</li>
        <li data-testid="tax-disclaimer-line2">{d.line2}</li>
        <li data-testid="tax-disclaimer-line3">{d.line3}</li>
        <li data-testid="tax-disclaimer-line4">{d.line4}</li>
      </ul>
    </aside>
  );
}
