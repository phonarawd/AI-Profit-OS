"use client";

import { T } from "../../copy/ko";
import {
  listMarketLogos,
  type MarketLogoEntry,
} from "../../brand/markets";

const BLURB_BY_ID: Record<string, string> = {
  ebay: T.trust.partners.blurbEbay,
  amazon: T.trust.partners.blurbAmazon,
  "yahoo-jp": T.trust.partners.blurbYahooJp,
  pokemontcg: T.trust.partners.blurbPokemontcg,
  ygoprodeck: T.trust.partners.blurbYgoprodeck,
  coingecko: T.trust.partners.blurbCoingecko,
  frankfurter: T.trust.partners.blurbFrankfurter,
};

function Card({ logo }: { logo: MarketLogoEntry }) {
  const ready = logo.status === "ready";
  return (
    <article
      data-testid="market-partner-grid-card"
      data-partner-logo={logo.id}
      data-status={logo.status}
      className="rounded-lux-md border border-lux-border bg-lux-elevated p-3"
    >
      <div className="flex items-center gap-2" style={{ minHeight: 32 }}>
        {ready ? (
          <img src={`/brand/${logo.path}`} alt="" height={32} />
        ) : (
          <span
            className="text-xs text-lux-text-muted"
            data-testid="market-partner-logo-pending"
          >
            {logo.labelKo}
          </span>
        )}
      </div>
      <h3 className="mt-2 text-sm font-medium text-lux-text">{logo.labelKo}</h3>
      <p className="mt-1 text-xs text-lux-text-muted">
        {BLURB_BY_ID[logo.id] ?? T.trust.partners.legFootnote}
      </p>
    </article>
  );
}

/**
 * UI §38.10 — `/me/guide/partners` Tier A/B/C grid.
 * Cards always list partners; logo mark renders only when status=ready.
 */
export function MarketPartnerGrid({ className = "" }: { className?: string }) {
  const logos = listMarketLogos();
  return (
    <section
      data-testid="market-partner-grid"
      className={className}
      aria-label={T.trust.partners.gridSection}
    >
      <h2 className="text-lg font-semibold text-lux-text">
        {T.trust.partners.guideHeadline}
      </h2>
      <p className="mt-1 text-sm text-lux-text-muted">
        {T.trust.partners.guideSub}
      </p>
      <div className="mt-4 grid grid-cols-2 gap-3">
        {logos.map((logo) => (
          <Card key={logo.id} logo={logo} />
        ))}
      </div>
      <div className="mt-4 flex flex-wrap gap-2 text-xs text-lux-text-muted">
        <span>{T.execution.badgeNoBuy}</span>
        <span>{T.execution.badgeNoSell}</span>
      </div>
    </section>
  );
}
