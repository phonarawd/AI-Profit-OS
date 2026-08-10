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
};

/**
 * §5.3 + §5.3a/b — 홈 기회스캔 · 잔액 인식 섹션 · PartnerTrustStrip
 * [A] LivePayoutTicker = apps/web home page Owns (DayPulse merge 0)
 * 분류 Owns=Engine · 슬롯·카피 Owns=UI
 */
export function BalanceAwareHome({
  items = [],
  affordableCount,
  nearMissExtraCount,
  topSuggestDepositUsdt,
  className = "",
  asSection = false,
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

  const body = (
    <>
      <div className={`space-y-4 p-4 pb-28 ${asSection ? className : ""}`.trim()}>
        <header data-home-slot="scanHero">
          <h1 className="text-xl font-semibold">{T.feed.homeTitle}</h1>
          <p className="mt-1 text-sm text-lux-text-muted">{T.feed.homeScanSub}</p>
        </header>

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
          <h2 className="text-base font-semibold">{T.feed.sectionAffordable}</h2>
          <p className="mt-1 text-sm text-lux-text-muted">
            {T.feed.sectionAffordableCount.replace("{n}", String(nAffordable))}
          </p>
          <ul className="lux-feed-grid mt-3">
            {listAffordable.map((o) => (
              <li key={o.id}>
                <OpportunityCard opportunity={o} />
              </li>
            ))}
          </ul>
          {affordable.length === 0 ? (
            <p className="mt-3 text-sm text-lux-text-muted" role="status">
              {T.user.empty.opportunities}
            </p>
          ) : null}
        </section>

        <section data-home-slot="nearMiss" data-testid="section-near-miss">
          <h2 className="text-base font-semibold">{T.feed.sectionNearMiss}</h2>
          <ul className="mt-3 space-y-3">
            {nearMiss.map((o) => (
              <li key={o.id}>
                <OpportunityCard opportunity={o} />
              </li>
            ))}
          </ul>
        </section>

        <details
          data-home-slot="lockedHigh"
          data-testid="section-locked-high"
          className="rounded-lux-md border border-lux-border p-3"
        >
          <summary className="cursor-pointer text-sm font-medium">
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

      {/* 모바일 sticky · 기회 바인딩 시 §48 Primary와 동일 · PC 전폭 sticky 금지 */}
      {hero ? (
        <div
          data-testid="home-sticky-cta"
          className="fixed inset-x-0 z-40 border-t border-lux-border bg-lux-bg p-3 md:hidden"
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
