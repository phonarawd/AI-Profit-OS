"use client";

import { useMemo, useState } from "react";
import { MotionCTA } from "../lux/MotionCTA";
import { MarketPartnerTrustStrip } from "../trust/MarketPartnerTrustStrip";
import { T } from "../../copy/ko";
import { CategoryFilterChips, type CategoryFilterKey } from "./CategoryFilterChips";
import { OpportunityCard } from "./OpportunityCard";
import type { OpportunityCardModel } from "./opportunity-types";

export type BalanceAwareHomeProps = {
  items?: OpportunityCardModel[];
  /** principal Fact 요약 (Engine classify 결과) */
  affordableCount?: number;
  nearMissExtraCount?: number;
  topSuggestDepositUsdt?: string | null;
  className?: string;
  /** true면 outer `<main>` 없이 섹션만 (홈 page가 ticker+main 소유) */
  asSection?: boolean;
  /**
   * HomeHero가 title을 담당할 때 구 scanHero 헤더 숨김
   * (소스에 T.feed.homeTitle / homeScanSub 유지 · PART9 verify)
   */
  hideScanHero?: boolean;
};

/**
 * BalanceAwareHome / HomeOpportunity — peotteok-light presentation
 * Data model · nearMissExtraCount · OpportunityCard 유지 · 구 Lux Dark layout 폐기
 */
export function BalanceAwareHome({
  items = [],
  affordableCount,
  nearMissExtraCount,
  topSuggestDepositUsdt,
  className = "",
  asSection = false,
  hideScanHero = false,
}: BalanceAwareHomeProps) {
  const [category, setCategory] = useState<CategoryFilterKey>("all");

  const filtered = useMemo(() => {
    if (category === "all") return items;
    return items.filter((i) => i.category === category);
  }, [items, category]);

  const affordable = filtered.filter(
    (i) => !i.bucket || i.bucket === "affordable",
  );
  const nearMiss = filtered.filter((i) => i.bucket === "nearMiss");
  const lockedHigh = filtered.filter((i) => i.bucket === "lockedHigh");

  const hero = affordable[0] ?? null;
  const listAffordable = affordable.slice(hero ? 1 : 0);
  const nAffordable = affordableCount ?? affordable.length;
  const nExtra = nearMissExtraCount ?? nearMiss.length;
  const suggest = topSuggestDepositUsdt ?? nearMiss[0]?.suggestDepositUsdt ?? null;

  const peotteok = T.feed.peotteokLine
    .replace("{n}", String(nAffordable))
    .replace("{s}", suggest || "0")
    .replace("{m}", String(nExtra));

  const scanTitle = T.feed.homeTitle;
  const scanSub = T.feed.homeScanSub;

  const empty = affordable.length === 0 && nearMiss.length === 0;

  const body = (
    <>
      <div
        id="home-opportunity"
        className={`space-y-4 ${asSection ? className : ""}`.trim()}
        aria-label={T.home.opportunity.aria}
      >
        {!hideScanHero ? (
          <header data-home-slot="scanHero">
            <h1 className="text-xl font-semibold text-lux-text">{scanTitle}</h1>
            <p className="mt-1 text-sm text-lux-text-muted">{scanSub}</p>
          </header>
        ) : (
          <header data-home-slot="scanHero" className="sr-only">
            <h2>{scanTitle}</h2>
            <p>{scanSub}</p>
          </header>
        )}

        <div data-home-slot="partnerTrust">
          <MarketPartnerTrustStrip tier="A" />
        </div>

        <CategoryFilterChips value={category} onChange={setCategory} />

        {hero ? (
          <section data-home-slot="hero" data-bucket="affordable">
            <OpportunityCard opportunity={hero} priority />
          </section>
        ) : null}

        <section data-home-slot="affordable" data-testid="section-affordable">
          <h2 className="text-base font-semibold text-lux-text">
            {T.home.opportunity.sectionTitle}
          </h2>
          <p className="mt-1 text-sm text-lux-text-muted">
            {T.feed.sectionAffordableCount.replace("{n}", String(nAffordable))}
          </p>
          <ul className="home-opportunity-grid mt-3">
            {listAffordable.map((o) => (
              <li key={o.id}>
                <OpportunityCard opportunity={o} />
              </li>
            ))}
          </ul>
          {empty ? (
            <div
              className="mt-4 space-y-3 rounded-lux-xl border border-lux-border bg-lux-surface p-5 home-money-card"
              role="status"
              data-testid="home-opportunity-empty"
            >
              <p className="text-base font-semibold text-lux-text">
                {T.home.opportunity.emptyStatus}
              </p>
              <p className="text-sm text-lux-text-muted">
                {T.home.opportunity.emptyNext}
              </p>
              <p className="text-sm text-lux-text-muted">
                {T.home.opportunity.emptyWhy}
              </p>
              <div className="flex flex-wrap gap-2 pt-1">
                <a
                  href="/wallet/deposit"
                  data-testid="home-empty-cta-deposit"
                  className="inline-flex min-h-12 items-center justify-center rounded-lux-md bg-lux-accent px-4 py-2 text-sm font-semibold text-lux-surface"
                >
                  {T.home.opportunity.emptyCtaDeposit}
                </a>
                <a
                  href="#home-opportunity"
                  data-testid="home-empty-cta-browse"
                  className="inline-flex min-h-12 items-center justify-center rounded-lux-md border border-lux-border px-4 py-2 text-sm font-semibold text-lux-text"
                >
                  {T.home.opportunity.emptyCtaBrowse}
                </a>
              </div>
            </div>
          ) : null}
        </section>

        {nearMiss.length > 0 ? (
          <section data-home-slot="nearMiss" data-testid="section-near-miss">
            <h2 className="text-base font-semibold text-lux-text">
              {T.feed.sectionNearMiss}
            </h2>
            <ul className="mt-3 space-y-3">
              {nearMiss.map((o) => (
                <li key={o.id}>
                  <OpportunityCard opportunity={o} />
                </li>
              ))}
            </ul>
          </section>
        ) : (
          <section data-home-slot="nearMiss" data-testid="section-near-miss" className="hidden" />
        )}

        <details
          data-home-slot="lockedHigh"
          data-testid="section-locked-high"
          className="rounded-lux-xl border border-lux-border bg-lux-surface p-4 shadow-[var(--shadow-lux-soft)]"
        >
          <summary className="cursor-pointer text-sm font-medium text-lux-text">
            {T.feed.sectionLockedHigh}
            {lockedHigh[0] ? (
              <span className="ml-2 text-lux-text-muted">
                · {lockedHigh[0].assetLabel}
              </span>
            ) : null}
          </summary>
          <ul className="mt-3 space-y-3">
            {lockedHigh.map((o) => (
              <li key={o.id}>
                <OpportunityCard opportunity={o} />
              </li>
            ))}
          </ul>
        </details>

        <p
          data-home-slot="peotteok"
          data-testid="peotteok-balance-line"
          className="text-sm text-lux-text"
        >
          {peotteok}
        </p>
      </div>

      {hero ? (
        <div
          data-testid="home-sticky-cta"
          className="fixed inset-x-0 z-40 border-t border-lux-border bg-lux-surface p-3 md:hidden"
          style={{ bottom: "calc(3.5rem + env(safe-area-inset-bottom, 0px))" }}
        >
          <MotionCTA
            className="w-full"
            data-cta="sticky"
            data-action="participate"
            label={T.execution.ctaStickyShort}
            onClick={() => {
              window.location.href = `/profits/${hero.id}`;
            }}
          />
        </div>
      ) : null}
    </>
  );

  if (asSection) {
    return (
      <div data-testid="balance-aware-home" data-canon="opportunity-card">
        {body}
      </div>
    );
  }

  return (
    <main
      data-testid="balance-aware-home"
      data-canon="opportunity-card"
      className={`text-lux-text ${className}`.trim()}
    >
      {body}
    </main>
  );
}

/** Peotteok Home Experience 이름 */
export const HomeOpportunity = BalanceAwareHome;
export type HomeOpportunityProps = BalanceAwareHomeProps;
