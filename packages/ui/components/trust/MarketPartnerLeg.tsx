"use client";

import { T } from "../../copy/ko";
import {
  listReadyMarketLogos,
  type MarketLogoEntry,
} from "../../brand/markets";

export type MarketPartnerLegProps = {
  buyPartnerId?: string;
  sellPartnerId?: string;
  buyLabel?: string;
  sellLabel?: string;
  className?: string;
};

function resolveLogo(
  partnerId: string | undefined,
  logos: MarketLogoEntry[],
): MarketLogoEntry | null {
  if (!partnerId) return null;
  return (
    logos.find((l) => l.partnerIds.includes(partnerId) && l.status === "ready") ??
    null
  );
}

/**
 * UI §38.10 — buy/sell 2-logo row.
 * Renders only Brand markets logos with status=ready.
 * Blocked SVGs = explicit sub-deliverable; never invent marks.
 */
export function MarketPartnerLeg({
  buyPartnerId,
  sellPartnerId,
  buyLabel = "",
  sellLabel = "",
  className = "",
}: MarketPartnerLegProps) {
  const ready = listReadyMarketLogos();
  const buy = resolveLogo(buyPartnerId, ready);
  const sell = resolveLogo(sellPartnerId, ready);
  const caption = T.trust.partners.legCaption
    .replace("{buyLabel}", buyLabel || buy?.labelKo || "")
    .replace("{sellLabel}", sellLabel || sell?.labelKo || "");

  if (!buy && !sell) {
    return (
      <div
        data-testid="market-partner-leg"
        data-logos-ready="0"
        className={className}
        hidden
      />
    );
  }

  return (
    <div
      data-testid="market-partner-leg"
      data-logos-ready={String(ready.length)}
      className={`flex flex-col gap-1 text-sm text-lux-text ${className}`.trim()}
    >
      <div className="flex items-center gap-2" style={{ height: 20 }}>
        {buy?.path ? (
          <img
            src={`/brand/${buy.path}`}
            alt={buy.labelKo}
            height={20}
            decoding="async"
            className="w-auto max-w-[6rem] object-contain"
            style={{ height: 20, width: "auto" }}
          />
        ) : null}
        <span aria-hidden>↔</span>
        {sell?.path ? (
          <img
            src={`/brand/${sell.path}`}
            alt={sell.labelKo}
            height={20}
            decoding="async"
            className="w-auto max-w-[6rem] object-contain"
            style={{ height: 20, width: "auto" }}
          />
        ) : null}
      </div>
      <p data-testid="market-partner-leg-caption">{caption}</p>
      <p
        className="text-xs text-lux-text-muted"
        data-testid="market-partner-leg-footnote"
      >
        {T.trust.partners.legFootnote}
      </p>
    </div>
  );
}
