"use client";

import { T } from "../../copy/ko";
import { listMarketLogos } from "../../brand/markets";

export type MarketPartnerTrustStripProps = {
  /** compact = SiteFooter small logos */
  variant?: "default" | "compact";
  /** Tier-A strip default; edu/wallet may pass B|C */
  tier?: "A" | "B" | "C" | "all";
  className?: string;
};

/**
 * UI §38.10 — PartnerTrustStrip (landing / home / onboarding / footer).
 * Unverified logo marks stay hidden; tracked partner names remain visible.
 */
export function MarketPartnerTrustStrip({
  variant = "default",
  tier = "A",
  className = "",
}: MarketPartnerTrustStripProps) {
  const partners = listMarketLogos().filter(
    (l) => tier === "all" || l.tier === tier,
  );
  const readyCount = partners.filter((logo) => logo.status === "ready").length;
  const height = variant === "compact" ? 20 : 24;
  const headline =
    variant === "compact"
      ? T.trust.partners.footerCompact
      : T.trust.partners.stripHeadline;

  return (
    <aside
      data-testid="market-partner-trust-strip"
      data-variant={variant}
      data-logos-ready={String(readyCount)}
      data-min-tier-a="4"
      className={`flex flex-col gap-2 ${className}`.trim()}
      role="group"
      aria-label={headline}
    >
      <p className="text-sm text-pd-text">{headline}</p>
      {variant === "default" ? (
        <p className="text-xs text-pd-text-muted">{T.trust.partners.stripSub}</p>
      ) : null}
      <ul
        className="flex flex-wrap items-center gap-3"
        style={{ minHeight: height }}
      >
        {partners.map((logo) => (
          <li key={logo.id} className="flex items-center">
            {logo.status === "ready" ? (
              <img
                src={`/brand/${logo.path}`}
                alt={logo.labelKo}
                height={height}
                decoding="async"
                className="w-auto max-w-[7.5rem] object-contain"
                style={{ height, width: "auto" }}
              />
            ) : (
              <span
                className="rounded-full border border-pd-border px-2.5 py-1 text-xs font-medium text-pd-text"
                data-testid="market-partner-name-fallback"
              >
                {logo.labelKo}
              </span>
            )}
          </li>
        ))}
      </ul>
      {readyCount === 0 ? (
        <p
          className="text-xs text-pd-text-muted"
          data-testid="market-partner-logos-blocked"
        >
          {T.trust.partners.legFootnote}
        </p>
      ) : null}
    </aside>
  );
}
