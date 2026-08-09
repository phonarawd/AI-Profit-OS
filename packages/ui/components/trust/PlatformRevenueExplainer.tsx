"use client";

import { T } from "../../copy/ko";

export type PlatformRevenueExplainerProps = {
  className?: string;
};

/** UI §38.3 — /me/guide/revenue platform margin transparency */
export function PlatformRevenueExplainer({
  className = "",
}: PlatformRevenueExplainerProps) {
  const r = T.trust.revenue;
  const rows = [
    { q: r.qIncome, a: r.aIncome },
    { q: r.qUser, a: r.aUser },
    { q: r.qDeposit, a: r.aDeposit },
    { q: r.qMargin, a: r.aMargin },
  ];

  return (
    <section
      data-testid="platform-revenue-explainer"
      className={`space-y-4 ${className}`.trim()}
    >
      <header className="space-y-1">
        <h1 className="text-xl font-semibold text-lux-text">{r.headline}</h1>
        <p className="text-sm text-lux-text-muted">{r.body}</p>
      </header>
      <dl className="space-y-3">
        {rows.map((row) => (
          <div
            key={row.q}
            className="rounded-lux-md border border-lux-border bg-lux-elevated p-3"
          >
            <dt className="text-sm font-medium text-lux-text">{row.q}</dt>
            <dd className="mt-1 text-sm text-lux-text-muted">{row.a}</dd>
          </div>
        ))}
      </dl>
      <p
        className="text-xs text-lux-text-muted"
        data-testid="revenue-margin-footnote"
      >
        {r.marginLabel}: {r.opportunityFootnote}
      </p>
    </section>
  );
}
