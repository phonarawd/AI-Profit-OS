"use client";

import { T } from "../../copy/ko";
import { Badge } from "../lux/Badge";

export type WhyUsdtCardProps = {
  showSeniorAnalogy?: boolean;
  className?: string;
};

/** UI §38.2 — Why USDT card for deposit / guide / onboarding */
export function WhyUsdtCard({
  showSeniorAnalogy = false,
  className = "",
}: WhyUsdtCardProps) {
  const u = T.trust.usdt;
  return (
    <section
      data-testid="why-usdt-card"
      className={`rounded-lux-md border border-lux-border bg-lux-elevated p-4 ${className}`.trim()}
    >
      <div className="mb-2 flex items-center gap-2">
        <Badge tone="accent">{u.recommendBadge}</Badge>
        <h2 className="text-base font-semibold text-lux-text">{u.headline}</h2>
      </div>
      <ul className="space-y-2 text-sm text-lux-text-muted">
        <li>{u.reason1}</li>
        <li>{u.reason2}</li>
        <li>{u.reason3}</li>
      </ul>
      <p className="mt-3 text-sm text-lux-text-muted">{u.krwNote}</p>
      {showSeniorAnalogy ? (
        <div
          className="mt-3 space-y-1 text-sm text-lux-text"
          data-testid="why-usdt-senior-analogy"
        >
          <p>{u.seniorAnalogy1}</p>
          <p>{u.seniorAnalogy2}</p>
        </div>
      ) : null}
    </section>
  );
}
