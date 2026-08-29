"use client";

import { useMemo, useState } from "react";
import { MotionCTA } from "../../primitives/PrimaryCta";
import { MarketPartnerTrustStrip } from "../trust/MarketPartnerTrustStrip";
import { T } from "../../copy/ko";
import { CategoryFilterChips, type CategoryFilterKey } from "./CategoryFilterChips";
import { OpportunityCard } from "./OpportunityCard";
import type { OpportunityCardModel } from "./opportunity-types";

export type BalanceAwareHomeViewState =
  | "loading"
  | "ready_empty"
  | "ready_data"
  | "stale"
  | "recoverable_error"
  | "blocked"
  | "unauthorized";

export type BalanceAwareHomeSessionStatus =
  | "guest"
  | "authenticated"
  | "expired";

export type BalanceAwareHomeProps = {
  items?: OpportunityCardModel[];
  affordableCount?: number | null;
  nearMissExtraCount?: number | null;
  topSuggestDepositUsdt?: string | null;
  viewState?: BalanceAwareHomeViewState;
  sessionStatus?: BalanceAwareHomeSessionStatus;
  className?: string;
  asSection?: boolean;
  hideScanHero?: boolean;
};

function hasPersonalFacts(
  viewState: BalanceAwareHomeViewState,
  sessionStatus: BalanceAwareHomeSessionStatus,
): boolean {
  if (sessionStatus === "guest" || sessionStatus === "expired") return false;
  if (
    viewState === "unauthorized" ||
    viewState === "loading" ||
    viewState === "recoverable_error" ||
    viewState === "blocked"
  ) {
    return false;
  }
  return true;
}

/**
 * BalanceAwareHome / HomeOpportunity
 * nearMiss = capital short within nearMissCap · not compare/stale/auth collapse
 */
export function BalanceAwareHome({
  items = [],
  affordableCount,
  nearMissExtraCount,
  topSuggestDepositUsdt,
  viewState = "ready_data",
  sessionStatus = "authenticated",
  className = "",
  asSection = false,
  hideScanHero = false,
}: BalanceAwareHomeProps) {
  const [category, setCategory] = useState<CategoryFilterKey>("all");
  const personal = hasPersonalFacts(viewState, sessionStatus);

  const filtered = useMemo(() => {
    if (category === "all") return items;
    return items.filter((i) => i.category === category);
  }, [items, category]);

  const affordable = filtered.filter((i) => i.bucket === "affordable");
  const nearMiss = filtered.filter((i) => i.bucket === "nearMiss");
  const lockedHigh = filtered.filter((i) => i.bucket === "lockedHigh");

  const hero = personal ? affordable[0] ?? null : null;
  const listAffordable = personal ? affordable.slice(hero ? 1 : 0) : [];
  const nAffordable =
    typeof affordableCount === "number" ? affordableCount : affordable.length;
  const nExtra =
    typeof nearMissExtraCount === "number"
      ? nearMissExtraCount
      : nearMiss.length;
  const suggest =
    topSuggestDepositUsdt ?? nearMiss[0]?.suggestDepositUsdt ?? null;

  const peotteok =
    personal && typeof affordableCount === "number"
      ? suggest != null && nExtra > 0
        ? T.feed.peotteokLine
            .replace("{n}", String(nAffordable))
            .replace("{s}", suggest)
            .replace("{m}", String(nExtra))
        : T.feed.peotteokLineCountOnly.replace("{n}", String(nAffordable))
      : null;

  const scanTitle = T.feed.homeTitle;
  const scanSub = T.feed.homeScanSub;

  const empty = personal && affordable.length === 0 && nearMiss.length === 0;
  const showFilters = personal && items.length > 0;

  const emptyCopy =
    viewState === "loading"
      ? { title: T.home.opportunity.loadingStatus, next: null, why: null }
      : viewState === "recoverable_error" || viewState === "blocked"
        ? { title: T.home.opportunity.errorStatus, next: null, why: null }
        : !personal
          ? { title: T.home.opportunity.guestStatus, next: null, why: null }
          : {
              title: T.home.opportunity.emptyStatus,
              next: T.home.opportunity.emptyNext,
              why: T.home.opportunity.emptyWhy,
            };

  const body = (
    <>
      <div
        id="home-opportunity"
        className={`space-y-4 ${asSection ? className : ""}`.trim()}
        aria-label={T.home.opportunity.aria}
        data-personal-facts={personal ? "true" : "false"}
      >
        {!hideScanHero ? (
          <header data-home-slot="scanHero">
            <h1 className="text-xl font-semibold text-pd-text">{scanTitle}</h1>
            <p className="mt-1 text-sm text-pd-text-muted">{scanSub}</p>
          </header>
        ) : (
          <header data-home-slot="scanHero" className="sr-only">
            <h2>{scanTitle}</h2>
            <p>{scanSub}</p>
          </header>
        )}

        <section data-home-slot="affordable" data-testid="section-affordable">
          <h2 className="text-base font-semibold text-pd-text">
            {T.home.opportunity.sectionTitle}
          </h2>
          {personal ? (
            <p className="mt-1 text-sm text-pd-text-muted">
              {T.feed.sectionAffordableCount.replace("{n}", String(nAffordable))}
            </p>
          ) : null}

          {showFilters ? (
            <CategoryFilterChips
              className="mt-3"
              value={category}
              onChange={setCategory}
            />
          ) : null}

          {hero ? (
            <div data-home-slot="hero" data-bucket="affordable" className="mt-3">
              <OpportunityCard opportunity={hero} priority />
            </div>
          ) : null}

          {listAffordable.length > 0 ? (
            <ul className="home-opportunity-grid mt-3">
              {listAffordable.map((o) => (
                <li key={o.id}>
                  <OpportunityCard opportunity={o} />
                </li>
              ))}
            </ul>
          ) : null}

          {empty || !personal ? (
            <div
              className="mt-4 space-y-3 rounded-pd-xl border border-pd-border bg-pd-surface p-5 home-money-card"
              role="status"
              data-testid="home-opportunity-empty"
              data-empty-kind={!personal ? "guest-or-absent" : "ready-empty"}
            >
              <p className="text-base font-semibold text-pd-text">
                {emptyCopy.title}
              </p>
              {emptyCopy.next ? (
                <p className="text-sm text-pd-text-muted">{emptyCopy.next}</p>
              ) : null}
              {emptyCopy.why ? (
                <p className="text-sm text-pd-text-muted">{emptyCopy.why}</p>
              ) : null}
              {personal ? (
                <div className="pt-1">
                  <a
                    href="/wallet/deposit"
                    data-testid="home-empty-cta-deposit"
                    className="inline-flex min-h-12 w-full items-center justify-center rounded-pd-md bg-pd-accent px-4 py-2 text-sm font-semibold text-pd-surface sm:w-auto"
                  >
                    {T.home.opportunity.emptyCtaDeposit}
                  </a>
                </div>
              ) : null}
            </div>
          ) : null}
        </section>

        {personal && nearMiss.length > 0 ? (
          <section data-home-slot="nearMiss" data-testid="section-near-miss">
            <h2 className="text-base font-semibold text-pd-text">
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
          className="rounded-pd-xl border border-pd-border bg-pd-surface p-4 shadow-[var(--shadow-pd-soft)]"
        >
          <summary className="cursor-pointer text-sm font-medium text-pd-text">
            {T.feed.sectionLockedHigh}
            {personal && lockedHigh[0] ? (
              <span className="ml-2 text-pd-text-muted">
                · {lockedHigh[0].assetLabel}
              </span>
            ) : null}
          </summary>
          {personal ? (
            <ul className="mt-3 space-y-3">
              {lockedHigh.map((o) => (
                <li key={o.id}>
                  <OpportunityCard opportunity={o} />
                </li>
              ))}
            </ul>
          ) : null}
        </details>

        <div data-home-slot="partnerTrust" className="pt-2">
          <MarketPartnerTrustStrip tier="A" />
        </div>

        {peotteok ? (
          <p
            data-home-slot="peotteok"
            data-testid="peotteok-balance-line"
            className="text-sm text-pd-text"
          >
            {peotteok}
          </p>
        ) : (
          <p
            data-home-slot="peotteok"
            data-testid="peotteok-balance-line"
            className="hidden"
          />
        )}
      </div>

      {hero ? (
        <div
          data-testid="home-sticky-cta"
          className="fixed inset-x-0 z-40 border-t border-pd-border bg-pd-surface p-3 md:hidden"
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
      className={`text-pd-text ${className}`.trim()}
    >
      {body}
    </main>
  );
}

export const HomeOpportunity = BalanceAwareHome;
export type HomeOpportunityProps = BalanceAwareHomeProps;
