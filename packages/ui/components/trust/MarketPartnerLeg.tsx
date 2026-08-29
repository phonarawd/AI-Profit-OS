"use client";

import { T } from "../../copy/ko";
import {
  listMarketLogos,
  type MarketLogoEntry,
} from "../../brand/markets";

export type MarketPartnerLegProps = {
  buyPartnerId?: string;
  sellPartnerId?: string;
  buyLabel?: string;
  sellLabel?: string;
  className?: string;
};

function resolvePartner(
  partnerId: string | undefined,
  logos: MarketLogoEntry[],
): MarketLogoEntry | null {
  if (!partnerId) return null;
  return logos.find((l) => l.partnerIds.includes(partnerId)) ?? null;
}

function PartnerMarkOrName({
  partner,
  fallback,
}: {
  partner: MarketLogoEntry | null;
  fallback: string;
}) {
  const label = fallback || partner?.labelKo || "";
  if (!label) return null;

  if (partner?.status === "ready" && partner.path) {
    return (
      <img
        src={`/brand/${partner.path}`}
        alt={label}
        height={20}
        decoding="async"
        className="w-auto max-w-[6rem] object-contain"
        style={{ height: 20, width: "auto" }}
      />
    );
  }

  return (
    <span
      className="text-xs font-semibold text-pd-text"
      data-testid="market-partner-name-fallback"
    >
      {label}
    </span>
  );
}

/**
 * UI §38.10 — buy/sell partner row.
 * Unverified logo marks never render. The partner name remains visible instead.
 */
export function MarketPartnerLeg({
  buyPartnerId,
  sellPartnerId,
  buyLabel = "",
  sellLabel = "",
  className = "",
}: MarketPartnerLegProps) {
  const logos = listMarketLogos();
  const buy = resolvePartner(buyPartnerId, logos);
  const sell = resolvePartner(sellPartnerId, logos);
  const buyName = buyLabel || buy?.labelKo || "";
  const sellName = sellLabel || sell?.labelKo || "";
  const caption = T.trust.partners.legCaption
    .replace("{buyLabel}", buyName)
    .replace("{sellLabel}", sellName);

  if (!buyName && !sellName) {
    return (
      <div
        data-testid="market-partner-leg"
        data-logos-ready="0"
        className={className}
        hidden
      />
    );
  }

  const readyCount = [buy, sell].filter((item) => item?.status === "ready").length;

  return (
    <div
      data-testid="market-partner-leg"
      data-logos-ready={String(readyCount)}
      className={`flex flex-col gap-1 text-sm text-pd-text ${className}`.trim()}
    >
      <div className="flex min-h-5 items-center gap-2">
        <PartnerMarkOrName partner={buy} fallback={buyName} />
        <span aria-hidden>↔</span>
        <PartnerMarkOrName partner={sell} fallback={sellName} />
      </div>
      <p data-testid="market-partner-leg-caption">{caption}</p>
      <p
        className="text-xs text-pd-text-muted"
        data-testid="market-partner-leg-footnote"
      >
        {T.trust.partners.legFootnote}
      </p>
    </div>
  );
}
