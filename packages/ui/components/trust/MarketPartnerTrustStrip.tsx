"use client";

import { T } from "../../copy/ko";
import { listReadyMarketLogos } from "../../brand/markets";

export type MarketPartnerTrustStripProps = {
  /** compact = SiteFooter small logos */
  variant?: "default" | "compact";
  /** Tier-A strip default; edu/wallet may pass B|C */
  tier?: "A" | "B" | "C" | "all";
  className?: string;
};

/**
 * UI §38.10 — PartnerTrustStrip (landing / home / onboarding / footer).
 * Tier-A target ≥4 ready logos; blocked logos never render.
 */
export function MarketPartnerTrustStrip({
  variant = "default",
  tier = "A",
  className = "",
}: MarketPartnerTrustStripProps) {
  const logos = listReadyMarketLogos().filter(
    (l) => tier === "all" || l.tier === tier,
  );
  const height = variant === "compact" ? 20 : 24;
  const headline =
    variant === "compact"
      ? T.trust.partners.footerCompact
      : T.trust.partners.stripHeadline;

  return (
    <aside
      data-testid="market-partner-trust-strip"
      data-variant={variant}
      data-logos-ready={String(logos.length)}
      data-min-tier-a="4"
      className={`flex flex-col gap-2 ${className}`.trim()}
      role="group"
      aria-label={headline}
    >
      <p className="text-sm text-lux-text">{headline}</p>
      {variant === "default" ? (
        <p className="text-xs text-lux-text-muted">{T.trust.partners.stripSub}</p>
      ) : null}
      {logos.length === 0 ? (
        <p
          className="text-xs text-lux-text-muted"
          data-testid="market-partner-logos-blocked"
        >
          {T.trust.partners.legFootnote}
        </p>
      ) : (
        <ul className="flex flex-wrap items-center gap-3" style={{ minHeight: height }}>
          {logos.map((logo) => (
            <li key={logo.id}>
              <img
                src={`/brand/${logo.path}`}
                alt={logo.labelKo}
                height={height}
              />
            </li>
          ))}
        </ul>
      )}
    </aside>
  );
}
